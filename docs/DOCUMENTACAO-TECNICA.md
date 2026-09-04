# Documentação Técnica — `cozinha81-core`

> **Objetivo deste documento:** Servir como guia definitivo de transição e handover técnico para engenheiros de software que assumirão o desenvolvimento do projeto `cozinha81-core`. Este documento cobre a arquitetura, estrutura de código, o que está 100% funcional, o que está mockado/simulado e os débitos/próximos passos de implementação.

---

## 1. Visão Geral da Arquitetura

O `cozinha81-core` é um **monorepo Nx** desenvolvido em **TypeScript**, estruturado da seguinte forma:

- **Backend:** NestJS 11 (Monólito modular), Node.js 24 LTS.
- **Frontend:** Angular 22 (Zoneless, Signals), dividido em 3 aplicações spa.
- **Banco de Dados:** PostgreSQL 18 com **Row-Level Security (RLS)** nativo e `uuidv7()`.
- **Tempo Real:** WebSocket via NestJS Gateway (`@nestjs/websockets` / Socket.io).
- **Fila Offline KDS:** IndexedDB no cliente frontend.

```
cozinha81-core/
├── apps/
│   ├── portal/            # Angular — Inquilino (Dono/Admin + Operador)
│   ├── kds/               # Angular — Cozinha (Tela Cheia, WebSocket + Offline IndexedDB)
│   └── backoffice/        # Angular — Equipe Interna Cozinha81 (Gestão de Unidades/Billing)
├── backend/
│   └── src/
│       ├── core/          # Tenancy (RLS), Identidade (JWT), Guardas, Serialization (Cost Redaction)
│       └── modules/
│           ├── identidade/      # Convites e gestão de usuários de inquilinos
│           ├── gestao-cozinha/  # Insumos, Fichas Técnicas, Produção, Custeio, CMV
│           ├── pedidos/         # Pedidos, Gateway KDS, Adapters Delivery, Inbox/Outbox Workers
│           └── backoffice/      # Provisionamento, Cozinhas, Reservas, Documentos, Presença, Billing
├── libs/
│   ├── design-system/     # Componentes Angular + Wrapper dos tokens CSS do Cozinha81 Design System
│   ├── domain-models/     # Types/DTOs OpenAPI (Stub/Obsoleto - ver seção 3)
│   └── data-access/       # Cliente HTTP OpenAPI Fetch (Stub/Obsoleto - ver seção 3)
└── Cozinha81 Design System/ # Fonte da verdade dos tokens CSS (--flame-500, --space-*, etc.)
```

---

## 2. Invariantes Técnicos e Regras de Ouro

### 2.1 Multi-Tenancy via PostgreSQL Row-Level Security (RLS)
- **Todas as tabelas do inquilino** possuem a coluna `tenant_id`.
- **Nenhuma query tenant-scoped roda fora de `DatabaseService.withTenant(tenantId, fn)`**:
  - `DatabaseService.withTenant` abre uma transação e executa `SET LOCAL app.tenant_id = '...'`.
  - As políticas RLS no Postgres filtram automaticamente por `tenant_id = NULLIF(current_setting('app.tenant_id', true),'')::uuid OR current_setting('app.scope') = 'platform'`.
- **Papel de Runtime (`cozinha_app`):** O backend DEVE conectar no banco usando o papel `cozinha_app` (que possui `NOBYPASSRLS`). Se conectar como `admin` ou superusuário, o Postgres ignora a RLS e o isolamento multi-tenant falha.

### 2.2 Dois Realms de Identidade (JWT)
1. **Realm Tenant (Inquilino):** Usuários de restaurantes (`papel`: `dono_admin` ou `operador`). Possuem `tenantId` no token. Acessam Portal e KDS.
2. **Realm Platform (Staff Cozinha81):** Equipe interna da Cozinha81 (`scope=platform`). Não possuem `tenantId`. Acessam exclusivamente o app Backoffice.

Guards aplicados:
- `@Papeis(...)` / `RolesGuard` — autorização baseada no papel do inquilino.
- `PlatformScopeGuard` — exige `scope=platform` (rotas `/api/backoffice/*`).
- `@RequerModulo(...)` / `ModuloGuard` — checa se o inquilino contratou o módulo (`gestao_cozinha`, `pedidos_kds`).

### 2.3 Privacidade de Custo Server-Side (`CostRedactionInterceptor`)
- **Regra:** Usuários com papel `operador` NUNCA podem visualizar custos de insumos, valores de fichas técnicas ou CMV.
- **Implementação:** Interceptor global `CostRedactionInterceptor` inspeciona recursivamente a resposta HTTP JSON e remove todas as chaves listadas em `cost-fields.registry.ts` quando `req.user.papel === 'operador'`.

### 2.4 Estoque como Ledger Append-Only
- O saldo de estoque **nunca é mantido em uma coluna gravável na tabela de insumos**.
- O saldo é estritamente derivado da soma histórica na tabela `movimento_estoque` através do fragmento SQL `SALDO_POR_INSUMO` em `insumo.service.ts`.
- Tipos de movimento: `entrada` (+), `estorno` (+), `baixa` (-), `perda` (-).
- Toda escrita gera um `cause_key` (UUID v7). Com `ON CONFLICT (tenant_id, cause_key) DO NOTHING`, a operação é 100% idempotente.

### 2.5 Custo e CMV On-Read e Determinísticos
- Custo de Ficha Técnica não é salvo no banco: é calculado dinamicamente (*on-read*) navegando na árvore de sub-receitas (máximo 3 níveis, validação anti-ciclo).
- Dinheiro é representado sempre em **centavos inteiros** (`bigint`/`number`).
- Quantidades usam **base escalada inteira** (`valor × 10^escala`), sem uso de `float` para evitar imprecisão decimal.
- Arredondamento *half-up* centralizado em `money.ts > divRound`.

---

## 3. Estado Atual dos Componentes: Implementado vs. Mockado vs. Pendente

### 🟢 3.1 100% IMPLEMENTADO E FUNCIONAL (Backend + Database + Frontend + Testes)

#### Backend Modules:
1. **Identidade & Tenant Provisioning (`modules/identidade`, `modules/backoffice/provisioning`, `modules/backoffice/auth`):**
   - Provisionamento de inquilinos com geração de token de convite para o Dono.
   - Aceite de convite e cadastro de senha (`POST /api/portal/usuarios/convites/aceitar`).
   - Autenticação JWT para Staff (`/api/backoffice/auth/login`) e Inquilino (`/api/portal/auth/login`).
   - Gestão de convites de novos colaboradores pelo Dono.
   - Gating por módulos contratados (`gestao_cozinha`, `pedidos_kds`).

2. **Gestão de Cozinha (`modules/gestao-cozinha`):**
   - CRUD de Insumos com estoque mínimo e conversão de unidades (ex: embalagem com 12 unidades).
   - Movimentos de Estoque: Entrada (com custo) e Perda de insumos via Ledger append-only.
   - Fichas Técnicas: Criação com itens de insumos e sub-receitas (árvore até 3 níveis, proteção contra ciclos).
   - Métodos de Custeio: PEPS, UEPS e Custo Médio configuráveis.
   - Registro de Produção: Baixa automática de insumos pela árvore da Ficha Técnica e baixa manual.
   - Cálculo de CMV (Custo da Mercadoria Vendida): CMV Unitário, CMV por Período em R$ e CMV Percentual.

3. **Pedidos & KDS (`modules/pedidos`):**
   - Lançamento de Pedidos Manuais (`POST /api/pedidos/manual`).
   - Fluxo de Status Idempotente: `criado` → `em_preparo` → `pronto` → `despachado` / `cancelado`.
   - Ingestão via Inbox/Outbox Worker (Pattern transactional inbox/outbox).
   - Websocket Gateway (`kds.gateway.ts`) para notificação de novos pedidos.

4. **Backoffice Core (`modules/backoffice`):**
   - Cadastro e gestão de Unidades/Cozinhas.
   - Agenda de Slots e Reservas de cozinhas por inquilinos.
   - Repositório de Documentos do Inquilino com alertas de vencimento (Vigilância Sanitária, AVCB).
   - Registro de Presença (Check-in / Check-out com checklist de estado).
   - Controle de Materiais e Utensílios fornecidos.
   - Motor de Billing/Faturamento: Geração de cobranças de Aluguel, Módulos contratados e Consumo Extra.

#### Frontends:
1. **Portal do Inquilino (`apps/portal`):**
   - Telas completas para: Login, Aceite de Convite, Dashboard, Insumos & Estoque, Fichas Técnicas, Produção de Cozinha, Custeio & CMV, Módulos Contratados e Conexão de Integrações Delivery.
2. **KDS - Kitchen Display System (`apps/kds`):**
   - Interface em tempo real (fullscreen landscape) com colunas de status.
   - Lançamento manual de pedidos direto da tela.
   - **Fila Local Offline via IndexedDB (`offline-queue.service.ts`):** se a internet cair, o operador continua avançando os pedidos; ao reconectar, a fila drena automaticamente com garantia de idempotência.
3. **Backoffice Frontend (`apps/backoffice`):**
   - Telas de Login, Dashboard, Gestão de Cozinhas, Agenda de Slots, Registro de Presença (Check-in/out), Materiais/Utensílios e Visualização de Billing.

---

### 🟡 3.2 MOCKADO / SIMULADO / STUB (Pontos que exigem integração externa real)

1. **Adapters de Delivery (`backend/src/modules/pedidos/adapters/`):**
   - `ifood.adapter.ts` e `99food.adapter.ts` são **adapters simulados/mockados**.
   - Eles implementam a interface `DeliveryAdapter`, mas utilizam o `fake-delivery.adapter.ts` internamente.
   - *Necessário para produção:* Conectar com as APIs oficiais do iFood Merchant API e 99Food Partner API usando credenciais OAuth reais.

2. **Processamento Financeiro de Billing (`backend/src/modules/backoffice/billing/`):**
   - O backend calcula os valores devidos (Aluguel, Módulos, Extras) e grava os débitos na tabela de cobranças.
   - **Não há gateway de pagamento real integrado** (ex: Asaas, Stripe, Mercado Pago ou Iugu). A liquidação das faturas é simulada ou marcada manualmente no banco.

3. **Contrato Compartilhado (`libs/domain-models` e `libs/data-access`):**
   - `libs/domain-models/src/lib/openapi-types.ts` contém um stub básico com rotas `/api`, `/health`, `/error-test`. Os modelos do backend de Gestão de Cozinha/Pedidos não estão exportados lá.
   - `libs/data-access` possui um client `openapi-fetch` apontado para `localhost:3000` que não é importado por nenhum app.
   - Os apps Angular redeclaram suas interfaces DTO manualmente em `*-api.service.ts`.

4. **Isolamento de WebSocket no KDS Gateway (`kds.gateway.ts`):**
   - O gateway WebSocket do NestJS dispara `server.emit('newOrder', ...)` em broadcast geral para todos os clientes conectados.
   - *Necessário para produção:* Adicionar salas (*rooms*) Socket.io isoladas por `tenant_id`.

---

### 🔴 3.3 NÃO IMPLEMENTADO / PENDENTE (Próximos Passos Recomendados)

1. **Geração Automática de OpenAPI Client:**
   - Automatizar no pipeline do Nx a exportação do arquivo OpenAPI JSON do NestJS e a geração de tipos TypeScript sincronizados em `libs/domain-models`.

2. **Upload Binário de Arquivos (Cloud Storage):**
   - Os metadados de documentos de compliance do inquilino (Vigilância Sanitária, Contratos) são salvos em `documento_inquilino`, mas o upload do arquivo PDF/imagem binário para um bucket S3/GCS não possui endpoint de upload de multipart/form-data.

3. **Agendador / Worker Recorrente de Billing (Cron Job):**
   - O serviço `BillingService` possui o método de fechamento de fatura mensal, mas ele precisa de um agendador (`@nestjs/schedule` ou BullMQ/Redis) para disparar automaticamente no 1º dia de cada mês.

4. **Pipeline CI/CD e Infraestrutura de Deploy:**
   - O projeto possui `docker-compose.yml` pré-configurado para desenvolvimento local (PostgreSQL 18). Faltam manifests de Terraform/Helm ou GitHub Actions workflows para staging/produção.

---

## 4. Guia de Execução e Desenvolvimento Local

### 4.1 Pré-requisitos
- **Node.js:** v22.x
- **Docker & Docker Compose:** Obrigatório para subir o PostgreSQL 18 local e executar os testes integrados do backend com Testcontainers.
  - **macOS:** `brew install --cask docker` ou instale o [Docker Desktop para Mac](https://www.docker.com/products/docker-desktop/).
  - **Linux (Ubuntu/Debian):** `sudo apt-get install -y docker.io docker-compose-v2`.
  - **Verificar Daemon:** `docker info` (deve responder sem erros de socket/conexão).
- **PostgreSQL 18:** Obrigatório (as migrations dependem de `uuidv7()`).

### 4.2 Configuração do Banco de Dados Local
1. Subir o contêiner do Postgres 18:
   ```bash
   docker compose up -d
   ```
2. Criar o papel de runtime `cozinha_app` (executar apenas 1 vez):
   ```bash
   docker compose exec db psql -U admin -d cozinha81 <<'SQL'
   CREATE ROLE cozinha_app LOGIN PASSWORD 'app_pwd' NOSUPERUSER NOBYPASSRLS;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO cozinha_app;
   GRANT USAGE, SELECT                 ON ALL SEQUENCES  IN SCHEMA public TO cozinha_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO cozinha_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                 ON SEQUENCES  TO cozinha_app;
   SQL
   ```
3. Rodar as migrations (como `admin` via `DATABASE_URL`):
   ```bash
   DATABASE_URL=postgres://admin:admin@localhost:5432/cozinha81 npx nx run backend:migrate
   ```
4. Se mear o primeiro Staff de plataforma (Ops Admin):
   ```bash
   DATABASE_URL=postgres://admin:admin@localhost:5432/cozinha81 \
   STAFF_BOOTSTRAP_EMAIL=ops@cozinha81 STAFF_BOOTSTRAP_SENHA='SenhaForte!23' \
     npx nx run backend:seed-staff
   ```

### 4.3 Servir as Aplicações
```bash
# Terminal 1 — Backend (conecta como cozinha_app usando variáveis PG*)
PGHOST=localhost PGPORT=5432 PGUSER=cozinha_app PGPASSWORD=app_pwd PGDATABASE=cozinha81 \
  npx nx serve backend

# Terminal 2 — Portal do Inquilino (http://localhost:4200)
npx nx serve portal

# Terminal 3 — KDS (http://localhost:4202)
npx nx serve kds --port 4202

# Terminal 4 — Backoffice (http://localhost:4201)
npx nx serve backoffice --port 4201
```

---

## 5. Suíte de Testes e Qualidade de Código

O repositório possui alta cobertura de testes automatizados:

- **Testes Backend (Jest + Testcontainers):**
  - Rodam testes unitários e de integração E2E contra um PostgreSQL 18 real via Docker Testcontainers.
  - **Pré-requisito:** O daemon do Docker deve estar rodando na máquina (`docker info`), caso contrário o Testcontainers lança a mensagem `Could not find a working container runtime strategy`.
  - Execução: `npx nx test backend`
- **Testes Frontend (Jest + JSDOM):**
  - Validam lógica de componentes e fluxos dos apps Angular.
  - Execução: `npx nx test portal`

Comando para rodar toda a suíte de testes do monorepo:
```bash
npx nx run-many --target=test
```
