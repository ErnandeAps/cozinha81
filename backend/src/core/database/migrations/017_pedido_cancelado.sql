-- Migration: Marcador de cancelamento p/ reconciliação de estoque (Story 7.6 — AD-13)
-- O `gestao-cozinha` (dono do ledger) registra aqui que um Pedido foi cancelado.
-- Com o marcador, uma baixa que drena DEPOIS do cancelamento (fora de ordem) é
-- compensada imediatamente — reconciliação por invariante, sem happens-before.
-- pedido_id é guardado como uuid simples (sem FK ao `pedido`): é um estado próprio
-- de reconciliação, independente do ciclo de vida do Pedido e da fronteira de módulo.

CREATE TABLE IF NOT EXISTS pedido_cancelado (
  tenant_id uuid        NOT NULL REFERENCES inquilino(id) ON DELETE CASCADE,
  pedido_id uuid        NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, pedido_id)
);

ALTER TABLE pedido_cancelado ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_cancelado FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedido_cancelado_tenant_isolation ON pedido_cancelado;
CREATE POLICY pedido_cancelado_tenant_isolation ON pedido_cancelado
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
