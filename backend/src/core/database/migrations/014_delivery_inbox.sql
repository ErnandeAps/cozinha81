-- Migration: Inbox de delivery (Story 7.3 — AD-7, AD-1, FR-21, NFR-4)
-- Trilha durável: todo webhook é persistido aqui ANTES de processar; o worker
-- consome em ordem de chegada e cria o Pedido via ACL.
--
-- Invariantes:
--  - tenant_id uuid + RLS forçada no GUC canônico app.tenant_id (AD-1). O webhook
--    grava via withTenant (app.tenant_id); o worker lê/atualiza via withPlatform
--    (app.scope='platform'). Por isso USING e WITH CHECK aceitam ambos.
--  - AC#4: dedup de reentrega por UNIQUE(tenant_id, provider, provider_event_id).
--  - NFR-4/AC#3: attempts permite reprocessamento com teto antes de marcar FAILED.

CREATE TABLE IF NOT EXISTS delivery_inbox (
  id                uuid         PRIMARY KEY DEFAULT uuidv7(),
  tenant_id         uuid         NOT NULL REFERENCES inquilino(id) ON DELETE CASCADE,
  provider          varchar(50)  NOT NULL,
  provider_event_id varchar(255) NOT NULL,
  payload           jsonb        NOT NULL,
  status            varchar(20)  NOT NULL DEFAULT 'PENDING', -- PENDING | PROCESSED | FAILED
  attempts          integer      NOT NULL DEFAULT 0,
  error_message     text,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now(),
  processed_at      timestamptz,

  CONSTRAINT delivery_inbox_evento_uq UNIQUE (tenant_id, provider, provider_event_id)
);

ALTER TABLE delivery_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_inbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_inbox_tenant_isolation ON delivery_inbox;
CREATE POLICY delivery_inbox_tenant_isolation ON delivery_inbox
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform');

-- origem_id liga o Pedido interno ao id externo do provedor (iFood/99Food).
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS origem_id varchar(255);

-- AC#4: idempotência de ingestão — no máximo um Pedido por (tenant, origem, id externo).
-- Pedidos manuais têm origem_id NULL e ficam fora do índice (NULLs distintos).
-- Serve também aos lookups por (tenant_id, origem, origem_id) do worker.
CREATE UNIQUE INDEX IF NOT EXISTS pedido_origem_uq
  ON pedido (tenant_id, origem, origem_id)
  WHERE origem_id IS NOT NULL;
