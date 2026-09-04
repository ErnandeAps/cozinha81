-- Migration: Generaliza o outbox de delivery (Story 7.5 — FR-26, AD-7/AD-8)
-- Além de sincronizar status de Pedido, o outbox passa a carregar mensagens de
-- disponibilidade da loja (pausar/retomar recebimento), refletidas na origem
-- pelo OutboxWorker via adapter (pauseReceiving/resumeReceiving).

-- Mensagens de pausa/retomada não têm Pedido associado nem id de pedido externo.
ALTER TABLE delivery_outbox ALTER COLUMN pedido_id DROP NOT NULL;
ALTER TABLE delivery_outbox ALTER COLUMN origem_id DROP NOT NULL;

-- tipo: 'status' (transição de Pedido), 'pausa' ou 'retomada' (loja).
ALTER TABLE delivery_outbox ADD COLUMN IF NOT EXISTS tipo varchar(20) NOT NULL DEFAULT 'status';
