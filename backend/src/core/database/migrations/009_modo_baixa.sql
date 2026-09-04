-- Story 4.3 — Modo de baixa de estoque configurável por tenant (FR-15).
-- automatico: registrar Produção debita conforme a Ficha (4.2).
-- manual:     registrar não altera estoque até uma baixa explícita.
-- Default `automatico` para preservar o comportamento da 4.2 sem configuração.

CREATE TABLE IF NOT EXISTS producao_config (
  tenant_id     uuid        PRIMARY KEY,
  modo_baixa    text        NOT NULL DEFAULT 'automatico'
                            CHECK (modo_baixa IN ('automatico', 'manual')),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE producao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_config FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS producao_config_tenant_isolation ON producao_config;
CREATE POLICY producao_config_tenant_isolation ON producao_config
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
