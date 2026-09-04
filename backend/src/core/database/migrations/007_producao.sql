-- Story 4.1 — Registro de Produção (FR-14).
-- Apenas o registro do que foi produzido (data + quantidade por Ficha).
-- A baixa de estoque associada é tratada em 4.2 (automática) / 4.3 (manual);
-- por isso esta migration NÃO movimenta o ledger.

CREATE TABLE IF NOT EXISTS producao (
  id          uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id   uuid        NOT NULL,
  -- nullable: produção avulsa "sem ficha" não baixa estoque (4.2 AC#3).
  ficha_id    uuid        REFERENCES ficha (id) ON DELETE RESTRICT,
  -- quantidade produzida em nº de porções (inteiro, sem float).
  quantidade  bigint      NOT NULL CHECK (quantidade > 0),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS producao_tenant_isolation ON producao;
CREATE POLICY producao_tenant_isolation ON producao
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
