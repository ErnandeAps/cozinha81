CREATE TABLE IF NOT EXISTS centro_custo (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  cozinha_id uuid NOT NULL UNIQUE REFERENCES cozinha(id) ON DELETE CASCADE,
  nome_cozinha text NOT NULL DEFAULT '',
  investimento_inicial bigint NOT NULL DEFAULT 0,
  prazo_contrato_meses integer NOT NULL DEFAULT 0,
  custos_fixos_mensais bigint NOT NULL DEFAULT 0,
  roi_desejado numeric(10,2) NOT NULL DEFAULT 0,
  reserva_manutencao bigint NOT NULL DEFAULT 0,
  aluguel_mensal bigint NOT NULL DEFAULT 0,
  margem numeric(10,2) NOT NULL DEFAULT 0,
  taxa_administracao bigint NOT NULL DEFAULT 0,
  area_m2 bigint NOT NULL DEFAULT 0,
  equipamentos bigint NOT NULL DEFAULT 0,
  servicos bigint NOT NULL DEFAULT 0,
  condominio bigint NOT NULL DEFAULT 0,
  seguranca bigint NOT NULL DEFAULT 0,
  manutencao bigint NOT NULL DEFAULT 0,
  outros bigint NOT NULL DEFAULT 0,
  equipamentos_detalhes jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE centro_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE centro_custo FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS centro_custo_platform_access ON centro_custo;
CREATE POLICY centro_custo_platform_access ON centro_custo
  USING (current_setting('app.scope', true) = 'platform')
  WITH CHECK (current_setting('app.scope', true) = 'platform');
