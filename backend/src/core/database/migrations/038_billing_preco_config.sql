-- Story 10.x — tabela de preços de faturamento persistidos no banco
-- Permite sobrescrever o padrão global por tenant sem quebrar a lógica atual.
CREATE TABLE IF NOT EXISTS billing_preco_config (
  id             uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id      uuid        REFERENCES inquilino (id) ON DELETE CASCADE,
  categoria      text        NOT NULL CHECK (categoria IN ('aluguel', 'modulo', 'gas')),
  chave          text        NOT NULL,
  valor_centavos integer     NOT NULL CHECK (valor_centavos >= 0),
  ativo          boolean     NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, categoria, chave)
);

ALTER TABLE billing_preco_config DROP CONSTRAINT IF EXISTS billing_preco_config_categoria_check;
ALTER TABLE billing_preco_config
  ADD CONSTRAINT billing_preco_config_categoria_check
  CHECK (categoria IN ('aluguel', 'modulo', 'gas'));

ALTER TABLE billing_preco_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_preco_config FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_preco_config_tenant_isolation ON billing_preco_config;
CREATE POLICY billing_preco_config_tenant_isolation ON billing_preco_config
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR tenant_id IS NULL
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR tenant_id IS NULL
    OR current_setting('app.scope', true) = 'platform'
  );

INSERT INTO billing_preco_config (tenant_id, categoria, chave, valor_centavos, ativo)
VALUES
  (NULL, 'aluguel', 'turno', 15_000, true),
  (NULL, 'aluguel', 'cafe', 20_000, true),
  (NULL, 'aluguel', 'almoco', 30_000, true),
  (NULL, 'aluguel', 'jantar', 35_000, true),
  (NULL, 'aluguel', 'personalizado', 45_000, true),
  (NULL, 'aluguel', 'dia', 50_000, true),
  (NULL, 'aluguel', 'semana', 300_000, true),
  (NULL, 'aluguel', 'mes', 1_000_000, true),
  (NULL, 'modulo', 'gestao_cozinha', 20_000, true),
  (NULL, 'modulo', 'pedidos_kds', 10_000, true),
  (NULL, 'gas', 'm3', 300, true)
ON CONFLICT (tenant_id, categoria, chave) DO NOTHING;
