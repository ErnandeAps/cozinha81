-- Atualiza as modalidades válidas da reserva para refletir o front atual.
-- Permite: turno, cafe, almoco, jantar, personalizado, dia.

ALTER TABLE reserva
  DROP CONSTRAINT IF EXISTS reserva_modalidade_check;

ALTER TABLE reserva
  ADD CONSTRAINT reserva_modalidade_check
  CHECK (modalidade IN ('turno', 'cafe', 'almoco', 'jantar', 'personalizado', 'dia'));
