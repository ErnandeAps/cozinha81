-- Corrige o schema em bancos já existentes que ainda não possuem a tabela de auditoria do fechamento de GLP.
CREATE TABLE IF NOT EXISTS central_glp_fechamento_leitura (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  fechamento_id uuid NOT NULL REFERENCES central_glp_fechamento (id) ON DELETE CASCADE,
  leitura_id uuid NOT NULL REFERENCES central_glp_leitura (id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, fechamento_id, leitura_id)
);

ALTER TABLE central_glp_fechamento_leitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_glp_fechamento_leitura FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS central_glp_fechamento_leitura_tenant_isolation ON central_glp_fechamento_leitura;
CREATE POLICY central_glp_fechamento_leitura_tenant_isolation ON central_glp_fechamento_leitura
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform');
