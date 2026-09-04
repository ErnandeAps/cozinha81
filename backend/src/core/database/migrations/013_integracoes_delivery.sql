-- Migration: Integrações de delivery (Story 7.2 — FR-19/FR-20/FR-23)
-- Conexão de conta de loja (iFood/99Food) por Cozinha.
--
-- Invariantes:
--  - tenant_id uuid + RLS forçada no GUC canônico app.tenant_id (AD-1), igual às
--    migrations 001–009. NÃO usar app.current_tenant (GUC inexistente em runtime).
--  - AC #23 (FR-23): UMA marca/acesso de delivery por Cozinha por vez no v1
--    => UNIQUE(tenant_id). O provider pode trocar após desconectar.
--  - Credenciais ficam cifradas em credentials_encrypted (AC #5); nunca em claro.

CREATE TABLE IF NOT EXISTS integracoes_delivery (
  id                    uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id             uuid        NOT NULL REFERENCES inquilino(id) ON DELETE CASCADE,
  provider              varchar(50) NOT NULL,        -- 'ifood' | '99food'
  store_id              varchar(100),                -- id da loja na origem
  credentials_encrypted text        NOT NULL,        -- segredo cifrado (AES-256-GCM)
  status                varchar(50) NOT NULL DEFAULT 'ativo',
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),

  -- FR-23: no máximo UMA conexão de delivery por Cozinha por vez (v1).
  CONSTRAINT integracoes_delivery_tenant_uq UNIQUE (tenant_id)
);

-- RLS habilitada E forçada (vale inclusive para o owner). O app conecta como
-- papel não-privilegiado (cozinha_app, NOBYPASSRLS); platform scope lê cross-tenant.
ALTER TABLE integracoes_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracoes_delivery FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integracoes_delivery_tenant_isolation ON integracoes_delivery;
CREATE POLICY integracoes_delivery_tenant_isolation ON integracoes_delivery
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
