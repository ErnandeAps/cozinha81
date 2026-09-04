-- Garante que a tabela central_glp_config tenha todas as colunas necessárias
-- para o cadastro da central de GLP e para a gravação via service.

CREATE TABLE IF NOT EXISTS central_glp_config (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES inquilino (id) ON DELETE CASCADE,
  nome_central text NOT NULL DEFAULT 'Central de GLP',
  capacidade_total_kg numeric(14,3) NOT NULL DEFAULT 0,
  capacidade_cilindros_kg numeric(14,3) NOT NULL DEFAULT 0,
  capacidade_por_cilindro_kg numeric(14,3) NOT NULL DEFAULT 0,
  estoque_inicial_kg numeric(14,3) NOT NULL DEFAULT 0,
  estoque_minimo_kg numeric(14,3) NOT NULL DEFAULT 0,
  estoque_critico_kg numeric(14,3) NOT NULL DEFAULT 0,
  valor_unitario_kg_fornecedor numeric(14,2) NOT NULL DEFAULT 0,
  valor_unitario_kg_inquilino numeric(14,2) NOT NULL DEFAULT 0,
  unidade_compra text NOT NULL DEFAULT 'kg',
  unidade_medicao text NOT NULL DEFAULT 'm3',
  fator_conversao numeric(14,6) NOT NULL DEFAULT 1,
  status_central text NOT NULL DEFAULT 'ativa',
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE central_glp_config
  ADD COLUMN IF NOT EXISTS nome_central text,
  ADD COLUMN IF NOT EXISTS capacidade_total_kg numeric(14,3),
  ADD COLUMN IF NOT EXISTS capacidade_cilindros_kg numeric(14,3),
  ADD COLUMN IF NOT EXISTS capacidade_por_cilindro_kg numeric(14,3),
  ADD COLUMN IF NOT EXISTS estoque_inicial_kg numeric(14,3),
  ADD COLUMN IF NOT EXISTS estoque_minimo_kg numeric(14,3),
  ADD COLUMN IF NOT EXISTS estoque_critico_kg numeric(14,3),
  ADD COLUMN IF NOT EXISTS valor_unitario_kg_fornecedor numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_unitario_kg_inquilino numeric(14,2),
  ADD COLUMN IF NOT EXISTS unidade_compra text,
  ADD COLUMN IF NOT EXISTS unidade_medicao text,
  ADD COLUMN IF NOT EXISTS fator_conversao numeric(14,6),
  ADD COLUMN IF NOT EXISTS status_central text,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz;

UPDATE central_glp_config
SET
  nome_central = COALESCE(nome_central, 'Central de GLP'),
  capacidade_total_kg = COALESCE(capacidade_total_kg, 0),
  capacidade_cilindros_kg = COALESCE(capacidade_cilindros_kg, 0),
  capacidade_por_cilindro_kg = COALESCE(capacidade_por_cilindro_kg, 0),
  estoque_inicial_kg = COALESCE(estoque_inicial_kg, 0),
  estoque_minimo_kg = COALESCE(estoque_minimo_kg, 0),
  estoque_critico_kg = COALESCE(estoque_critico_kg, 0),
  valor_unitario_kg_fornecedor = COALESCE(valor_unitario_kg_fornecedor, 0),
  valor_unitario_kg_inquilino = COALESCE(valor_unitario_kg_inquilino, 0),
  unidade_compra = COALESCE(unidade_compra, 'kg'),
  unidade_medicao = COALESCE(unidade_medicao, 'm3'),
  fator_conversao = COALESCE(fator_conversao, 1),
  status_central = COALESCE(status_central, 'ativa'),
  atualizado_em = COALESCE(atualizado_em, now())
WHERE tenant_id IS NOT NULL;

ALTER TABLE central_glp_config
  ALTER COLUMN nome_central SET DEFAULT 'Central de GLP',
  ALTER COLUMN capacidade_total_kg SET DEFAULT 0,
  ALTER COLUMN capacidade_cilindros_kg SET DEFAULT 0,
  ALTER COLUMN capacidade_por_cilindro_kg SET DEFAULT 0,
  ALTER COLUMN estoque_inicial_kg SET DEFAULT 0,
  ALTER COLUMN estoque_minimo_kg SET DEFAULT 0,
  ALTER COLUMN estoque_critico_kg SET DEFAULT 0,
  ALTER COLUMN valor_unitario_kg_fornecedor SET DEFAULT 0,
  ALTER COLUMN valor_unitario_kg_inquilino SET DEFAULT 0,
  ALTER COLUMN unidade_compra SET DEFAULT 'kg',
  ALTER COLUMN unidade_medicao SET DEFAULT 'm3',
  ALTER COLUMN fator_conversao SET DEFAULT 1,
  ALTER COLUMN status_central SET DEFAULT 'ativa',
  ALTER COLUMN atualizado_em SET DEFAULT now();

ALTER TABLE central_glp_config
  ALTER COLUMN nome_central SET NOT NULL,
  ALTER COLUMN capacidade_total_kg SET NOT NULL,
  ALTER COLUMN capacidade_cilindros_kg SET NOT NULL,
  ALTER COLUMN capacidade_por_cilindro_kg SET NOT NULL,
  ALTER COLUMN estoque_inicial_kg SET NOT NULL,
  ALTER COLUMN estoque_minimo_kg SET NOT NULL,
  ALTER COLUMN estoque_critico_kg SET NOT NULL,
  ALTER COLUMN valor_unitario_kg_fornecedor SET NOT NULL,
  ALTER COLUMN valor_unitario_kg_inquilino SET NOT NULL,
  ALTER COLUMN unidade_compra SET NOT NULL,
  ALTER COLUMN unidade_medicao SET NOT NULL,
  ALTER COLUMN fator_conversao SET NOT NULL,
  ALTER COLUMN status_central SET NOT NULL,
  ALTER COLUMN atualizado_em SET NOT NULL;

ALTER TABLE central_glp_config
  DROP CONSTRAINT IF EXISTS central_glp_config_status_central_check;

ALTER TABLE central_glp_config
  ADD CONSTRAINT central_glp_config_status_central_check
  CHECK (status_central IN ('ativa', 'manutencao', 'inativa')); 
