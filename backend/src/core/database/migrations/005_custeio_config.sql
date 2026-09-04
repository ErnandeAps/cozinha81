-- Story 3.1 — Método de Custeio do tenant (FR-13, AD-10).
-- Sem default silencioso: a ausência de linha = método não definido.
-- `versao` incrementa a cada troca de método, parametrizando o cálculo on-read.

CREATE TABLE IF NOT EXISTS custeio_config (
  tenant_id     uuid        PRIMARY KEY,
  metodo        text        NOT NULL CHECK (metodo IN ('ultimo_preco', 'medio_ponderado')),
  versao        integer     NOT NULL DEFAULT 1,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custeio_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE custeio_config FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custeio_config_tenant_isolation ON custeio_config;
CREATE POLICY custeio_config_tenant_isolation ON custeio_config
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
