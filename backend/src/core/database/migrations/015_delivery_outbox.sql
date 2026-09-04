-- Migration: Outbox de delivery (Story 7.4 — AD-7, AD-8, FR-22, NFR-2)
-- Caminho de SAÍDA: uma transição de status de um Pedido de delivery enfileira
-- aqui uma mensagem; o OutboxWorker drena e envia ao provedor via adapter (ACL),
-- com retry durável. Nunca chamar o provedor de forma síncrona na transição.
--
-- Invariantes:
--  - tenant_id uuid + RLS forçada no GUC canônico app.tenant_id (AD-1).
--  - AC#3 idempotência: UNIQUE(tenant_id, dedup_key) evita enfileirar a mesma
--    transição duas vezes; cada linha é enviada uma única vez (PENDING→SENT).
--  - AC#4 resiliência: attempts permite retry com teto antes de FAILED.

CREATE TABLE IF NOT EXISTS delivery_outbox (
  id            uuid         PRIMARY KEY DEFAULT uuidv7(),
  tenant_id     uuid         NOT NULL REFERENCES inquilino(id) ON DELETE CASCADE,
  pedido_id     uuid         NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  provider      varchar(50)  NOT NULL,
  origem_id     varchar(255) NOT NULL,   -- id do pedido na origem (iFood/99Food)
  status        varchar(50)  NOT NULL,   -- status a refletir na origem
  dedup_key     varchar(255) NOT NULL,   -- p.ex. "<pedido_id>:<status>"
  status_envio  varchar(20)  NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | FAILED
  attempts      integer      NOT NULL DEFAULT 0,
  error_message text,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  sent_at       timestamptz,

  CONSTRAINT delivery_outbox_dedup_uq UNIQUE (tenant_id, dedup_key)
);

CREATE INDEX IF NOT EXISTS delivery_outbox_pendentes
  ON delivery_outbox (created_at)
  WHERE status_envio = 'PENDING';

ALTER TABLE delivery_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_outbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_outbox_tenant_isolation ON delivery_outbox;
CREATE POLICY delivery_outbox_tenant_isolation ON delivery_outbox
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform');
