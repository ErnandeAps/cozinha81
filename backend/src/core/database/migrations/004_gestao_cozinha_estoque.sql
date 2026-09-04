-- Story 2.1, 2.2, 2.3, 2.4, 2.5 — Gestão de Estoque

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Insumo (Cadastro de insumos, unidades de medida e modelo de conversão)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insumo (
  id              uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id       uuid        NOT NULL,
  nome            text        NOT NULL,
  unidade_base    text        NOT NULL,
  escala          integer     NOT NULL DEFAULT 0,
  estoque_minimo  bigint,
  lote_validade   boolean     NOT NULL DEFAULT false,
  -- Modelo de conversão (Story 2.5)
  unidade_uso     text,
  fator_conversao numeric,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

ALTER TABLE insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insumo_tenant_isolation ON insumo;
CREATE POLICY insumo_tenant_isolation ON insumo
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. MovimentoEstoque (Ledger de movimentos de estoque append-only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimento_estoque (
  id             uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id      uuid        NOT NULL,
  insumo_id      uuid        NOT NULL REFERENCES insumo (id) ON DELETE CASCADE,
  tipo           text        NOT NULL CHECK (tipo IN ('entrada', 'baixa', 'perda', 'estorno')),
  quantidade     bigint      NOT NULL,
  preco_centavos bigint,
  lote           text,
  validade       timestamptz,
  cause_key      uuid        NOT NULL,
  motivo         text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cause_key)
);

ALTER TABLE movimento_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimento_estoque FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS movimento_estoque_tenant_isolation ON movimento_estoque;
CREATE POLICY movimento_estoque_tenant_isolation ON movimento_estoque
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AlertaEstoque (Alertas ativos de estoque mínimo)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerta_estoque (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id  uuid        NOT NULL,
  insumo_id  uuid        NOT NULL REFERENCES insumo (id) ON DELETE CASCADE,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, insumo_id)
);

ALTER TABLE alerta_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerta_estoque FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alerta_estoque_tenant_isolation ON alerta_estoque;
CREATE POLICY alerta_estoque_tenant_isolation ON alerta_estoque
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
