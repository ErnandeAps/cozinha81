-- Remove a restrição de exclusão que bloqueia sobreposição de reservas na mesma cozinha.
ALTER TABLE reserva DROP CONSTRAINT IF EXISTS no_overbooking;
