-- Comunicação: avisos e comunicados para todos ou para um inquilino específico
CREATE TABLE IF NOT EXISTS comunicacao (
  id          uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id   uuid        NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  titulo      text        NOT NULL,
  mensagem    text        NOT NULL,
  tipo        text        NOT NULL CHECK (tipo IN ('Informativo', 'Urgente')),
  destinatario text       NOT NULL CHECK (destinatario IN ('todos', 'inquilino')),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comunicacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comunicacao_tenant_isolation ON comunicacao;
CREATE POLICY comunicacao_tenant_isolation ON comunicacao
  USING (
    tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  );

CREATE INDEX IF NOT EXISTS idx_comunicacao_destinatario_data
  ON comunicacao (tenant_id, criado_em DESC);
