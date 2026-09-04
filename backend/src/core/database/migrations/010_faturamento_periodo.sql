-- Story 5.3 — Faturamento do período p/ CMV% (FR-18). Fase 1: manual e bruto.
-- Modelado por `origem` para o Épico 7 (story 7.7) injetar o automático com
-- PRECEDÊNCIA sobre o manual — nunca somados (AD-10). A PK inclui `origem`,
-- então as duas origens coexistem e a leitura resolve por precedência.

CREATE TABLE IF NOT EXISTS faturamento_periodo (
  tenant_id      uuid        NOT NULL,
  competencia    text        NOT NULL CHECK (competencia ~ '^\d{4}-\d{2}$'),
  origem         text        NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'pedidos')),
  -- faturamento BRUTO em centavos (comissões de canal NÃO descontadas — FR-18).
  valor_centavos bigint      NOT NULL CHECK (valor_centavos >= 0),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, competencia, origem)
);

ALTER TABLE faturamento_periodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_periodo FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faturamento_periodo_tenant_isolation ON faturamento_periodo;
CREATE POLICY faturamento_periodo_tenant_isolation ON faturamento_periodo
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
