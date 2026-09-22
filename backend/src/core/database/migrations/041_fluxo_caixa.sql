-- Fluxo de caixa: registros de entrada/saída e recebimento de faturas
CREATE TABLE IF NOT EXISTS fluxo_caixa_lancamento (
  id              uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id       uuid        NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  tipo            text        NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao       text        NOT NULL,
  valor           integer     NOT NULL CHECK (valor >= 0), -- Em centavos
  data_lancamento timestamptz NOT NULL DEFAULT now(),
  origem          text        NOT NULL CHECK (origem IN ('manual', 'fatura')),
  fatura_id       uuid        NULL REFERENCES fatura (id) ON DELETE SET NULL,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fluxo_caixa_lancamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo_caixa_lancamento FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fluxo_caixa_lancamento_tenant_isolation ON fluxo_caixa_lancamento;
CREATE POLICY fluxo_caixa_lancamento_tenant_isolation ON fluxo_caixa_lancamento
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  );

CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_lancamento_tenant_data
  ON fluxo_caixa_lancamento (tenant_id, data_lancamento DESC);

CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_lancamento_fatura
  ON fluxo_caixa_lancamento (fatura_id);
