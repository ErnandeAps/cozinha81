# Plano de Validação Funcional — Cozinha81 (Épicos 1–5)

> Documento de QA para execução por **agente com MCP DevTools** (automação de browser + chamadas HTTP).
> Cobre toda a funcionalidade implementada até o Épico 5. Cada feature tem especificação própria.
> **Nada aqui deve ser corrigido** — o objetivo é validar e registrar divergências entre intenção e implementação.

---

## 0.0 Setup / Presets (EXECUTAR ANTES DE TUDO)

> Estes presets deixam o ambiente pronto. Só comece os testes (Fase 0+) quando o **gate de verificação** (§0.0.4) passar. Trabalhe na raiz `cozinha81-core`.

### 0.0.1 Pré-requisitos
| Item | Requisito | Por quê |
|---|---|---|
| Node | 22.x | workspace Nx 22 |
| Nx | 22 | targets `migrate`, `seed-staff`, `serve` |
| Deps | `npm install` | ts-node, pg, nest, angular |
| **PostgreSQL** | **versão 18** (obrigatório) | migrations usam `uuidv7()` nativo — **PG < 18 falha em 100% das migrations** |
| Docker | opcional | **não há docker-compose nem `.env`** — a infra é manual |

### 0.0.2 Banco — DB + dois papéis (crítico para RLS)
```sql
CREATE DATABASE cozinha81;
-- Papel RUNTIME do app: NÃO superusuário e NÃO bypassrls — senão a RLS não vale
-- e os testes de isolamento multi-tenant ficam INVÁLIDOS (passam falsamente).
CREATE ROLE cozinha_app LOGIN PASSWORD 'app_pwd' NOSUPERUSER NOBYPASSRLS;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cozinha_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cozinha_app;
```
> ⚠️ **Preset mais importante:** o **backend em runtime deve conectar como `cozinha_app`** (não-superusuário). Rodar como superuser invalida o teste de isolamento por tenant (Fase 2, passo 12). As **migrations** rodam com papel **admin/owner**.

### 0.0.3 Variáveis de ambiente (por processo)
`buildPoolConfig` dá **precedência ao `DATABASE_URL`** sobre `PG*`. Separe por processo:

| Processo | Variáveis |
|---|---|
| `migrate` + `seed-staff` | `DATABASE_URL=postgres://admin:***@localhost:5432/cozinha81` (papel **admin**) |
| `seed-staff` (extra) | `STAFF_BOOTSTRAP_EMAIL=ops@cozinha81`, `STAFF_BOOTSTRAP_SENHA=SenhaForte!23`, `STAFF_BOOTSTRAP_NOME?` |
| `backend serve` (runtime) | `PGHOST=localhost PGPORT=5432 PGUSER=cozinha_app PGPASSWORD=app_pwd PGDATABASE=cozinha81` (**sem** `DATABASE_URL`) |
| `backend serve` (opcional) | `PORT=3000` · `CORS_ORIGIN` (default libera tudo) · **não** usar `NODE_ENV=production` (esconde `details` dos erros e atrapalha o QA) |

### 0.0.4 Sequência de comandos
```bash
npm install

# 1) schema (papel admin)
DATABASE_URL=postgres://admin:***@localhost:5432/cozinha81 npx nx run backend:migrate

# 2) primeiro staff (bootstrap da plataforma)
DATABASE_URL=postgres://admin:***@localhost:5432/cozinha81 \
STAFF_BOOTSTRAP_EMAIL=ops@cozinha81 STAFF_BOOTSTRAP_SENHA='SenhaForte!23' \
  npx nx run backend:seed-staff

# 3) backend runtime (papel cozinha_app — RLS ativa)
PGHOST=localhost PGPORT=5432 PGUSER=cozinha_app PGPASSWORD=app_pwd PGDATABASE=cozinha81 \
  npx nx serve backend      # → http://localhost:3000/api

# 4) portal (outro processo)
npx nx serve portal         # → http://localhost:4200
```

### 0.0.5 Gate de verificação (não prossiga sem os 4)
1. `GET http://localhost:3000/health` → **200**.
2. `http://localhost:3000/api/docs` (Swagger) abre.
3. `http://localhost:4200/login` renderiza.
4. `POST http://localhost:3000/api/backoffice/auth/login` `{email:'ops@cozinha81', senha:'SenhaForte!23'}` → **200 + accessToken** (`scope=platform`). Prova migrate + seed + papel runtime OK.

### 0.0.6 Gotchas
- **PG 18 ou nada** (`uuidv7()`).
- **Runtime ≠ admin**: não setar `DATABASE_URL` no processo do `serve` (ele deve usar `PG*` como `cozinha_app`).
- **KDS e Backoffice não têm UI** — validar só por HTTP.
- Token do portal em `localStorage['c81_portal_token']`; API base `http://localhost:3000/api`; seletores `data-test` no **Apêndice A**.
- `migrate`/`seed-staff` usam `ts-node` (sem build prévio); `serve` builda o backend.

---

## 0. Contexto técnico de execução (LEIA PRIMEIRO)

### 0.1 Topologia
| Camada | Stack | Como subir | URL | Estado |
|---|---|---|---|---|
| Backend | NestJS + PostgreSQL 18 | `npx nx serve backend` | `http://localhost:3000` | ✅ funcional |
| Portal (Inquilino) | Angular 20 standalone | `npx nx serve portal` | `http://localhost:4200` (default) | ✅ funcional |
| KDS | Angular 20 | `npx nx serve kds` | — | ⚠️ **shell vazio** (`appRoutes = []`) |
| Backoffice | Angular 20 | `npx nx serve backoffice` | — | ⚠️ **shell vazio** (`appRoutes = []`) |
| Banco | PostgreSQL 18 (uuidv7 nativo) | container/local | `:5432` | migrations em `backend/src/core/database/migrations` |

### 0.2 Fatos que mudam a estratégia de teste
1. **Prefixo global `/api`** em todas as rotas, EXCETO `health` e `error-test`. Ex.: login do portal = `POST http://localhost:3000/api/portal/auth/login`.
2. **Não há `ValidationPipe` global** (DTOs são `interface`, não `class-validator`). ⇒ O framework **não** rejeita campos extras nem coage tipos; toda validação é **manual dentro dos services**. Teste de payloads malformados deve mirar as validações manuais, não erros 400 automáticos.
3. **Formato único de erro** (GlobalExceptionFilter): `{ "code": string, "message": string, "details": any|null }`. Fora de produção, erros não-HTTP vazam stack em `details`.
4. **Apenas o Portal tem UI.** Backoffice e KDS são apps vazios. Tudo do Épico 1 fora do login do portal (provisionamento, flags de módulo, login de plataforma, convites) **só pode ser testado por HTTP/API**, não por interface.
5. **Sessão do portal**: JWT em `localStorage` na chave `c81_portal_token`. O papel (`dono_admin`/`operador`) é decodificado do JWT no cliente; privacidade de custo é aplicada **server-side**.
6. **Swagger** disponível em `http://localhost:3000/api/docs` (mas o OpenAPI gerado está desatualizado — ver §10).

### 0.3 ✅ BOOTSTRAP (resolvido — fluxo oficial de primeiro acesso)
> O bloqueador original (sem caminho para a 1ª credencial) **foi resolvido** em código. O bootstrap agora é determinístico, sem `UPDATE` manual no banco:

**1) Primeiro staff de plataforma** — comando de seed idempotente (lê env, `ON CONFLICT DO NOTHING`):
```bash
STAFF_BOOTSTRAP_EMAIL=ops@cozinha81 STAFF_BOOTSTRAP_SENHA='SenhaForte!23' \
  npx nx run backend:seed-staff
```
Arquivo: `backend/src/core/database/seed-staff.ts` · target `seed-staff`.

**2) Primeiro acesso do Dono/Admin do tenant** — o **provisionamento agora emite um convite** para o Dono e o retorna em `conviteDono.token`. O Dono define a senha (mesmo fluxo dos demais usuários), via:
- **UI**: `GET http://localhost:4200/aceitar-convite?token=<conviteDono.token>` → define senha → login.
- **API**: `POST /api/portal/usuarios/convites/aceitar { token, senha }`.

**Fluxo de bootstrap ponta-a-ponta:**
```
seed-staff → login staff → POST /backoffice/inquilinos (retorna conviteDono.token)
           → /aceitar-convite?token=... (define senha do Dono) → login Dono no portal
```
Convidar Operador segue o mesmo padrão (Dono autenticado → POST convites → aceitar).

> Não é mais necessário tocar no banco para subir o sistema do zero. Ver D1/D2 (§10) — reclassificados como resolvidos.

### 0.4 Usuários de teste recomendados (semear)
| Apelido | Realm | Papel | Necessário para |
|---|---|---|---|
| `staff@c81` | plataforma | staff | provisionar tenants, ligar/desligar módulos |
| `dono@tenantA` | tenant A | dono_admin | tudo do portal |
| `op@tenantA` | tenant A | operador | testes de RBAC / redação de custo |
| `dono@tenantB` | tenant B | dono_admin | testes de isolamento multi-tenant |

### 0.5 Convenção de seletores
Os componentes expõem atributos `data-test`. Prefira-os a XPaths frágeis. A lista completa por tela está em cada seção e consolidada no **Apêndice A**.

---

# MÓDULO 1 — Plataforma / Backoffice (somente API)

> Épico 1 (Stories 1.3, 1.6). **Sem UI** — validar 100% por HTTP.

## F1.1 — Login de plataforma (staff)

**1. Identificação**
- Módulo: Backoffice / Auth
- Épico: 1.3
- Arquivos: `backend/src/modules/backoffice/auth/platform-auth.controller.ts`, `platform-auth.service.ts`, `login.dto.ts`
- Rota: `POST /api/backoffice/auth/login` (HTTP 200)
- Banco: tabela `staff` (não tenant-scoped, sem RLS)

**2. Objetivo** — Autenticar staff Cozinha81 e emitir JWT `scope=platform` (sem `tenantId`). Sem signup público.

**3. Fluxo funcional**
1. Cliente envia `{ email, senha }`.
2. Service busca `staff` por email; compara bcrypt (com hash dummy para igualar timing).
3. Sucesso ⇒ `{ accessToken, ... }` com `scope=platform`.

**4. Estados** — sucesso (200) · credenciais inválidas (401, mensagem neutra) · body incompleto (400).

**5. Regras de negócio**
- `email` e `senha` obrigatórios (400 `email e senha são obrigatórios.`).
- Mensagem de erro neutra (anti-enumeração): nunca revela se email existe.
- Timing equalizado com `DUMMY_BCRYPT_HASH`.

**6. Casos de teste**
- ✅ T1.1.1 Login válido (staff semeado) → 200 + `accessToken` decodificável com `scope=platform`.
- ❌ T1.1.2 Senha errada → 401 `Credenciais inválidas.`
- ❌ T1.1.3 Email inexistente → 401 (mesma mensagem de T1.1.2; comparar textos).
- ❌ T1.1.4 Body sem `senha` → 400.
- 🔐 T1.1.5 Anti-enumeração: medir/observar que a resposta de email inexistente e senha errada é idêntica.

**7. Validável por UI** — N/A (sem UI). Apenas via HTTP.
**8. Fora da UI** — comparação de timing (anti-enumeração) é indireta; hash bcrypt no banco.
**9. Dependências** — `staff` semeado.
**10. Riscos** — sem rate-limiting visível ⇒ brute force; timing nem sempre estável em ambiente compartilhado.

---

## F1.2 — Provisionamento de Inquilino

**1. Identificação**
- Módulo: Backoffice / Provisioning
- Épico: 1.3
- Arquivos: `provisioning.controller.ts`, `provisioning.service.ts`, `provisioning.dto.ts`
- Rota: `POST /api/backoffice/inquilinos` — guards `AuthGuard('jwt')` + `PlatformScopeGuard`
- Banco: `inquilino`, `usuario` (dono pendente), `modulo_flag` (1 linha por módulo), `provisionamento_audit` — tudo em **uma transação atômica** no tenant alvo

**2. Objetivo** — Equipe Cozinha81 cria um novo Inquilino com Dono/Admin inicial + flags de módulo + trilha de auditoria. Única escrita cross-tenant do sistema.

**3. Fluxo funcional**
1. Staff autenticado envia `{ nome, dono:{email,nome}, modulos:[...] }`.
2. Service gera `uuidv7()` do tenant via `rawPool`.
3. Numa transação `withTenant(tenantId)`: insere inquilino (id==tenant_id), dono (`pendente`), uma `modulo_flag` por módulo conhecido (habilitada se contratada), e audit.
4. Retorna `{ tenantId, nome, dono{...,status:'pendente'}, modulos[] }`.

**4. Estados** — sucesso (201) · não autenticado (401) · token de Inquilino (403 `PlatformScopeGuard`) · validação (400) · módulo inválido (400).

**5. Regras de negócio**
- `nome` obrigatório; `dono.email` e `dono.nome` obrigatórios.
- `modulos` só aceita valores de `MODULOS` = `['gestao_cozinha','pedidos_kds']`; inválidos → 400 listando-os.
- Sempre cria **uma linha por módulo conhecido** (habilitado=false para os não contratados).
- Dono criado com `status='pendente'`, `senha_hash=NULL`.
- Atomicidade: falha em qualquer passo desfaz tudo.
- Auditoria registra `staff_id`, `detalhes` (módulos + email do dono).

**6. Casos de teste**
- ✅ T1.2.1 Provisionar com `modulos:['gestao_cozinha']` → 201; conferir retorno e (via DB) 2 linhas em `modulo_flag` (cozinha habilitada, kds não).
- ✅ T1.2.2 Provisionar com ambos os módulos.
- ❌ T1.2.3 Sem `nome` → 400.
- ❌ T1.2.4 `modulos:['xpto']` → 400 `Módulo(s) inválido(s): xpto.`
- 🔐 T1.2.5 Token de Inquilino (Dono/Admin) → 403.
- 🔐 T1.2.6 Sem token → 401.
- ⚠️ T1.2.7 Edge: `modulos:[]` → cria tenant com ambos módulos desabilitados (válido). Confirmar comportamento.
- ⚠️ T1.2.8 Email de dono duplicado entre 2 provisionamentos no mesmo tenant não ocorre (tenant novo a cada vez); mas observar que **não há de-dup de email entre tenants** (esperado por design).

**7. Validável por UI** — N/A.
**8. Fora da UI** — atomicidade, linhas de `modulo_flag`, `provisionamento_audit` (exigem DB).
**9. Dependências** — staff autenticado (F1.1).
**10. Riscos** — sem idempotência: reenvio cria tenant duplicado; sem validação de formato de email; geração de tenant id fora da transação (`rawPool`) — se a transação falhar, o uuid é descartado (ok), mas vale observar.

---

## F1.3 — Flags de Módulo por Inquilino

**1. Identificação**
- Módulo: Backoffice / Módulos
- Épico: 1.6
- Arquivos: `modulo-flag.controller.ts`, `modulo-flag.service.ts`
- Rotas: `GET /api/backoffice/inquilinos/:tenantId/modulos` · `PATCH /api/backoffice/inquilinos/:tenantId/modulos/:modulo` — guards plataforma
- Banco: `modulo_flag`

**2. Objetivo** — Staff liga/desliga módulos de um tenant (fonte do gating server-side).

**3. Fluxo funcional** — Staff lista flags ou faz `PATCH {habilitado:boolean}` para um módulo.

**4. Estados** — sucesso · 403 (token de inquilino) · módulo inválido.

**5. Regras de negócio**
- `habilitado` coagido por `body?.habilitado === true` (qualquer coisa ≠ `true` vira `false`).
- Verificar se módulo inválido é validado (ler `modulo-flag.service.ts` — testar `PATCH .../modulos/xpto`).

**6. Casos de teste**
- ✅ T1.3.1 GET flags de um tenant provisionado.
- ✅ T1.3.2 PATCH `gestao_cozinha {habilitado:false}` → depois GET confirma desligado.
- 🔁 T1.3.3 **Regressão de gating**: desligar `gestao_cozinha` e tentar `GET /api/portal/insumos` com Dono/Admin do tenant → 403 `MODULO_NAO_HABILITADO` (liga F1.6).
- 🔐 T1.3.4 Token de inquilino → 403.
- ⚠️ T1.3.5 `habilitado:"true"` (string) → vira `false` (coerção estrita). Registrar.

**7. Validável por UI** — N/A.
**8. Fora da UI** — efeito do flag só observável atravessando o gating do portal.
**9. Dependências** — F1.1, F1.2.
**10. Riscos** — PATCH em módulo inexistente; PATCH em tenant inexistente (criar flag órfã?). Verificar.

---

# MÓDULO 2 — Identidade & Acesso do Inquilino

## F2.1 — Login do Portal (Inquilino) — **tem UI**

**1. Identificação**
- Módulo: Auth (core)
- Épico: 1.4
- Arquivos backend: `core/auth/inquilino-auth.controller.ts`, `inquilino-auth.service.ts`, `jwt.strategy.ts`
- Arquivos frontend: `apps/portal/src/app/login/login.component.ts`, `core/auth.service.ts`, `core/auth.guard.ts`, `core/auth.interceptor.ts`
- Rota API: `POST /api/portal/auth/login` (200) · Rota UI: `/login`
- Banco: `usuario` (leitura cross-tenant controlada via `scope=platform`)

**2. Objetivo** — Autenticar usuário de Inquilino e emitir JWT `(tenantId, papel)`. Busca por email é cross-tenant (email não é único entre tenants); seleciona candidato estável (mais antigo) que case senha + `status='ativo'` + `senha_hash` presente.

**3. Fluxo funcional (UI)**
1. Acessa `/login`.
2. Preenche `data-test=email`, `data-test=senha`.
3. Clica `data-test=entrar` (mostra "Entrando…" enquanto `carregando`).
4. Sucesso ⇒ token salvo em `localStorage[c81_portal_token]` ⇒ navega `/inicio`.
5. Erro ⇒ `data-test=erro` "Credenciais inválidas."

**4. Estados da interface** — vazio (campos em branco) · carregando (botão "Entrando…", desabilitado) · sucesso (redirect /inicio) · erro (alerta vermelho) · re-submit bloqueado durante `carregando`.

**5. Regras de negócio**
- `email`/`senha` obrigatórios (validação no controller, 400).
- Front faz `email.trim()`.
- Apenas `status='ativo'` com `senha_hash` loga.
- Mensagem neutra em qualquer falha.
- `authGuard` bloqueia rotas autenticadas sem sessão → redireciona `/login`.
- Interceptor anexa `Authorization: Bearer` só em URLs que começam com `API_BASE`.

**6. Casos de teste**
- ✅ T2.1.1 Login válido (Dono/Admin ativo semeado) → redirect `/inicio`, sidebar visível, `data-test=papel` = "DONO/ADMIN".
- ✅ T2.1.2 Login válido como Operador → `data-test=papel` = "OPERADOR", menu **sem** `data-test=nav-cmv`.
- ❌ T2.1.3 Senha errada → `data-test=erro` visível; sem redirect.
- ❌ T2.1.4 Usuário `pendente` (sem senha) → 401 / erro.
- 🔐 T2.1.5 Acessar `/estoque` direto sem sessão → redireciona `/login` (authGuard).
- 🔁 T2.1.6 Após login, recarregar a página mantém sessão (token em localStorage; `decode` reconstrói principal).
- ⚠️ T2.1.7 Logout (`data-test=sair`) limpa token e volta a `/login`.
- ⚠️ T2.1.8 Token corrompido em localStorage → `decode` retorna null → tratado como deslogado.

**7. Validável por UI** — campos, máscara de senha (type=password), estado de loading, mensagem de erro, redirect, persistência de sessão, presença/ausência condicional do menu CMV, rótulo de papel, botão Sair.
**8. Fora da UI** — assinatura/expiração do JWT, seleção cross-tenant determinística, timing anti-enumeração.
**9. Dependências** — usuário ativo semeado (ver §0.3).
**10. Riscos** — sem refresh token / expiração tratada na UI (token expirado só falha na próxima request); `decode` confia no payload sem verificar assinatura (esperado no cliente).

---

## F2.2 — Convite e Aceite de Usuário (somente API)

**1. Identificação**
- Módulo: Identidade
- Épico: 1.5
- Arquivos: `modules/identidade/convite.controller.ts`, `convite.service.ts`, `convite.dto.ts`, `core/auth/invite-token.ts`
- Rotas: `POST /api/portal/usuarios/convites` (Dono/Admin) · `POST /api/portal/usuarios/convites/aceitar` (200, público)
- Banco: `usuario`, `convite` (guarda só `token_hash`)
- ⚠️ **Convidar**: só API (sem tela). **Aceitar**: tem tela `/aceitar-convite?token=...` (criada no bootstrap).
- O **provisionamento** (F1.2) emite um convite para o Dono — é o caminho de primeiro acesso.

**2. Objetivo** — Dono/Admin convida membro → cria `usuario` pendente + token de uso único (TTL 7 dias). Aceite público define senha e ativa, sempre no tenant do convite.

**3. Fluxo funcional**
1. `POST convites {email,nome,papel}` (autenticado dono_admin) → retorna `{conviteId, token (cru, uma vez), expiraEm, usuario}`.
2. `POST convites/aceitar {token, senha}` → valida hash/uso/expiração; marca `usado_em` atomicamente; ativa usuário.

**5. Regras de negócio**
- `email`/`nome` obrigatórios; `papel ∈ {dono_admin, operador}`.
- Email duplicado no tenant → 409 (`23505`).
- TTL = `CONVITE_TTL_DIAS = 7` dias.
- Aceite: token inválido/usado/expirado → 400 com mensagem específica.
- Uso único à prova de corrida (`UPDATE ... WHERE usado_em IS NULL AND expira_em > now()`, checa `rowCount`).
- Token cru nunca persistido (só `sha256`).

**6. Casos de teste**
- ✅ T2.2.1 Convidar operador (Dono/Admin) → 201/200 com `token`.
- ✅ T2.2.2 Aceitar com o token → usuário vira `ativo`; depois login (F2.1) funciona.
- ✅ T2.2.2b **Bootstrap do Dono (UI)**: abrir `/aceitar-convite?token=<conviteDono.token do provisionamento>`, definir senha (`data-test=definir`) → `data-test=sucesso` → "Ir para o login" → login do Dono funciona.
- ❌ T2.2.2c `/aceitar-convite` **sem** token na URL → `data-test=sem-token` visível; sem form.
- ⚠️ T2.2.2d Senha < 8 chars ou confirmação divergente → `data-test=erro` (validação no front, não chama API).
- ❌ T2.2.3 Convidar com `papel:'staff'` → 400 `papel inválido.`
- ❌ T2.2.4 Convidar email já existente no tenant → 409.
- ❌ T2.2.5 Aceitar token inexistente → 400 `Convite inválido.`
- 🔁 T2.2.6 Aceitar duas vezes o mesmo token → 2ª vez 400 `Convite já utilizado.`
- 🔐 T2.2.7 Convidar sem ser Dono/Admin (operador) → 403.
- ⚠️ T2.2.8 Race: dois aceites concorrentes do mesmo token → apenas um ativa (validar via 2 requests simultâneos).
- ⚠️ T2.2.9 Expiração: convite vencido (manipular `expira_em` no DB) → 400 `Convite expirado.`

**7. Validável por UI** — **nada** (não há tela). 100% HTTP.
**8. Fora da UI** — atomicidade do uso único; `token_hash` no banco; expiração.
**9. Dependências** — Dono/Admin autenticado.
**10. Riscos** — sem envio de email (token retornado no corpo da resposta — em produção isso vazaria o link); ausência total de UI torna a feature inacessível ao usuário final ⇒ **GAP**.

---

## F2.3 — RBAC por Papel (transversal)

**1. Identificação** — `core/auth/roles.guard.ts`, `papeis.decorator.ts`; aplicado nos controllers do módulo Gestão de Cozinha.
**2. Objetivo** — Negar server-side operações fora do papel (`@Papeis(...)`), independentemente da UI.
**5. Regras de negócio (mapa de autorização real no código)**

| Endpoint | dono_admin | operador |
|---|---|---|
| `GET portal/insumos`, `GET :id`, `GET :id/precos`, `GET :id/converter`, `GET alertas/ativos` | ✅ | ✅ |
| `POST/PUT/DELETE portal/insumos`, `POST entradas`, `POST :id/perdas` | ✅ | ❌ 403 |
| `GET/POST portal/fichas`, `GET :id`, `POST :id/itens`, `DELETE :id` | ✅ (criar/editar/remover só dono) · `GET` ambos | `GET` ✅ / mutações ❌ |
| `GET portal/fichas/:id/custo` | ✅ | ❌ 403 |
| `POST/GET portal/producoes`, `POST :id/baixa` | ✅ | ✅ |
| `GET producoes/sem-ficha`, `GET/PUT producoes/config` | ✅ | ❌ 403 |
| **Todo** `portal/custeio/*` | ✅ | ❌ 403 (controller-level `@Papeis('dono_admin')`) |
| **Todo** `portal/cmv/*` | ✅ | ❌ 403 (controller-level `@Papeis('dono_admin')`) |

**6. Casos de teste**
- 🔐 T2.3.1 Operador `POST portal/insumos` → 403 `Papel sem permissão...`.
- 🔐 T2.3.2 Operador `GET portal/fichas/:id/custo` → 403.
- 🔐 T2.3.3 Operador `GET portal/cmv/periodo` → 403.
- 🔐 T2.3.4 Operador `GET portal/producoes/config` → 403, mas `POST portal/producoes` → 200 (operador pode registrar).
- ✅ T2.3.5 Dono/Admin em todos os acima → permitido.

**7. Validável por UI** — parcial (ver F2.1: menu CMV some para operador; botões de mutação escondidos por `isDonoAdmin()`). A negação **dura** é server-side.
**9. Dependências** — F2.1 com dois papéis.
**10. Riscos** — UI esconde botões mas as rotas continuam acessíveis por HTTP; a barreira real é o guard (testar por HTTP).

---

## F2.4 — Redação de Custo para Operador (transversal)

**1. Identificação** — `core/serialization/cost-redaction.interceptor.ts`, `cost-fields.registry.ts`. Interceptor global.
**2. Objetivo** — Para `papel=operador`, remover recursivamente de TODA resposta os campos sensíveis a custo (preço, custo, CMV, faturamento). Camada única (AD-4).
**5. Regras** — Campos redigidos incluem: `preco_centavos`, `precoCentavos`, `custoPorcaoCentavos`, `custoTotalCentavos`, `cmvUnitarioCentavos`, `cmvValorCentavos`, `cmvPercentual`, `faturamentoCentavos`, `custeio`, etc. (lista em `cost-fields.registry.ts`). Aplica-se só quando `scope=tenant && papel=operador`.
**6. Casos de teste**
- 🔐 T2.4.1 Operador `GET portal/insumos/:id/precos` → objetos **sem** `preco_centavos`.
- 🔐 T2.4.2 Dono/Admin no mesmo endpoint → `preco_centavos` **presente**.
- ⚠️ T2.4.3 Operador `GET portal/insumos` (lista) → confirmar que nenhum campo de custo aparece, mas `quantidade_atual` (saldo, não-custo) permanece.
- 🔁 T2.4.4 Regressão: garantir que a redação é recursiva (arrays e objetos aninhados).
**7. Validável por UI** — indiretamente: como operador, colunas de custo não aparecem (Fichas sem coluna "Custo/porção"; sem menu CMV). Inspeção direta do payload é melhor por HTTP.
**8. Fora da UI** — melhor verificado no corpo da resposta HTTP.
**10. Riscos** — registro por **nome de campo** (string): um campo de custo novo com nome fora do registro **vaza**. Testar nomes exatos.

---

## F2.5 — Gating de Módulo (transversal)

**1. Identificação** — `core/gating/modulo.guard.ts`, `requer-modulo.decorator.ts`, `modulos.ts`; UI órfã `apps/portal/src/app/modulos/modulo-bloqueado.ts`.
**2. Objetivo** — Endpoint `@RequerModulo('gestao_cozinha')` recusado (403 `MODULO_NAO_HABILITADO`, `details.upsell=true`) se a flag do tenant estiver desabilitada.
**4. Estados** — habilitado (passa) · desabilitado (403 com payload de upsell) · principal não-inquilino (403).
**6. Casos de teste**
- ✅ T2.5.1 Com `gestao_cozinha` habilitado, todas as rotas `portal/*` (insumos/fichas/producoes/custeio/cmv) passam pelo guard.
- 🔐 T2.5.2 Desabilitar via F1.3 e repetir → 403 `code=MODULO_NAO_HABILITADO`, `details.upsell=true`.
- ⚠️ T2.5.3 **Divergência UI**: mesmo com módulo desabilitado, o Portal **não** renderiza a tela `modulo-bloqueado` (componente existe mas **não está referenciado em nenhuma rota**). O usuário veria erros nas telas, não o upsell. Registrar.
**7. Validável por UI** — limitado (componente de bloqueio é órfão).
**8. Fora da UI** — leitura de `modulo_flag` (DB).
**9. Dependências** — F1.2/F1.3.
**10. Riscos** — UI não trata 403 de módulo de forma amigável; componente de upsell morto.

---

# MÓDULO 3 — Estoque / Insumos (Épico 2) — **UI completa**

Tela: `/estoque` (`estoque.component.ts`) + `/inicio` (alertas).
Service API: `apps/portal/src/app/estoque/insumo-api.service.ts`. Backend: `insumo.controller.ts`, `insumo.service.ts`.
**Convenção de quantidades**: inteiros em **base escalada** (`valor_real × 10^escala`). Saldo é **derivado do ledger** (`movimento_estoque`), nunca persistido.

## F3.1 — CRUD de Insumo

**1. Identificação**
- Rotas: `POST /api/portal/insumos` (dono) · `GET /api/portal/insumos` (ambos) · `GET :id` (ambos) · `PUT :id` (dono) · `DELETE :id` (dono)
- Banco: `insumo` (UNIQUE `tenant_id,nome`)
- `data-test`: `novo-insumo, f-nome, f-unidade, f-salvar, tabela, linha-insumo, erro`

**2. Objetivo** — Cadastrar/editar/remover insumos com unidade base, escala, estoque mínimo, lote/validade e modelo de conversão (unidade de uso + fator).

**3. Fluxo funcional (UI)** — Dono clica "+ Cadastrar insumo" (`novo-insumo`) → form aparece → preenche → `f-salvar` → recarrega lista. Editar via botão "Editar" na linha → form preenchido (`editandoId`).

**4. Estados da interface** — carregando ("Carregando…") · lista vazia ("Nenhum insumo cadastrado.") · lista com dados · form de cadastro · form de edição · erro (`data-test=erro`) · sem permissão (Operador: botões de cadastro/entrada/perda/editar **não** renderizam; coluna "Ações" oculta).

**5. Regras de negócio**
- `nome` e `unidade_base` obrigatórios (400).
- `escala` default 0; `estoque_minimo`, `unidade_uso`, `fator_conversao` opcionais (nullable).
- UNIQUE (tenant, nome) — duplicado → erro do banco (testar mensagem).
- `quantidade_atual` sempre derivada do ledger (insumo novo = `'0'`).
- `PUT` parcial: só campos presentes são atualizados; nenhum campo → retorna o insumo inalterado.
- `DELETE` em id inexistente → 404 `Insumo não encontrado.` `ON DELETE CASCADE` apaga movimentos/alertas.

**6. Casos de teste**
- ✅ T3.1.1 Criar insumo "Farinha" base kg escala 3 → aparece na `tabela`, saldo "0".
- ❌ T3.1.2 Criar sem nome → `data-test=erro` "Nome do insumo é obrigatório."
- ❌ T3.1.3 Criar nome duplicado → erro (verificar mensagem/registro).
- ✅ T3.1.4 Editar estoque mínimo → salva, lista reflete.
- ✅ T3.1.5 Remover insumo → some da lista.
- 🔐 T3.1.6 Operador: botão `novo-insumo` ausente; `POST` por HTTP → 403.
- ⚠️ T3.1.7 Edge: `escala` negativa / não-numérica (form `type=number`) — observar coerção `Number(...) || 0`.

**7. Validável por UI** — formulário, validação de obrigatórios, lista, edição, exclusão, ocultação de ações por papel, formatação decimal (`formatar` usa escala).
**8. Fora da UI** — UNIQUE, CASCADE, derivação de saldo (DB).
**9. Dependências** — F2.1 (login), módulo habilitado.
**10. Riscos** — sem `ValidationPipe`: tipos/numéricos não coagidos no backend; `escala` impacta toda exibição/cálculo.

## F3.2 — Entrada de Estoque (ledger + idempotência)

**1. Identificação**
- Rota: `POST /api/portal/insumos/entradas` (dono) — corpo `{insumoId, quantidade, precoCentavos, causeKey, lote?, validade?}`
- Banco: `movimento_estoque` tipo `entrada` (UNIQUE `tenant_id,cause_key`)
- `data-test`: `b-entrada, form-entrada, e-qtd, e-preco, e-salvar`

**2. Objetivo** — Registrar compra (quantidade base + preço) como movimento no ledger; idempotente por `causeKey` (gerada no clique).

**3. Fluxo** — Linha do insumo → "Entrada" (`b-entrada`) → form (`form-entrada`) → qtd/preço (+ lote/validade se `lote_validade`) → `e-salvar`.

**5. Regras**
- `insumoId` obrigatório; `quantidade>0`; `precoCentavos>=0`; `causeKey` obrigatória.
- Se `insumo.lote_validade=true` → `lote` e `validade` obrigatórios.
- Insumo inexistente → 404.
- `ON CONFLICT (tenant_id,cause_key) DO NOTHING` → reenvio retorna o movimento existente (não duplica).
- Após entrada, reavalia alerta de estoque mínimo.

**6. Casos de teste**
- ✅ T3.2.1 Entrada qtd>0, preço>0 → saldo do insumo sobe (lista atualiza).
- ❌ T3.2.2 `quantidade=0` → 400.
- ❌ T3.2.3 `precoCentavos<0` → 400.
- ❌ T3.2.4 Insumo com `lote_validade` sem lote → 400 "Lote é obrigatório...".
- 🔁 T3.2.5 Idempotência: mesmo `causeKey` 2× (HTTP) → 1 só movimento (saldo sobe uma vez).
- ✅ T3.2.6 Entrada que zera o alerta (saldo passa do mínimo) → alerta some de `/inicio`.
**7. Validável por UI** — form condicional de lote/validade, atualização de saldo, sumiço de alerta.
**8. Fora da UI** — idempotência por `cause_key` (melhor por HTTP repetido), append-only do ledger.
**10. Riscos** — `causeKey` na UI é por clique; duplo clique rápido gera 2 chaves diferentes? Não — gerada uma vez em `confirmarEntrada`. Mas reenvio de rede usa a mesma chave (ok).

## F3.3 — Registro de Perda

- Rota: `POST /api/portal/insumos/:id/perdas` (dono) `{quantidade, motivo, causeKey}` · `data-test`: `b-perda, confirma-perda, p-qtd, p-motivo, p-confirmar`
- Regras: `quantidade>0`, `motivo` obrigatório, `causeKey` obrigatória, idempotente; insumo inexistente → 404; reavalia alerta.
- **UI**: modal de confirmação destrutiva (overlay) antes de gravar.
- Casos: ✅ perda válida abate saldo · ❌ sem motivo → 400 · ❌ qtd 0 → 400 · 🔁 idempotência por causeKey · ✅ perda que dispara alerta de mínimo → aparece em `/inicio` e `/estoque`.

## F3.4 — Alertas de Estoque Mínimo

- Rota: `GET /api/portal/insumos/alertas/ativos` (ambos). Banco: `alerta_estoque` (UNIQUE tenant,insumo).
- Reavaliação automática após entrada/perda/baixa de produção: `saldo <= estoque_minimo` ⇒ insere alerta (idempotente); senão remove.
- UI: `/inicio` (`sem-alertas` / `alerta-inicio`) e `/estoque` (`alertas`, `alerta-linha`); front também recalcula `abaixoDoMinimo` no cliente via `BigInt`.
- Casos: ✅ insumo abaixo do mínimo aparece em ambas as telas · ✅ entrada que recupera o saldo remove o alerta · ⚠️ insumo sem `estoque_minimo` (null) nunca alerta · 🔁 alerta não duplica (UNIQUE).

## F3.5 — Conversão de Unidade de Uso → Base

- Rota: `GET /api/portal/insumos/:id/converter?quantidadeUso=N` (ambos). Lógica `converterUsoParaBase` (half-up, `Math.round(qUso·10^escala / fator)`).
- Regras: `quantidadeUso` finita e ≥0 (senão 400); insumo sem `fator_conversao` → 400 "sem fator de conversão configurado."
- Casos: ✅ converte g→kg corretamente · ❌ `quantidadeUso` inválida → 400 · ❌ insumo sem fator → 400. (Também usado na Ficha — ver F5.x, conversão feita **no front** em `usoParaBase`).
- **Divergência a observar**: o front da Ficha (`fichas.component.ts > usoParaBase`) reimplementa a conversão **no cliente**, sem chamar este endpoint. Verificar se os resultados coincidem (mesma fórmula). Risco de divergência se escala/fator não baterem.

---

# MÓDULO 4 — Método de Custeio (Épico 3.1) — **UI completa**

## F4.1 — Configuração do Método de Custeio
- Tela `/custeio` (`custeio-config.component.ts`). Rotas: `GET /api/portal/custeio` · `PUT /api/portal/custeio {metodo}` — **controller `@Papeis('dono_admin')`**. Banco: `custeio_config` (PK tenant).
- `data-test`: `atual, nao-definido, op-ultimo, op-medio, salvar`.
- **Objetivo**: escolher `ultimo_preco` ou `medio_ponderado`; **sem default silencioso** — sem método, cálculo de custo recusa. Trocar método **incrementa `versao`**.
- **Estados**: não definido (`nao-definido`, alerta vermelho) · definido (`atual` com método+versão) · erro · botão Salvar desabilitado sem escolha.
- **Regras**: método ∈ {ultimo_preco, medio_ponderado} (senão 400); 1ª definição = versão 1; trocar = versão+1; redefinir o mesmo método = sem bump.
- **Casos**:
  - ✅ T4.1.1 Tenant novo → `nao-definido` visível.
  - ✅ T4.1.2 Escolher `ultimo_preco` + Salvar → `atual` mostra "Último preço de compra (versão 1)".
  - ✅ T4.1.3 Trocar para `medio_ponderado` → versão 2.
  - ⚠️ T4.1.4 Salvar o mesmo método de novo → versão **não** muda.
  - 🔐 T4.1.5 Operador acessa `/custeio` na UI (o menu Custeio **aparece** para operador!) → `GET` retorna 403 → componente seta `config=null` → mostra "não definido" **enganosamente**. **Divergência de UX**: menu Custeio é exibido ao Operador mas a API nega (403); a tela não comunica "sem permissão". Registrar.
- **Riscos**: custo de Ficha/CMV depende deste método; ausência bloqueia Épicos 3/5.

---

# MÓDULO 5 — Fichas Técnicas (Épico 3.2/3.3) — **UI completa**

Tela `/fichas` (`fichas.component.ts`). Backend: `ficha.controller.ts`, `ficha.service.ts`. Banco: `ficha`, `ficha_item`.
`data-test`: `nova-ficha, f-nome, linha-item, sel-insumo, q-item, add-item, linha-sub, sel-sub, sp-item, add-sub, f-salvar, tabela, linha-ficha, ver, custo, detalhe, item-detalhe, erro`.

## F5.1 — CRUD de Ficha + Itens
- Rotas: `POST /api/portal/fichas` (dono) · `GET` (ambos) · `GET :id` (ambos) · `POST :id/itens` (dono) · `DELETE :id` (dono).
- **Objetivo**: ficha técnica por porção; cada item é **exatamente um** componente: Insumo (quantidade base) **ou** sub-Ficha (porções×1000). `rendimento_porcoes >= 1`.
- **Fluxo UI**: "+ Nova ficha" → nome, rende, linhas de Insumo (select + qtd uso, convertida no front), linhas de Sub-receita (select ficha + porções) → Salvar. O front **filtra linhas inválidas** e exige ≥1 item (`Adicione ao menos um insumo ou sub-receita.`).
- **Regras**:
  - nome obrigatório; ≥1 item; cada item exatamente um componente; `quantidade>0`.
  - Sub-ficha não pode referenciar a si mesma; árvore ≤ 3 níveis; sem ciclo (validado antes de gravar; `custoTotal`/`consumoInsumos` são backstop).
  - UNIQUE (tenant, nome).
- **Estados**: lista vazia ("Nenhuma ficha cadastrada.") · com dados · form · detalhe (composição com `└─` e badge SUB-RECEITA) · erro · coluna "Custo/porção" só para Dono/Admin.
- **Casos**:
  - ✅ T5.1.1 Criar ficha só com insumos → aparece na lista.
  - ✅ T5.1.2 Criar ficha com sub-receita (≤3 níveis) → "ver" mostra composição indentada.
  - ❌ T5.1.3 Salvar sem itens válidos → erro no front (não chega à API).
  - ❌ T5.1.4 (HTTP) `POST :id/itens` criando 4º nível → 400 "Composição excederia 3 níveis...".
  - ❌ T5.1.5 (HTTP) sub-ficha cíclica (A→B, B→A) → 400 "referência circular".
  - ❌ T5.1.6 (HTTP) item com insumo **e** sub-ficha → 400 "exatamente um componente".
  - 🔐 T5.1.7 Operador: botão `nova-ficha` ausente; coluna custo ausente; `POST` → 403.
- **Riscos**: conversão uso→base feita no front (F3.5 divergência); ordenação de `ficha_item` por `criado_em`.

## F5.2 — Custo on-read da Ficha
- Rota: `GET /api/portal/fichas/:id/custo?asOf=ISO` (**dono_admin**). Calculado on-read sobre a árvore (≤3 níveis), determinístico (bigint, half-up), parametrizado por método/versão + `asOf` (default agora).
- **Regras**: exige método de custeio definido (senão 400 — propagado de `custeio.exigir`); `ultimo_preco` usa última entrada ≤ asOf; `medio_ponderado` = Σpreço/Σqtd das entradas ≤ asOf; sub-ficha agrega `custo_porção × qtd/1000`.
- **UI**: coluna "Custo/porção" na lista de fichas (`data-test=custo`), carregada por ficha; formatada em BRL.
- **Casos**:
  - ✅ T5.2.1 Com método definido + entradas de preço, custo/porção > 0 e coerente.
  - ❌ T5.2.2 Sem método de custeio → custo falha (coluna fica "—"; HTTP 400).
  - ✅ T5.2.3 Insumo sem nenhuma entrada de preço → custo 0 daquele componente.
  - 🔁 T5.2.4 Determinismo: chamar 2× com mesmo `asOf` → valores idênticos.
  - 🔐 T5.2.5 Operador (HTTP) → 403; na UI não vê a coluna.
- **Fora da UI**: precisão inteira/arredondamento (validar por valores conhecidos via HTTP).
- **Riscos**: depende de F3.2 (preços) e F4.1 (método); `asOf` cross-timezone (UTC).

---

# MÓDULO 6 — Produção (Épico 4) — **UI completa**

Tela `/producao` (`producao.component.ts`). Backend: `producao.controller.ts`, `producao.service.ts`. Banco: `producao`, `producao_config`, `movimento_estoque` (baixas).
`data-test`: `config-modo, modo-auto, modo-manual, aviso-sem-ficha, sel-ficha, qtd, registrar, tabela, linha-producao, status, baixar, erro`.

## F6.1 — Registro de Produção + Baixa Automática/Manual
- Rotas: `POST /api/portal/producoes` (ambos) · `GET` (ambos) · `GET sem-ficha` (dono) · `GET/PUT config` (dono) · `POST :id/baixa` (ambos).
- **Objetivo**: registrar porções produzidas por Ficha; conforme o **modo de baixa** do tenant (`automatico` default / `manual`), debita estoque pela árvore da Ficha (movimentos `baixa`, idempotentes por `cause_key` derivado de produção+insumo). Produção **sem Ficha** nunca baixa → `status_baixa='sem_ficha'` e é sinalizada.
- **Fluxo UI**: (Dono) escolhe modo (`modo-auto`/`modo-manual`); registra produção (ficha opcional + qtd); tabela mostra status; se `pendente`, botão "Baixar" (`baixar`).
- **Estados**: lista vazia · config de modo (só Dono/Admin) · aviso de produções sem ficha (`aviso-sem-ficha`) · status `Pendente`/`Baixado`/`Sem ficha` · erro.
- **Regras**:
  - `quantidade>0` inteiro; ficha opcional.
  - `causeKey` opcional → idempotência (reenvio não duplica produção nem baixas).
  - modo `automatico`: registrar já debita. modo `manual`: fica `pendente` até `POST :id/baixa`.
  - Produção sem ficha: `sem_ficha`, não baixa, não pode baixar manual (400 "Vincule uma Ficha").
  - Baixa idempotente: `baixarManual` em já `baixado` → retorna sem reprocessar.
  - Após cada baixa de insumo, reavalia alerta.
  - `definirModoBaixa` só aceita `automatico|manual` (senão 400).
- **Casos**:
  - ✅ T6.1.1 Modo automático + ficha com insumos → registrar → `status=Baixado`; saldo dos insumos cai (verificar em /estoque).
  - ✅ T6.1.2 Modo manual → registrar → `status=Pendente` + botão Baixar; clicar Baixar → `Baixado` e saldo cai.
  - ✅ T6.1.3 Produção sem ficha → `status=Sem ficha` + `aviso-sem-ficha`.
  - ❌ T6.1.4 qtd 0 → erro front + 400.
  - 🔁 T6.1.5 Idempotência: mesmo `causeKey` 2× (HTTP) → 1 produção, estoque debitado uma vez.
  - 🔁 T6.1.6 Baixar manual 2× a mesma produção → 2ª vez sem efeito (idempotente).
  - 🔐 T6.1.7 Operador: `config-modo` não aparece; `GET config` HTTP → 403; mas pode registrar e baixar.
  - ⚠️ T6.1.8 Trocar modo vale para as **próximas** produções (não reprocessa pendentes).
  - ⚠️ T6.1.9 Baixa que zera estoque abaixo do mínimo → alerta aparece em /inicio.
- **Fora da UI**: idempotência (cause_key derivado), atomicidade leitura-árvore + baixa, reavaliação de alertas (DB/HTTP).
- **Riscos**: condição de corrida em baixas concorrentes da mesma produção (testar 2 baixas simultâneas → não duplicar); consistência entre `consumoInsumos` (produção) e `custoTotal` (custo) — ver nota de qualidade.

---

# MÓDULO 7 — CMV (Épico 5) — **UI completa, só Dono/Admin**

Tela `/cmv` (`cmv.component.ts`, menu só para Dono/Admin). Backend: `cmv.controller.ts` (`@Papeis('dono_admin')` no controller). Banco: `faturamento_periodo` + leitura de `movimento_estoque`.
`data-test`: `nav-cmv, competencia, cmv-valor, faturamento, salvar-fat, cmv-percentual, tabela, linha-cmv, cmv-unitario`.

## F7.1 — CMV unitário por Ficha
- Rota: `GET /api/portal/cmv/fichas/:id/unitario?asOf=` = custo da porção (reusa F5.2). UI: tabela "CMV unitário por ficha".
- Casos: ✅ valor = custo/porção da ficha · ❌ sem método de custeio → coluna "—"/erro.

## F7.2 — CMV em valor do período + CMV%
- Rota: `GET /api/portal/cmv/periodo?competencia=YYYY-MM`.
- **Objetivo**: consolida o **consumo** do mês (movimentos `baixa`+`perda`) valorado pelo método vigente (`asOf` = fim do período). **Nunca** soma entradas. CMV% = CMV ÷ faturamento bruto × 100 (2 casas), `null` sem faturamento.
- **Regras**: `competencia` formato `YYYY-MM` válido (mês 01-12) senão 400; faturamento resolvido por **precedência** `pedidos > manual` (nunca somado); CMV% só com faturamento > 0.
- **UI**: input `type=month` (`competencia`) dispara `carregarPeriodo`; mostra `cmv-valor` e a métrica-herói `cmv-percentual` (mostra "—" sem faturamento; badge "FATURAMENTO AUTOMÁTICO (PEDIDOS)" se origem=pedidos).
- **Casos**:
  - ✅ T7.2.1 Mês com baixas/perdas → `cmv-valor` > 0.
  - ✅ T7.2.2 Definir faturamento → `cmv-percentual` calculado (conferir 2 casas, half-up).
  - ⚠️ T7.2.3 Sem faturamento → `cmv-percentual` = "—".
  - ❌ T7.2.4 (HTTP) `competencia=2026-13` → 400 "Competência inválida (mês 01-12)."
  - ⚠️ T7.2.5 Mês sem consumo → CMV valor 0.
  - 🔐 T7.2.6 Operador (HTTP) `GET cmv/periodo` → 403; na UI não há menu.

## F7.3 — Faturamento manual bruto
- Rota: `PUT /api/portal/cmv/faturamento {competencia, valorCentavos}`. Upsert em `faturamento_periodo` origem `manual`. `valorCentavos>=0` finito (senão 400).
- UI: campo `faturamento` (centavos) + `salvar-fat`. **Front bloqueia** valor null/negativo silenciosamente (não chama API).
- Casos: ✅ salvar 100000 → recarrega período com CMV% · ⚠️ salvar negativo → front ignora (sem feedback — registrar UX) · 🔁 upsert: salvar 2× sobrescreve (não duplica).
- **Divergência**: o input do CMV pede "centavos" cru (UX ruim para o usuário final, mas funcional). Registrar.

---

# MÓDULO 8 — Pedidos e KDS (Épico 6)

## F8.1 — Aplicativo KDS Realtime
- **Identificação:** Gateway WebSocket `kds.gateway.ts`, `pedidos.service.ts` · UI `apps/kds`.
- **Objetivo:** Exibição reativa e imediata de novos pedidos da cozinha no painel de preparo.
- **Regras:** Pedido de delivery ou manual cria card em tempo real no KDS.
- **Casos de Teste:**
  - ✅ T8.1.1 Conectar WebSocket no KDS → recebe lista inicial de pedidos ativos.
  - ✅ T8.1.2 Enviar pedido manual ou webhook → card surge em tempo real no KDS.

## F8.2 — Pedido Manual
- **Identificação:** `POST /api/pedidos/manual` · DTO `CriarPedidoManualDto`.
- **Objetivo:** Registrar pedidos diretamente na cozinha sem passar por webhook integrador.
- **Regras:** `itens` não-vazio; `cliente` e `numero_pedido` gerado; RLS ativo por tenant.
- **Casos de Teste:**
  - ✅ T8.2.1 Registrar pedido manual válido → 201 + cria card no KDS.
  - ❌ T8.2.2 Registrar sem itens ou com quantidade inválida → 400.

## F8.3 — Fluxo de Status Idempotente
- **Identificação:** `POST /api/pedidos/:id/status` · `MudarStatusDto`.
- **Objetivo:** Transicionar status do pedido: `recebido` → `em_preparo` → `pronto` → `entregue`.
- **Regras:** Transição para o mesmo status retorna com sucesso sem duplicar eventos ou efeitos no estoque.
- **Casos de Teste:**
  - ✅ T8.3.1 Mover status para `em_preparo` e depois para `pronto`.
  - 🔁 T8.3.2 Enviar transição para `pronto` repetidamente → retorna 200/201 sem efeitos colaterais.

## F8.4 — Fila Local Offline
- **Identificação:** LocalStorage Sync no KDS Client.
- **Objetivo:** Garantir que o KDS local armazene transições offline em caso de queda de rede e sincronize ao retornar.
- **Casos de Teste:**
  - ✅ T8.4.1 Desconectar rede/mock offline, realizar transição no client → alteração salva no localStorage.
  - ✅ T8.4.2 Reconectar rede → dispara sincronização em lote e atualiza banco.

---

# MÓDULO 9 — Integrações Delivery (Épico 7)

## F9.1 — ACL de Delivery (iFood & 99Food)
- **Identificação:** Adapters `IfoodAdapter` e `NoveNoveFoodAdapter`.
- **Objetivo:** Traduzir payloads proprietários de webhooks para o modelo canônico da plataforma.
- **Casos de Teste:**
  - ✅ T9.1.1 Payload bruto iFood → traduzido em `NormalizedWebhookEvent` e `NormalizedOrder`.
  - ✅ T9.1.2 Payload bruto 99Food → traduzido perfeitamente com os mesmos campos.

## F9.2 — Conexão de Contas
- **Identificação:** `POST/GET/DELETE /api/integracoes` · Guard `@Papeis('dono_admin')`.
- **Objetivo:** Dono do inquilino cadastra e gerencia credenciais de integração com lojas.
- **Casos de Teste:**
  - ✅ T9.2.1 Salvar integração iFood → dados persistem em `tenant_integracao`.
  - 🔐 T9.2.2 Operador tentar registrar ou deletar conexão → 403.

## F9.3 — Ingestão Inbox-Outbox
- **Identificação:** `DeliveryWebhookController`, `InboxWorkerService` e `OutboxWorkerService`.
- **Objetivo:** Processamento confiável "at-least-once" e livre de duplicidades para webhooks.
- **Regras:**
  - Webhook recebido é salvo em `delivery_inbox` e responde 200 OK imediatamente (sem bloquear).
  - Deduplicação atômica via constraint `ON CONFLICT (tenant_id, provider, provider_event_id) DO NOTHING`.
- **Casos de Teste:**
  - ✅ T9.3.1 Enviar webhook iFood → responde 200 e insere na inbox.
  - 🔁 T9.3.2 Reenvio do mesmo webhook com mesmo ID → ignorado atomicamente pelo banco.

## F9.4 — Sincronização e Pausa
- **Identificação:** `POST /api/recebimento/pausar` · `POST /api/recebimento/reativar`.
- **Regras:** Ação de pausa de delivery exige confirmação explícita (`confirmar=true`).
- **Casos de Teste:**
  - ✅ T9.4.1 Chamar pausar com `confirmar=true` → recebimento entra em modo pausado.
  - ❌ T9.4.2 Chamar pausar sem `confirmar=true` → 400.

## F9.5 — Cancelamento e Faturamento Automático
- **Identificação:** `OutboxWorkerService` & `FaturamentoPedidosService`.
- **Objetivo:** Pedidos finalizados no KDS geram receita de faturamento automática, enquanto cancelamentos revertem os lançamentos.
- **Regras:** Pedido `entregue` insere em `faturamento_periodo` (origem `pedidos`), que realimenta o cálculo do CMV% do período.
- **Casos de Teste:**
  - ✅ T9.5.1 Finalizar pedido de R$ 50,00 → gera receita automática.
  - ✅ T9.5.2 Receber webhook de cancelamento do pedido → reverte o faturamento e ajusta CMV.

---

# MÓDULO 10 — Backoffice, Unidades e Reservas (Épico 8)

## F10.1 — Cadastro de Cozinha
- **Identificação:** `POST/GET/PUT/DELETE /api/backoffice/cozinhas` · Guard `PlatformScopeGuard`.
- **Objetivo:** Gerenciar as unidades físicas de cozinha da plataforma.
- **UI:** Tela `/cozinhas` do Backoffice.
- **Casos de Teste:**
  - ✅ T10.1.1 Criar cozinha válida (staff) → cadastrada e visível na tabela.
  - 🔐 T10.1.2 Token de inquilino tentar cadastrar cozinha → 403.

## F10.2 — Agenda Slots e Contratos
- **Identificação:** `POST/GET /api/backoffice/reservas` · Constraint GiST `no_overbooking`.
- **Objetivo:** Reservar slots de turnos/dias ou contratos semanais/mensais impedindo sobreposição.
- **Regras:**
  - Duas reservas na mesma cozinha não podem ter sobreposição de horário.
  - Contratos periódicos (ex: modalidade `semana` ou `mes`) bloqueiam todos os turnos/dias dentro de seu intervalo.
- **Casos de Teste:**
  - ✅ T10.2.1 Criar reserva válida de turno → cadastrada com sucesso.
  - ❌ T10.2.2 Criar reserva conflitante no mesmo slot → rejeitada com 409 Conflict.
  - ❌ T10.2.3 Criar reserva de turno dentro do período de um contrato de semana ativo → rejeitada com 409.

## F10.3 — Repositório de Documentos e Alertas
- **Identificação:** `POST /api/backoffice/documentos/cozinha/:cozinhaId` · `AlertaService`.
- **Objetivo:** Upload de licenças das cozinhas e sincronização de alertas de vencimento (< 30 dias).
- **Casos de Teste:**
  - ✅ T10.3.1 Upload de documento com validade no futuro → visível no repositório.
  - ✅ T10.3.2 Documento expirando em < 30 dias → gera alerta de vencimento em `/inicio`.

---

# MÓDULO 11 — Controle de Presença e Insumos Backoffice (Épico 9)

## F11.1 — Registro de Presença e Checklist
- **Identificação:** `POST /api/backoffice/presencas` · `PresencaChecklist` estruturado.
- **Objetivo:** Registrar check-in/out dos inquilinos com checklists de conformidade (limpeza/equipamentos).
- **Casos de Teste:**
  - ✅ T11.1.1 Registrar check-in válido com checklist conforme → salva no banco e atualiza histórico.
  - ❌ T11.1.2 Registrar sem selecionar cozinha → erro de validação.

## F11.2 — Ledger de Materiais
- **Identificação:** `POST /api/backoffice/materiais/movimento` · Ledger append-only.
- **Objetivo:** Ledger de estoque de insumos fornecidos pela plataforma, permitindo registrar entradas e consumos específicos por inquilino.
- **Casos de Teste:**
  - ✅ T11.2.1 Registrar entrada de reabastecimento → aumenta o saldo geral.
  - ✅ T11.2.2 Registrar consumo para Inquilino A → debita o saldo (gera base de faturamento de extras).

---

# MÓDULO 12 — Faturamento e Billing Consolidado (Épico 10)

## F12.1 — Faturamento Automático de Aluguel e Módulos
- **Identificação:** `BillingService.gerarFatura()`.
- **Objetivo:** Consolidar e faturar no fim do período aluguéis por modalidade e assinaturas recorrentes de módulos do Portal de forma automática.
- **Regras:**
  - Valores de aluguel canônicos mapeados em centavos (turno=15k, dia=50k, semana=300k, mes=1000k).
  - Assinaturas de módulos ativos cobradas conforme flags de módulo (`pedidos_kds`=15k, `gestao_cozinha`=20k).
- **Casos de Teste:**
  - ✅ T12.1.1 Gerar fatura com reservas no período → itens de aluguel criados com o valor exato correspondente às modalidades.
  - ✅ T12.1.2 Gerar fatura com módulo KDS ativo → insere taxa de assinatura de R$ 150,00.

## F12.2 — Faturamento de Extras & Consolidação
- **Identificação:** `BillingService` · endpoints `/api/backoffice/billing/:id/pagar` e `cancelar`.
- **Objetivo:** Agregar consumo de materiais como itens extras na fatura com rastreabilidade total (link de origem ao ledger).
- **Regras:**
  - Validação de conflitos (idempotência): impede faturamento duplicado no mesmo período.
  - O valor total da fatura deve ser a soma exata dos itens de aluguel + assinaturas + extras.
- **Casos de Teste:**
  - ✅ T12.2.1 Gerar fatura contendo consumo de material registrado no período → item `consumo_material` inserido com `origem_id` apontando para o ledger.
  - ❌ T12.2.2 Gerar fatura duplicada para o mesmo período e inquilino → 409 Conflict.
  - ✅ T12.2.3 Registrar pagamento de fatura aberta → status transiciona para `paga`.

---

# 8. Matriz de Funcionalidades

| Feature | Módulo | Prioridade | Complexidade | Valida via UI | Necessita backend/DB extra |
|---|---|---|---|---|---|
| F1.1 Login plataforma | Backoffice | Alta | Baixa | ❌ (sem UI) | Seed `staff` |
| F1.2 Provisionamento | Backoffice | Alta | Média | ❌ | Verif. DB (atomicidade/audit) |
| F1.3 Flags de módulo | Backoffice | Alta | Baixa | ❌ | — |
| F2.1 Login portal | Identidade | Crítica | Baixa | ✅ | Seed usuário ativo |
| F2.2 Convite/Aceite | Identidade | Média | Média | ❌ (sem UI) | Race/expiração via DB |
| F2.3 RBAC | Identidade | Crítica | Baixa | ⚠️ parcial | Negação real via HTTP |
| F2.4 Redação de custo | Identidade | Alta | Baixa | ⚠️ parcial | Inspeção payload HTTP |
| F2.5 Gating de módulo | Identidade | Alta | Baixa | ⚠️ parcial | flag DB |
| F3.1 CRUD Insumo | Estoque | Alta | Baixa | ✅ | UNIQUE/CASCADE via DB |
| F3.2 Entrada/ledger | Estoque | Alta | Média | ✅ | Idempotência via HTTP |
| F3.3 Perda | Estoque | Média | Baixa | ✅ | Idempotência via HTTP |
| F3.4 Alertas mínimo | Estoque | Média | Baixa | ✅ | — |
| F3.5 Conversão unidade | Estoque | Média | Média | ⚠️ (via Ficha) | Paridade front/back |
| F4.1 Método custeio | Custeio | Alta | Baixa | ✅ | Versão via DB |
| F5.1 CRUD Ficha | Fichas | Alta | Alta | ✅ | Árvore/ciclo via HTTP |
| F5.2 Custo on-read | Fichas | Alta | Alta | ✅ | Precisão via HTTP |
| F6.1 Produção+baixa | Produção | Alta | Alta | ✅ | Idempotência/atomicidade |
| F7.1 CMV unitário | CMV | Média | Média | ✅ | — |
| F7.2 CMV valor/% | CMV | Alta | Alta | ✅ | Valores via HTTP |
| F7.3 Faturamento manual | CMV | Média | Baixa | ✅ | Upsert via DB |
| F8.1 KDS Realtime | KDS | Alta | Média | ✅ | WebSocket |
| F8.2 Pedido Manual | KDS | Média | Baixa | ❌ (sem UI) | — |
| F8.3 Status Idempotente | KDS | Alta | Baixa | ✅ | — |
| F8.4 Fila Local Offline | KDS | Média | Baixa | ✅ | LocalStorage |
| F9.1 Webhook Ingest | Pedidos | Crítica | Média | ❌ (sem UI) | Deduplicação |
| F9.2 Conexão Contas | Pedidos | Alta | Média | ❌ (sem UI) | — |
| F9.3 Inbox-Outbox | Pedidos | Alta | Média | ❌ (sem UI) | Workers background |
| F9.4 Sincronização e Pausa | Pedidos | Média | Média | ✅ | Confirmação explícita |
| F9.5 Cancelamento | Pedidos | Média | Média | ❌ (sem UI) | — |
| F9.6 Faturamento Auto | Pedidos | Alta | Média | ✅ | Integração com CMV |
| F10.1 CRUD Cozinha | Backoffice | Alta | Baixa | ✅ | — |
| F10.2 Agenda Slots | Backoffice | Alta | Média | ✅ | Restrição GiST |
| F10.3 Contrato Período | Backoffice | Alta | Média | ✅ | — |
| F10.4 Docs & Alertas | Backoffice | Média | Média | ✅ | Validade de arquivos |
| F11.1 Registro Presença | Backoffice | Alta | Baixa | ✅ | — |
| F11.2 Ledger Materiais | Backoffice | Alta | Média | ✅ | — |
| F12.1 Faturamento Modalidade | Billing | Alta | Média | ❌ (sem UI) | Preços canônicos em centavos |
| F12.2 Assinatura Módulos | Billing | Alta | Média | ❌ (sem UI) | Módulos contratados |
| F12.3 Faturamento Extras | Billing | Alta | Média | ✅ | Rastreabilidade de ledger |

---

# 9. Plano de Execução (ordenado por dependência)

**Fase 0 — Ambiente (pré-condição)**
1. Subir Postgres + rodar migrations (`npx nx run backend:migrate`).
2. **Seed staff**: `npx nx run backend:seed-staff` (env `STAFF_BOOTSTRAP_EMAIL`/`STAFF_BOOTSTRAP_SENHA`). Subir `backend` e `portal`.
3. Validar `GET http://localhost:3000/health` (200) e Swagger.

**Fase 1 — Plataforma (API)**
4. F1.1 Login staff → token plataforma.
5. F1.2 Provisionar Tenant A (gestao_cozinha + pedidos_kds) e Tenant B — **guardar `conviteDono.token` de cada um**.
6. **Ativar Dono/Admin de A e B** via `/aceitar-convite?token=...` (UI) ou `POST /portal/usuarios/convites/aceitar` (API) — sem tocar no banco (§0.3).
7. F1.3 Flags de módulo (incl. regressão de gating).

**Fase 2 — Identidade**
8. F2.1 Login portal (Dono A) — UI.
9. F2.2 Convite/Aceite (criar Operador A) — API.
10. F2.1 Login Operador A — UI.
11. F2.3 RBAC + F2.4 Redação de custo + F2.5 Gating (HTTP, 2 papéis).
12. Isolamento multi-tenant: Dono A não enxerga dados de B (HTTP, trocar tokens).

**Fase 3 — Estoque**
13. F3.1 CRUD Insumo.
14. F3.2 Entrada (preços — pré-requisito de custo).
15. F3.3 Perda · F3.4 Alertas · F3.5 Conversão.

**Fase 4 — Custeio**
16. F4.1 Definir método (pré-requisito de custo/CMV).

**Fase 5 — Fichas**
17. F5.1 CRUD Ficha (insumos + sub-receitas, ciclos/níveis via HTTP).
18. F5.2 Custo on-read.

**Fase 6 — Produção**
19. F6.1 Registro + baixa automática/manual + sem-ficha + idempotência.

**Fase 7 — Pedidos e KDS**
20. F8.1 & F8.2 Subir painel KDS e conectar WebSocket.
21. F8.3 Registrar Pedidos Manuais e transicionar status no KDS (idempotente).
22. F8.4 Testar resiliência offline do KDS via localStorage.

**Fase 8 — Integrações Delivery**
23. F9.1 & F9.2 Conectar loja de delivery fictícia iFood.
24. F9.3 Enviar webhook com pedidos de delivery e processar via Inbox-Outbox.
25. F9.4 Testar pausa e reativação do fluxo de recebimento.
26. F9.5 & F9.6 Cancelar e entregar pedidos, verificando a geração automática de faturamento e sua injeção no CMV.

**Fase 9 — Backoffice, Reservas & Materiais**
27. F10.1 Cadastrar Cozinhas no Backoffice.
28. F10.2 Reservar slots de turnos e contratos de período, validando restrições de overbooking.
29. F10.3 & F10.4 Anexar licenças de cozinha e verificar geração de alertas de expiração.
30. F11.1 Registrar Check-in/out com checklist na cozinha.
31. F11.2 Alimentar ledger de materiais fornecidos e simular consumo do inquilino.

**Fase 10 — Faturamento e Billing**
32. F12.1 & F12.2 Gerar fatura consolidada no final do período.
33. F12.3 Validar itens gerados (aluguel por modalidade, assinatura recorrente de módulos e materiais extras com origem de ledger).
34. Executar pagamento e cancelamento de faturas pelo painel de faturamento.

---

# 10. Riscos e Divergências Conhecidas (consolidado)

| # | Tipo | Descrição | Ação de validação |
|---|---|---|---|
| D1 | ✅ Resolvido | Bootstrap: `seed-staff` (staff) + provisionamento emite `conviteDono.token` (Dono). Sem seed manual no banco | Validar Fase 0–1 |
| D2 | ✅ Resolvido | Aceite de convite agora tem tela `/aceitar-convite`. **Convidar** ainda não tem tela (Dono usa API/`POST convites`) | Validar T2.2 via UI de aceite + API de convite |
| D3 | 🟠 Divergência | KDS e Backoffice têm componentes UI básicos, mas sem roteamento complexo para inquilinos | Confirmar no frontend |
| D4 | 🟠 Divergência UI | Menu **Custeio** aparece ao Operador, mas API nega (403) e a tela mostra "não definido" enganosamente | Reproduzir T4.1.5 |
| D5 | 🟠 Código morto | `modulo-bloqueado` (upsell) existe mas **não está em nenhuma rota**; portal não trata 403 de módulo amigavelmente | Reproduzir T2.5.3 |
| D6 | 🟡 Divergência | Conversão uso→base reimplementada no **front** da Ficha (não usa `/converter`) | Validar paridade T3.5/T5.1 |
| D7 | 🟡 Segurança | Sem `ValidationPipe` global; campos extras/tipos não validados pelo framework | Enviar payloads malformados |
| D8 | 🟡 Segurança | Sem rate-limiting nos logins | Observação |
| D9 | 🟡 Segurança | Token de convite retornado no corpo (sem email); em produção vazaria o link | Observação |
| D10 | 🟡 UX | Campo de faturamento/preços pede **centavos** crus; valor negativo no faturamento é ignorado sem feedback | Reproduzir T7.3 |
| D11 | 🟡 Doc | `libs/domain-models/openapi-types.ts` e Swagger **desatualizados** — não refletem as rotas reais | Não confiar no OpenAPI gerado |
| D12 | 🔵 Observação | Chave de staff ID exige semeadura com UUID real para registrar logs de provisionamento | Validar no spec do billing |

---

## Apêndice A — Seletores `data-test` por tela

- **/login**: `email, senha, entrar, erro`
- **/aceitar-convite**: `sem-token, senha, confirmacao, erro, definir, sucesso, ir-login`
- **App shell**: `papel, sair, nav-cmv`
- **/inicio**: `sem-alertas, alerta-inicio`
- **/estoque**: `novo-insumo, erro, alertas, alerta-linha, f-nome, f-unidade, f-salvar, tabela, linha-insumo, b-entrada, b-perda, form-entrada, e-qtd, e-preco, e-salvar, confirma-perda, p-qtd, p-motivo, p-confirmar`
- **/fichas**: `nova-ficha, erro, f-nome, linha-item, sel-insumo, q-item, add-item, linha-sub, sel-sub, sp-item, add-sub, f-salvar, tabela, linha-ficha, ver, custo, detalhe, item-detalhe`
- **/producao**: `erro, config-modo, modo-auto, modo-manual, aviso-sem-ficha, sel-ficha, qtd, registrar, tabela, linha-producao, status, baixar`
- **/custeio**: `atual, nao-definido, op-ultimo, op-medio, salvar`
- **/cmv**: `competencia, cmv-valor, faturamento, salvar-fat, cmv-percentual, tabela, linha-cmv, cmv-unitario`
- **/cozinhas**: `nova-cozinha, f-cozinha-nome, f-cozinha-equipada, f-cozinha-salvar, tabela-cozinhas, linha-cozinha`
- **/cozinhas/:id**: `upload-file, f-doc-tipo, f-doc-validade, btn-doc-salvar, tabela-docs, linha-doc, tabela-alertas, alerta-doc-item`
- **/agenda**: `agenda-grid, btn-reserva-form, f-reserva-inquilino, f-reserva-modalidade, f-reserva-inicio, f-reserva-fim, btn-reserva-salvar`
- **/presencas**: `f-cozinha, f-inquilino, f-tipo, f-limpeza, f-equipamento, f-observacoes, f-salvar, tabela-historico, linha-historico`
- **/materiais**: `novo-material, m-nome, m-salvar, tabela-materiais, linha-material, mov-material, mov-tipo, mov-qtd, mov-inquilino, mov-valor, mov-salvar`
- **/billing**: `f-tenant, f-inicio, f-fim, f-gerar, fatura-row, filtro-status, btn-pagar, btn-cancelar`

---

## Apêndice B — Mapa de rotas HTTP (base `http://localhost:3000/api`)

```
# Plataforma (token scope=platform)
POST   /backoffice/auth/login
POST   /backoffice/inquilinos
GET    /backoffice/inquilinos/:tenantId/modulos
PATCH  /backoffice/inquilinos/:tenantId/modulos/:modulo
POST   /backoffice/cozinhas
GET    /backoffice/cozinhas
GET    /backoffice/cozinhas/:id
PUT    /backoffice/cozinhas/:id
DELETE /backoffice/cozinhas/:id
POST   /backoffice/reservas
GET    /backoffice/reservas/cozinha/:cozinhaId
DELETE /backoffice/reservas/:id
POST   /backoffice/documentos/cozinha/:cozinhaId
GET    /backoffice/documentos/cozinha/:cozinhaId
DELETE /backoffice/documentos/:id
GET    /backoffice/alertas
GET    /backoffice/alertas/cozinha/:cozinhaId
POST   /backoffice/presencas
GET    /backoffice/presencas/cozinha/:cozinhaId
POST   /backoffice/materiais
POST   /backoffice/materiais/movimento
GET    /backoffice/materiais/saldo
GET    /backoffice/materiais/consumos
POST   /backoffice/billing/gerar
POST   /backoffice/billing/:id/pagar
POST   /backoffice/billing/:id/cancelar
GET    /backoffice/billing/:id
GET    /backoffice/billing/tenant/:tenantId
GET    /backoffice/billing

# Identidade (token scope=tenant)
POST   /portal/auth/login
POST   /portal/usuarios/convites            (dono_admin)
POST   /portal/usuarios/convites/aceitar    (público)

# Estoque (modulo gestao_cozinha)
POST   /portal/insumos                       (dono)
GET    /portal/insumos                        (ambos)
GET    /portal/insumos/:id                    (ambos)
PUT    /portal/insumos/:id                     (dono)
DELETE /portal/insumos/:id                     (dono)
POST   /portal/insumos/entradas                (dono)
GET    /portal/insumos/:id/precos              (ambos, custo redigido p/ operador)
POST   /portal/insumos/:id/perdas              (dono)
GET    /portal/insumos/alertas/ativos          (ambos)
GET    /portal/insumos/:id/converter?quantidadeUso=  (ambos)

# Custeio (dono_admin)
GET    /portal/custeio
PUT    /portal/custeio

# Fichas
POST   /portal/fichas                          (dono)
GET    /portal/fichas                           (ambos)
GET    /portal/fichas/:id                        (ambos)
GET    /portal/fichas/:id/custo?asOf=            (dono)
POST   /portal/fichas/:id/itens                  (dono)
DELETE /portal/fichas/:id                         (dono)

# Produção
POST   /portal/producoes                        (ambos)
GET    /portal/producoes                         (ambos)
GET    /portal/producoes/sem-ficha               (dono)
GET    /portal/producoes/config                  (dono)
PUT    /portal/producoes/config                  (dono)
POST   /portal/producoes/:id/baixa               (ambos)

# Pedidos e KDS (modulo pedidos_kds)
POST   /pedidos/manual                           (ambos)
POST   /pedidos/:id/status                       (ambos)
GET    /recebimento                              (ambos)
POST   /recebimento/pausar                       (ambos, confirmar=true)
POST   /recebimento/reativar                     (ambos)
GET    /integracoes                              (dono_admin)
POST   /integracoes                              (dono_admin)
DELETE /integracoes/:provider                    (dono_admin)

# Ingestão de Webhooks
POST   /webhooks/delivery/:tenantId/:provider    (público)

# CMV (dono_admin)
GET    /portal/cmv/fichas/:id/unitario?asOf=
GET    /portal/cmv/periodo?competencia=YYYY-MM
PUT    /portal/cmv/faturamento

# Sem prefixo /api
GET    /health
GET    /error-test
```

