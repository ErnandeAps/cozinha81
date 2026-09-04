-- Story 1.3 — Realm de plataforma + provisionamento de Inquilino.
-- Tabelas de Usuário/Módulo (tenant-scoped) e Staff/Auditoria (plataforma),
-- e extensão das policies para reconhecer scope=platform (AD-14).

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers de RLS por convenção:
--   READ  (USING):       tenant próprio OU staff de plataforma (cross-tenant).
--   WRITE (WITH CHECK):   somente o tenant setado explicitamente.
-- Escrita cross-tenant nunca é implícita — o staff seta o tenant alvo por
-- operação (runWithTenant) e a escrita cai no caminho tenant comum.
-- ─────────────────────────────────────────────────────────────────────────────

-- Inquilino: staff passa a poder LER cross-tenant (continua sem escrever sem contexto).
DROP POLICY IF EXISTS inquilino_tenant_isolation ON inquilino;
CREATE POLICY inquilino_tenant_isolation ON inquilino
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Usuário de Inquilino (Dono/Admin, Operador) — tenant-scoped.
CREATE TABLE IF NOT EXISTS usuario (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id  uuid        NOT NULL,
  email      text        NOT NULL,
  nome       text        NOT NULL,
  papel      text        NOT NULL CHECK (papel IN ('dono_admin', 'operador')),
  -- 'pendente' até definir senha via convite/login (Stories 1.4/1.5).
  status     text        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo')),
  senha_hash text,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usuario_tenant_isolation ON usuario;
CREATE POLICY usuario_tenant_isolation ON usuario
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Flags de Módulo por Inquilino (AD-3: backoffice é dono).
CREATE TABLE IF NOT EXISTS modulo_flag (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id  uuid        NOT NULL,
  modulo     text        NOT NULL CHECK (modulo IN ('gestao_cozinha', 'pedidos_kds')),
  habilitado boolean     NOT NULL DEFAULT false,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, modulo)
);
ALTER TABLE modulo_flag ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_flag FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modulo_flag_tenant_isolation ON modulo_flag;
CREATE POLICY modulo_flag_tenant_isolation ON modulo_flag
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realm de plataforma (AD-14): tabelas NÃO tenant-scoped, sem RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- Staff Cozinha81 — principal de plataforma, sem tenant_id.
CREATE TABLE IF NOT EXISTS staff (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  email      text        NOT NULL UNIQUE,
  nome       text        NOT NULL,
  senha_hash text        NOT NULL,
  papel      text        NOT NULL DEFAULT 'staff',
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Trilha de auditoria do provisionamento (quem, quando, qual tenant) — AC-3.
CREATE TABLE IF NOT EXISTS provisionamento_audit (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id  uuid        NOT NULL,
  staff_id   uuid        NOT NULL REFERENCES staff (id),
  acao       text        NOT NULL DEFAULT 'provisionar_inquilino',
  detalhes   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
