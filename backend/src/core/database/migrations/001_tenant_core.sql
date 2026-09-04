-- Story 1.2 — Núcleo multi-tenant.
-- Tabela mínima de inquilino + RLS forçada (AD-1, NFR-1).
-- Roda em PostgreSQL 18 (uuidv7() é nativo).

CREATE TABLE IF NOT EXISTS inquilino (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  -- toda tabela tenant-scoped carrega tenant_id; para o próprio inquilino,
  -- tenant_id == id (a linha É o tenant).
  tenant_id  uuid        NOT NULL,
  nome       text        NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- RLS habilitada E forçada: a policy vale inclusive para o owner da tabela
-- (FORCE). Superusuário/role com BYPASSRLS ainda ignora — por isso o app
-- conecta como papel não-privilegiado (ver database.config.ts).
ALTER TABLE inquilino ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquilino FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inquilino_tenant_isolation ON inquilino;
CREATE POLICY inquilino_tenant_isolation ON inquilino
  -- NULLIF(..., '') porque um GUC já "tocado" (SET LOCAL numa transação anterior
  -- na mesma conexão) volta a '' (string vazia), não NULL — e ''::uuid explode.
  -- Com NULLIF, sem tenant context => NULL => `tenant_id = NULL` é falso, nada vaza.
  -- AD-14 (Story 1.3): a policy de plataforma adiciona aqui o predicado
  -- `OR current_setting('app.scope', true) = 'platform'` para staff cross-tenant.
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
