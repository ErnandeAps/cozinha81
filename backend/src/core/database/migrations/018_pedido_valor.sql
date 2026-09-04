-- Migration: Pedido Valor Centavos
-- Story 7.7 (FR-29)

ALTER TABLE pedido ADD COLUMN valor_centavos bigint NOT NULL DEFAULT 0;
