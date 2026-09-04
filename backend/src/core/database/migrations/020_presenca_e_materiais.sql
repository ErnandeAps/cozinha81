-- Story 9.1, 9.2, 9.3 — Presença, Checklist e Ledger de Materiais

-- 1. Presença (Registro de entrada/saída de inquilinos, com checklist opcional)
CREATE TABLE IF NOT EXISTS presenca (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  cozinha_id uuid        NOT NULL REFERENCES cozinha (id) ON DELETE CASCADE,
  tenant_id  uuid        REFERENCES inquilino (id) ON DELETE SET NULL,
  tipo       text        NOT NULL CHECK (tipo IN ('in', 'out')),
  checklist  jsonb,      -- Estrutura: { limpeza: boolean, equipamento: boolean, observacoes: text }
  criado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenca FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presenca_tenant_isolation ON presenca;
CREATE POLICY presenca_tenant_isolation ON presenca
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  );

-- 2. Material (Cadastro de materiais fornecidos de plataforma)
CREATE TABLE IF NOT EXISTS material (
  id        uuid        PRIMARY KEY DEFAULT uuidv7(),
  nome      text        NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- 3. MaterialMovimento (Ledger append-only de movimentação de materiais)
CREATE TABLE IF NOT EXISTS material_movimento (
  id             uuid        PRIMARY KEY DEFAULT uuidv7(),
  material_id    uuid        NOT NULL REFERENCES material (id) ON DELETE CASCADE,
  tenant_id      uuid        REFERENCES inquilino (id) ON DELETE SET NULL, -- Se for consumo por inquilino
  tipo           text        NOT NULL CHECK (tipo IN ('entrada', 'consumo')),
  quantidade     integer     NOT NULL CHECK (quantidade > 0),
  valor_unitario integer     NOT NULL DEFAULT 0, -- Em centavos (relevante se tipo = 'consumo')
  criado_por     uuid,       -- ID do staff que registrou
  criado_em      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE material_movimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_movimento FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS material_movimento_tenant_isolation ON material_movimento;
CREATE POLICY material_movimento_tenant_isolation ON material_movimento
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  );
