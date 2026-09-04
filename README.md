# cozinha81-core

Plataforma da **Cozinha81** — cozinhas compartilhadas para delivery alugadas **junto com o software para operá-las**. O diferencial não é o imóvel: é o combo "cozinha + sistema integrado".

São dois sistemas. O **Portal do Inquilino** (cliente) cobre gestão de cozinha — estoque, fichas técnicas, CMV — e operação de delivery — KDS e integração com iFood/99Food. O **Backoffice** (interno) gere cozinhas, reservas, acesso, cobrança e conformidade documental.

Repositório único (**monorepo Nx**): três frontends + bibliotecas compartilhadas + backend.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Angular 22 (zoneless, signals) |
| Backend | NestJS 11 (monólito modular) · Node.js 24 LTS |
| Linguagem | TypeScript 5.x |
| Monorepo | Nx 22 |
| Banco | PostgreSQL 18 (Row-Level Security) |
| Tempo real | WebSocket (NestJS Gateway) |
| Auth | Passport + JWT (convite-only, dois realms) |
| Fila offline do KDS | IndexedDB (cliente) |

PT-BR em todo o produto. Sem i18n no v1.

## Estrutura

```
cozinha81-core/                 # monorepo Nx
  apps/
    portal/                     # Angular — Inquilino (Dono/Admin + Operador)
    kds/                        # Angular — cozinha, tela cheia (tablet/TV)
    backoffice/                 # Angular — equipe Cozinha81
  libs/
    design-system/              # wrapper do Cozinha81 Design System (tokens + componentes)
    domain-models/              # tipos/DTOs gerados do contrato (OpenAPI/WS)
    data-access/                # clientes de API/WS tipados
  backend/
    src/core/                   # tenancy (RLS), identidade (JWT), eventos, ledger, idempotência
    src/modules/gestao-cozinha/ # Insumo, Ficha, Produção, Custeio, CMV
    src/modules/pedidos/        # Pedido, KDS gateway, ACL delivery, inbox/outbox
    src/modules/backoffice/     # Inquilino, Cozinha, flags, Reserva, Documento, Billing
  Cozinha81 Design System/      # identidade visual canônica (styles.css é a fonte da verdade)
```

> O **contrato do projeto** (PRD, UX, arquitetura, SPEC, épicos e stories) vive **fora** deste repositório, no workspace de planejamento `../_bmad-output/` — ver "Documentação do projeto" abaixo.

## Entrega faseada

A entrega é liderada pelo valor percebido pelo inquilino:

1. **Fase 1 — Gestão de cozinha** (Épicos 1–5): contas/multi-tenancy, estoque, fichas técnicas/custeio, produção/baixa, CMV.
2. **Fase 2 — Pedidos/KDS** (Épicos 6–7): KDS + pedido manual (resiliente a quedas), integração iFood/99Food, faturamento → CMV.
3. **Fase 3 — Backoffice** (Épicos 8–10): cozinhas/reservas, check-in/out/materiais, compliance documental, billing automatizado.

Aluguel e cobrança rodam manualmente até a Fase 3.

## Invariantes de arquitetura (não negociáveis)

- **Isolamento multi-tenant por RLS** — dados de um Inquilino nunca acessíveis a outro, forçado no banco.
- **Dois realms de identidade** — usuários de Inquilino (`tenant_id` + papel, RLS-scoped) vs. staff Cozinha81 (`scope=platform`, sem `tenant_id`, cross-tenant só pela porta do backoffice).
- **Privacidade de custo server-side** — Operador nunca recebe preço/custeio/CMV; remoção numa camada única de serialização.
- **KDS não perde pedido no pico** — comandos idempotentes (UUID v7) + fila local + reconciliação por invariante de ledger.
- **Estoque é ledger append-only** — saldo derivado, nunca editado; estorno/perda são movimentos compensatórios.
- **Custo/CMV on-read** — função pura sobre a árvore da Ficha (≤3 níveis, sem ciclo).
- **Contrato tipado único** — OpenAPI gera o cliente REST; mensagens WebSocket têm schema compartilhado gerado.
- **Dinheiro em centavos · datas UTC (exibe America/Sao_Paulo) · IDs UUID v7.**

Detalhes completos em `_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` (AD-1…AD-14).

## Documentação do projeto (workspace de planejamento)

O contrato do que construir vive **fora deste repositório**, no workspace de planejamento BMad em `../_bmad-output/` (pasta-pai), onde o tooling BMad o gerencia. Caminhos relativos à raiz deste repo:

- **Documentação Técnica de Handover:** [docs/DOCUMENTACAO-TECNICA.md](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/docs/DOCUMENTACAO-TECNICA.md) (detalhes de código, serviços backend, RLS, status de mocks e pendências técnicas).
- **Documentação Funcional de Produto:** [docs/DOCUMENTACAO-FUNCIONAL.md](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/docs/DOCUMENTACAO-FUNCIONAL.md) (visão de usuário, regras de negócio por Épico e matriz de status funcional).
- **SPEC** (contrato canônico): `../_bmad-output/specs/spec-cozinha81/SPEC.md` — CAP-1…CAP-13.
- **PRD + addendum**: `../_bmad-output/planning-artifacts/prds/prd-cozinha81-2026-06-24/` — FR-1…FR-41.
- **UX**: `../_bmad-output/planning-artifacts/ux-designs/ux-cozinha81-2026-06-24/` — DESIGN.md + EXPERIENCE.md.
- **Arquitetura**: `../_bmad-output/planning-artifacts/architecture/architecture-cozinha81-2026-06-24/ARCHITECTURE-SPINE.md`.
- **Épicos e stories**: `../_bmad-output/planning-artifacts/epics.md` (10 épicos) e `../_bmad-output/implementation-artifacts/` (42 stories dev-ready) + `sprint-status.yaml`.

## Rodar localmente

### Pré-requisitos

| Item | Requisito | Por quê |
|---|---|---|
| Node | 22.x (`nvm use`) | workspace Nx 22 |
| **Docker** | **Docker Desktop / Docker Engine + Compose** (obrigatório) | Postgres 18 local (e testcontainers) |
| **PostgreSQL** | **18** (obrigatório) | migrations usam `uuidv7()` nativo — **PG < 18 falha em 100% das migrations** |
| Deps | `npm ci` | pg, nest, angular, ts-node |

#### Instalação do Docker (caso ainda não tenha instalado)

- **macOS (via Homebrew):**
  ```bash
  brew install --cask docker
  ```
  *Ou baixe o instalador oficial:* [Docker Desktop para Mac](https://www.docker.com/products/docker-desktop/)

- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose-v2
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER # (após isso, faça logout e login novamente)
  ```

- **Verificar se o Docker está instalado e em execução (daemon ativo):**
  ```bash
  docker --version
  docker info
  ```
  *(Se `docker info` retornar erro de conexão ao daemon, inicie o Docker Desktop ou o serviço `systemctl start docker`).*

> **Dois papéis de banco (crítico p/ RLS).** As migrations rodam como **admin/owner**; o backend em runtime **deve** conectar como um papel **não-superusuário e `NOBYPASSRLS`** (`cozinha_app`) — senão a RLS forçada é ignorada e o isolamento multi-tenant não vale.

### 1. Subir o Postgres 18

```bash
npm ci
docker compose up -d          # sobe PG18 em localhost:5432 (admin/admin, db cozinha81)
```

### 2. Papel de runtime + grants (uma vez)

O backend conecta como `cozinha_app`. Ele precisa de acesso às tabelas **e às sequences**
(`pedido.numero` é `serial` — sem `USAGE` na sequence, inserir Pedido falha sob RLS):

```bash
docker compose exec db psql -U admin -d cozinha81 <<'SQL'
CREATE ROLE cozinha_app LOGIN PASSWORD 'app_pwd' NOSUPERUSER NOBYPASSRLS;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO cozinha_app;
GRANT USAGE, SELECT                 ON ALL SEQUENCES  IN SCHEMA public TO cozinha_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO cozinha_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                 ON SEQUENCES  TO cozinha_app;
SQL
```

### 3. Migrations + primeiro staff (papel admin via `DATABASE_URL`)

```bash
# schema
DATABASE_URL=postgres://admin:admin@localhost:5432/cozinha81 npx nx run backend:migrate

# bootstrap do 1º staff de plataforma (não há signup)
DATABASE_URL=postgres://admin:admin@localhost:5432/cozinha81 \
STAFF_BOOTSTRAP_EMAIL=ops@cozinha81 STAFF_BOOTSTRAP_SENHA='SenhaForte!23' \
  npx nx run backend:seed-staff
```

### 4. Servir (processos separados)

```bash
# backend — runtime como cozinha_app (use PG*, NÃO setar DATABASE_URL aqui)
PGHOST=localhost PGPORT=5432 PGUSER=cozinha_app PGPASSWORD=app_pwd PGDATABASE=cozinha81 \
  npx nx serve backend        # → http://localhost:3000/api  (prefixo global /api)

# portal do Inquilino (outro terminal)
npx nx serve portal           # → http://localhost:4200
```

### 5. Gate de verificação (não prossiga sem os 4)

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/health         # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/docs        # 200 (Swagger)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4200/login           # 200
curl -s -X POST http://localhost:3000/api/backoffice/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ops@cozinha81","senha":"SenhaForte!23"}'                        # 200 + accessToken (scope=platform)
```

### Acessos (apps e contas)

| App | URL | Realm | Login |
|---|---|---|---|
| **Portal** (Inquilino) | http://localhost:4200 | tenant | ver "Inquilino de teste" abaixo |
| **Backoffice** (staff Cozinha81) | http://localhost:4201 | platform | `ops@cozinha81` / `SenhaForte!23` |
| **KDS** (cozinha) | `npx nx serve kds` | tenant | mesma conta do Portal |
| **API / Swagger** | http://localhost:3000/api/docs | — | — |

> **Dois realms de identidade.** A conta **staff** (criada pelo `seed-staff`, passo 3) entra só no **Backoffice**. Contas de **Inquilino** entram só no **Portal/KDS**. Não há signup — usuários de Inquilino nascem por provisionamento/convite.

**Inquilino de teste (login do Portal).** Não é semeado automaticamente; crie um via provisionamento (staff → convite → aceite):

```bash
API=http://localhost:3000/api
DONO_EMAIL="dono@cozinhateste"; DONO_SENHA='DonoForte!23'

STAFF_TOKEN=$(curl -s -X POST $API/backoffice/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ops@cozinha81","senha":"SenhaForte!23"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

TOKEN=$(curl -s -X POST $API/backoffice/inquilinos -H 'Content-Type: application/json' -H "Authorization: Bearer $STAFF_TOKEN" \
  -d "{\"nome\":\"Cozinha Teste\",\"dono\":{\"email\":\"$DONO_EMAIL\",\"nome\":\"Dona Teste\"},\"modulos\":[\"gestao_cozinha\",\"pedidos_kds\"]}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["conviteDono"]["token"])')

curl -s -X POST $API/portal/usuarios/convites/aceitar -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"senha\":\"$DONO_SENHA\"}"
# → agora logue no Portal com dono@cozinhateste / DonoForte!23 (papel dono_admin)
```

> Um **Operador** (visão sem custos/CMV) nasce por convite dentro do Portal, ou via `POST /api/portal/usuarios/convites` autenticado como Dono/Admin.

### Testar o KDS (tempo real + offline)

O KDS (`npx nx serve kds --port 4202` → http://localhost:4202) é um painel único em tempo real via WebSocket. **Abra em janela larga / tela cheia** (tem restrição de landscape).

1. **Habilitar as ações.** O display via WS funciona sem login, mas os botões (avançar status, lançar pedido) usam `localStorage['token']`. No **DevTools → Console** da aba do KDS:
   ```js
   fetch('http://localhost:3000/api/portal/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({email:'dono@cozinhateste',senha:'DonoForte!23'})})
     .then(r=>r.json()).then(d=>{localStorage.setItem('token',d.accessToken);location.reload()});
   ```
2. **Fazer um pedido aparecer.** Clique em **"Lançar pedido manual"** no KDS (card na coluna *Aceitar* + som), ou via API:
   ```bash
   API=http://localhost:3000/api
   T=$(curl -s -X POST $API/portal/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"dono@cozinhateste","senha":"DonoForte!23"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')
   curl -s -X POST $API/pedidos/manual -H 'Content-Type: application/json' -H "Authorization: Bearer $T" \
     -d '{"itens":[{"id":"11111111-1111-4111-8111-111111111111","quantidade":1,"nome":"Pizza"}]}'
   ```
3. **Avançar o fluxo.** Clique no card: *Aceitar → Preparo → Pronto → Despachado* (comando idempotente por clique).
4. **Resiliência offline (Épico 6.4).** DevTools → **Network → Offline** → avance um card (entra na fila local, contador de pendentes sobe) → volte **Online** → a fila drena e sincroniza (duplicados resolvidos por idempotência).
5. **(Avançado) Delivery.** Um webhook ingerido (7.3) também cai no KDS via `newOrder`: conecte uma conta em **Integrações** (portal) e envie `POST /api/webhooks/delivery/:tenantId/:provider`.

> O gateway WS transmite para **todos** os clientes conectados (sem filtro por tenant no v1) — qualquer pedido aparece no KDS aberto.

### Gotchas

- **PG 18 ou nada** (`uuidv7()`).
- **Runtime ≠ admin**: no `serve backend` use os `PG*` (papel `cozinha_app`); **não** setar `DATABASE_URL` (ele tem precedência e conectaria como admin, invalidando a RLS).
- **KDS e Backoffice ainda não têm UI** — validar por HTTP/Swagger. No portal, a tela nova do Épico 7 é **Integrações** (`/integracoes`, conectar iFood/99Food); ingestão/sync/estorno rodam por webhook + workers em background.
- **Reset limpo do banco:** `docker compose down -v && docker compose up -d` e repita os passos 2–3. Necessário se alguma migration já aplicada foi editada (o runner não re-roda migrations já registradas em `schema_migrations`).
- Não use `NODE_ENV=production` no `serve` (esconde `details` dos erros e atrapalha o QA).

### Testes / lint / build

```bash
npx nx test backend           # jest + testcontainers (Postgres 18 real) — precisa de Docker
npx nx test portal            # jest + jsdom (não precisa de Docker)
npx nx run-many --target=test
npx nx run-many --target=lint
npx nx run-many --target=build
```

Ordem de implementação das stories: siga a numeração (dependências são sempre para trás).

## Convenções

- Versões dos pacotes-âncora são **pinadas em valores exatos** (sem ranges).
- Módulos do backend dependem **apenas** de `core`; a regra de fronteira é imposta por lint (falha o build se violada).
- Cada story cria/altera **apenas** as entidades/tabelas que precisa.
