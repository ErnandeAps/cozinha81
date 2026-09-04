-- Story 1.5 — Convite de usuários pelo Dono/Admin.
-- Convite tenant-scoped, token de uso único e expirável (guarda só o HASH).

CREATE TABLE IF NOT EXISTS convite (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id  uuid        NOT NULL,
  usuario_id uuid        NOT NULL REFERENCES usuario (id),
  -- nunca guardar o token cru; só o sha256 (o token vai no link, uma vez).
  token_hash text        NOT NULL UNIQUE,
  expira_em  timestamptz NOT NULL,
  usado_em   timestamptz,
  criado_por uuid        NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE convite ENABLE ROW LEVEL SECURITY;
ALTER TABLE convite FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS convite_tenant_isolation ON convite;
CREATE POLICY convite_tenant_isolation ON convite
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
