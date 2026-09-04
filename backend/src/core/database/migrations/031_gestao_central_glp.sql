CREATE TABLE IF NOT EXISTS central_glp_config (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES inquilino (id) ON DELETE CASCADE,
  nome_central text NOT NULL DEFAULT 'Central de GLP',
  capacidade_total_kg numeric(14,3) NOT NULL,
  capacidade_cilindros_kg numeric(14,3) NOT NULL,
  capacidade_por_cilindro_kg numeric(14,3) NOT NULL DEFAULT 0,
  estoque_inicial_kg numeric(14,3) NOT NULL DEFAULT 0,
  estoque_minimo_kg numeric(14,3) NOT NULL DEFAULT 0,
  estoque_critico_kg numeric(14,3) NOT NULL DEFAULT 0,
  unidade_compra text NOT NULL DEFAULT 'kg',
  unidade_medicao text NOT NULL DEFAULT 'm3',
  fator_conversao numeric(14,6) NOT NULL,
  status_central text NOT NULL DEFAULT 'ativa' CHECK (status_central IN ('ativa', 'manutencao', 'inativa')),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS central_glp_abastecimento (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  data date NOT NULL,
  fornecedor text NOT NULL,
  nota_fiscal text,
  quantidade_kg numeric(14,3) NOT NULL CHECK (quantidade_kg > 0),
  quantidade_cilindros numeric(14,3) NOT NULL CHECK (quantidade_cilindros > 0),
  valor_total numeric(14,2) NOT NULL CHECK (valor_total >= 0),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS central_glp_leitura (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  cozinha_id text NOT NULL,
  data date NOT NULL,
  leitura_anterior numeric(14,3) NOT NULL,
  leitura_atual numeric(14,3) NOT NULL CHECK (leitura_atual >= leitura_anterior),
  unidade text NOT NULL DEFAULT 'm3',
  fator_conversao numeric(14,6) NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS central_glp_perda_ajuste (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('perda', 'vazamento', 'erro_medicao', 'ajuste')),
  quantidade_kg numeric(14,3) NOT NULL CHECK (quantidade_kg > 0),
  motivo text NOT NULL,
  data date NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS central_glp_fechamento (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  mes text NOT NULL,
  consumo_total_kg numeric(14,3) NOT NULL,
  custo_periodo numeric(14,2) NOT NULL,
  valor_faturado numeric(14,2) NOT NULL,
  perdas_kg numeric(14,3) NOT NULL,
  saldo_final_kg numeric(14,3) NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, mes)
);

CREATE TABLE IF NOT EXISTS central_glp_fechamento_leitura (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  fechamento_id uuid NOT NULL REFERENCES central_glp_fechamento (id) ON DELETE CASCADE,
  leitura_id uuid NOT NULL REFERENCES central_glp_leitura (id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, fechamento_id, leitura_id)
);

ALTER TABLE central_glp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_glp_config FORCE ROW LEVEL SECURITY;
ALTER TABLE central_glp_abastecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_glp_abastecimento FORCE ROW LEVEL SECURITY;
ALTER TABLE central_glp_leitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_glp_leitura FORCE ROW LEVEL SECURITY;
ALTER TABLE central_glp_perda_ajuste ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_glp_perda_ajuste FORCE ROW LEVEL SECURITY;
ALTER TABLE central_glp_fechamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_glp_fechamento FORCE ROW LEVEL SECURITY;
ALTER TABLE central_glp_fechamento_leitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_glp_fechamento_leitura FORCE ROW LEVEL SECURITY;

CREATE POLICY central_glp_config_tenant_isolation ON central_glp_config
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform');
CREATE POLICY central_glp_abastecimento_tenant_isolation ON central_glp_abastecimento
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform');
CREATE POLICY central_glp_leitura_tenant_isolation ON central_glp_leitura
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform');
CREATE POLICY central_glp_perda_ajuste_tenant_isolation ON central_glp_perda_ajuste
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform');
CREATE POLICY central_glp_fechamento_tenant_isolation ON central_glp_fechamento
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform');
CREATE POLICY central_glp_fechamento_leitura_tenant_isolation ON central_glp_fechamento_leitura
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR current_setting('app.scope', true) = 'platform');