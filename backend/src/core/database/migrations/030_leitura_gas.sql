CREATE TABLE IF NOT EXISTS leitura_gas (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  data_inicial date NOT NULL,
  leitura_inicial numeric(12,2) NOT NULL DEFAULT 0,
  data_final date NOT NULL,
  leitura_final numeric(12,2) NOT NULL DEFAULT 0,
  consumo_m3 numeric(12,2) NOT NULL DEFAULT 0,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leitura_gas ENABLE ROW LEVEL SECURITY;
ALTER TABLE leitura_gas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leitura_gas_tenant_isolation ON leitura_gas;
CREATE POLICY leitura_gas_tenant_isolation ON leitura_gas
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  );
