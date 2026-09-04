ALTER TABLE central_glp_config
  ADD COLUMN IF NOT EXISTS nome_central text NOT NULL DEFAULT 'Central de GLP',
  ADD COLUMN IF NOT EXISTS capacidade_total_kg numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacidade_cilindros_kg numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacidade_por_cilindro_kg numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_inicial_kg numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo_kg numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_critico_kg numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unidade_compra text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS unidade_medicao text NOT NULL DEFAULT 'm3',
  ADD COLUMN IF NOT EXISTS fator_conversao numeric(14,6) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status_central text NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

ALTER TABLE central_glp_config
  ALTER COLUMN nome_central SET DEFAULT 'Central de GLP',
  ALTER COLUMN capacidade_total_kg SET DEFAULT 0,
  ALTER COLUMN capacidade_cilindros_kg SET DEFAULT 0,
  ALTER COLUMN capacidade_por_cilindro_kg SET DEFAULT 0,
  ALTER COLUMN estoque_inicial_kg SET DEFAULT 0,
  ALTER COLUMN estoque_minimo_kg SET DEFAULT 0,
  ALTER COLUMN estoque_critico_kg SET DEFAULT 0,
  ALTER COLUMN unidade_compra SET DEFAULT 'kg',
  ALTER COLUMN unidade_medicao SET DEFAULT 'm3',
  ALTER COLUMN fator_conversao SET DEFAULT 1,
  ALTER COLUMN status_central SET DEFAULT 'ativa';

ALTER TABLE central_glp_config
  DROP CONSTRAINT IF EXISTS central_glp_config_status_central_check;

ALTER TABLE central_glp_config
  ADD CONSTRAINT central_glp_config_status_central_check
  CHECK (status_central IN ('ativa', 'manutencao', 'inativa'))
  NOT VALID;
