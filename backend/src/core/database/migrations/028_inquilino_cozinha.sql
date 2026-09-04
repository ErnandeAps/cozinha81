-- Story 8 / cadastro de inquilinos: seleciona a cozinha associada ao tenant.
ALTER TABLE inquilino
  ADD COLUMN IF NOT EXISTS cozinha_id uuid NULL REFERENCES cozinha (id) ON DELETE SET NULL;
