-- Adiciona colunas de tamanho e status para a tabela de cozinhas.
ALTER TABLE cozinha
  ADD COLUMN IF NOT EXISTS area_m2 bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'interditada';

UPDATE cozinha
SET status = CASE
  WHEN equipada = true THEN 'liberada'
  ELSE 'interditada'
END
WHERE status IS NULL OR status NOT IN ('liberada', 'interditada');

ALTER TABLE cozinha
  DROP CONSTRAINT IF EXISTS cozinha_status_check;

ALTER TABLE cozinha
  ADD CONSTRAINT cozinha_status_check
  CHECK (status IN ('liberada', 'interditada'));
