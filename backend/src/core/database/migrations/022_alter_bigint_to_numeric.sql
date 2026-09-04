-- Migration: Alterar quantidades de bigint para numeric e remover escala
ALTER TABLE insumo DROP COLUMN IF EXISTS escala CASCADE;
ALTER TABLE insumo ALTER COLUMN estoque_minimo TYPE numeric;
ALTER TABLE movimento_estoque ALTER COLUMN quantidade TYPE numeric;
ALTER TABLE ficha_item ALTER COLUMN quantidade TYPE numeric;
ALTER TABLE producao ALTER COLUMN quantidade TYPE numeric;
