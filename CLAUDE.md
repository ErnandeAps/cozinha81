# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Há um `README.md` detalhado (stack, estrutura, invariantes, entrega faseada) e um `../project-context.md`. Este arquivo foca no que não está lá: comandos reais de dev e os **seams de arquitetura no código**.

## Onde as coisas vivem

- **Código** (este repo git, branch `main`): monorepo Nx — `apps/{portal,kds,backoffice}` (Angular), `libs/{design-system,domain-models,data-access}`, `backend/` (NestJS).
- **Contrato do projeto** (PRD, UX, arquitetura/SPEC, épicos, stories) vive **fora do repo**, em `../_bmad-output/`. As stories dev-ready estão em `../_bmad-output/implementation-artifacts/` + `sprint-status.yaml` (estado oficial dos épicos).
- **Design System**: `Cozinha81 Design System/styles.css` é a fonte da verdade dos tokens CSS (`--flame-500`, `--space-*`, `--status-*`…); `libs/design-system` expõe os componentes Angular (`@cozinha81/design-system`).

## Comandos

```bash
npm install

# servir (processos separados)
npx nx serve backend            # → http://localhost:3000/api  (prefixo global /api, exceto /health e /error-test)
npx nx serve portal             # → http://localhost:4200
# kds e backoffice: serváveis, mas as rotas estão VAZIAS (sem UI ainda)

# qualidade
npx nx test backend             # jest (backend usa testcontainers → precisa de Docker)
npx nx test portal              # jest + jsdom (não precisa de Docker)
npx nx lint backend
npx nx run-many --target=test   # todos os projetos
npx nx run-many --target=build

# um teste só (passthrough jest)
npx nx test backend --testPathPattern=ficha.service
npx nx test backend -t "custo on-read"

# banco
DATABASE_URL=postgres://admin:***@localhost:5432/cozinha81 npx nx run backend:migrate
# bootstrap do 1º staff (idempotente; lê env STAFF_BOOTSTRAP_EMAIL/SENHA)
DATABASE_URL=postgres://admin:***@localhost:5432/cozinha81 \
  STAFF_BOOTSTRAP_EMAIL=ops@cozinha81 STAFF_BOOTSTRAP_SENHA='SenhaForte!23' \
  npx nx run backend:seed-staff
npx nx run backend:generate-openapi
```

### Banco — pré-requisitos não óbvios
- **PostgreSQL 18 obrigatório**: as migrations usam `uuidv7()` nativo. PG < 18 falha em todas.
- **Dois papéis**: migrations rodam como **admin/owner**; o backend em runtime DEVE conectar como papel **não-superusuário e `NOBYPASSRLS`** (`cozinha_app`), senão a RLS forçada é ignorada e o isolamento multi-tenant não vale. `buildPoolConfig` dá precedência a `DATABASE_URL` sobre `PGHOST/PGUSER/...` — no `serve` use os `PG*` (não setar `DATABASE_URL`). Setup completo: ver `VALIDATION-PLAN.md` §0.0.

## Arquitetura — seams que exigem ler vários arquivos

**Tenancy é o núcleo.** Toda query tenant-scoped passa por `DatabaseService.withTenant(tenantId, fn)` ([backend/src/core/database/database.service.ts](backend/src/core/database/database.service.ts)): abre transação, faz `set_config('app.tenant_id', …, is_local := true)` (transaction-local, descartado no COMMIT) e roda `fn(client)`. As policies RLS (em cada migration) filtram por `tenant_id = NULLIF(current_setting('app.tenant_id', true),'')::uuid OR current_setting('app.scope')='platform'`. Nunca emita SQL tenant-scoped fora de `withTenant`/`withPlatform`/`withAmbient`.

**Dois realms de identidade.** JWT carrega `scope` (`tenant`|`platform`). Inquilino tem `tenantId`+`papel` (`dono_admin`|`operador`); staff de plataforma tem `scope=platform`, sem `tenantId`. Guards: `RolesGuard` (`@Papeis(...)`), `PlatformScopeGuard` (rotas `backoffice/*`), `ModuloGuard` (`@RequerModulo('gestao_cozinha')` checa `modulo_flag`). Use `@CurrentTenant()` (não `req.user.tenantId as string`) e `@CurrentUser()`.

**Privacidade de custo é uma camada única.** `CostRedactionInterceptor` (global) remove recursivamente campos de custo de TODA resposta quando `papel=operador`. A lista de campos é o registro único `cost-fields.registry.ts` — campos de custo novos entram lá (por **nome**), nunca em interceptors locais, senão vazam.

**Estoque é ledger append-only.** O saldo NUNCA é coluna: é derivado de `movimento_estoque` via os fragmentos SQL `MOV_DELTA`/`SALDO_POR_INSUMO` (fonte única em [insumo.service.ts](backend/src/modules/gestao-cozinha/insumo.service.ts)). `entrada`/`estorno` somam; `baixa`/`perda` subtraem. Toda escrita usa `cause_key` (UUID) com `ON CONFLICT (tenant_id, cause_key) DO NOTHING` → idempotência.

**Custo e CMV são on-read e determinísticos.** `FichaService` calcula custo percorrendo a árvore da Ficha (`ficha_item` → insumo ou sub-ficha, ≤3 níveis, sem ciclo) — nada de custo persiste. Tudo é inteiro/`bigint` com arredondamento half-up (`money.ts > divRound`); quantidades são **inteiros em base escalada** (`valor × 10^escala`); sub-ficha usa mili-porção (×1000). `CmvService` reusa esse mesmo motor (`valorInsumo`) para não divergir. Dinheiro em **centavos**, datas UTC.

**Produção × estoque.** Registrar produção debita os insumos pela árvore da Ficha (movimentos `baixa`, `cause_key` derivado de produção+insumo). Modo `automatico` (default) debita na hora; `manual` deixa `pendente` até baixa explícita. Produção sem Ficha vira `sem_ficha` e não debita.

**Bootstrap (primeiro acesso).** Não há signup. `seed-staff` cria o 1º staff. Provisionar inquilino (`POST /api/backoffice/inquilinos`) cria o Dono `pendente` e **retorna `conviteDono.token`**; o Dono define senha em `/aceitar-convite?token=…` (mesmo fluxo de convite dos demais usuários).

## Convenções e armadilhas

- **Sem `ValidationPipe` global.** DTOs são `interface` simples (não `class-validator`). O framework não rejeita campos extras nem coage tipos — **toda validação é manual dentro dos services** (ex.: `if (!dto.nome?.trim()) throw new BadRequestException(...)`). Siga esse padrão.
- **Erros**: `GlobalExceptionFilter` padroniza `{ code, message, details }`. Para erros de domínio ricos (ex.: gating), lance `ForbiddenException({ code, message, details })`.
- **Fronteira de módulos** (lint): módulos do backend dependem só de `core`. Não criar dependências cruzadas entre módulos de feature.
- **Quantidades inteiras escaladas** em todo o estoque/ficha/produção — nunca float para dinheiro/quantidade.
- **`libs/data-access` e `libs/domain-models/openapi-types.ts` estão obsoletos/stub** (não usados pelos apps; openapi só descreve `/api`,`/health`,`/error-test`). Os apps redeclaram tipos à mão nos `*-api.service.ts`. Não confiar neles como contrato até serem regenerados.
- **Estado dos épicos**: 1–5 concluídos (gestão de cozinha); 6–10 em backlog. KDS/Backoffice não têm UI. Fonte: `../_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **PT-BR** em nomes de domínio, mensagens e identificadores de feature.

## Documentos auxiliares neste repo

- `VALIDATION-PLAN.md` — plano de QA funcional (épicos 1–5) + setup de ambiente (§0.0).
- `CODE-QUALITY-REVIEW.md` — dívidas estruturais conhecidas a tratar.
