-- Story 8.1, 8.2, 8.3, 8.4, 8.5 — Backoffice, Reservas & Compliance

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Cozinha (unidades físicas de plataforma, sem tenant_id, geridas por staff)
CREATE TABLE IF NOT EXISTS cozinha (
  id        uuid        PRIMARY KEY DEFAULT uuidv7(),
  nome      text        NOT NULL,
  equipada  boolean     NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- 2. Reserva (agendamentos por inquilino, com tenant_id, com exclusão de conflitos)
CREATE TABLE IF NOT EXISTS reserva (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id  uuid        NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  cozinha_id uuid        NOT NULL REFERENCES cozinha (id) ON DELETE CASCADE,
  periodo    tstzrange   NOT NULL,
  modalidade text        NOT NULL CHECK (modalidade IN ('turno', 'cafe', 'almoco', 'jantar', 'personalizado', 'dia')),
  criado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reserva_tenant_isolation ON reserva;
CREATE POLICY reserva_tenant_isolation ON reserva
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- 3. Documento (documentos de compliance por inquilino, com referência opcional à cozinha por compatibilidade)
CREATE TABLE IF NOT EXISTS documento (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id  uuid        NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  cozinha_id uuid        NULL REFERENCES cozinha (id) ON DELETE SET NULL,
  tipo       text        NOT NULL,
  arquivo    text        NOT NULL,
  validade   timestamptz NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- 4. AlertaDocumento (alertas ativos de vencimento de documentos)
CREATE TABLE IF NOT EXISTS alerta_documento (
  id           uuid        PRIMARY KEY DEFAULT uuidv7(),
  cozinha_id   uuid        NOT NULL REFERENCES cozinha (id) ON DELETE CASCADE,
  documento_id uuid        NOT NULL REFERENCES documento (id) ON DELETE CASCADE UNIQUE,
  criado_em    timestamptz NOT NULL DEFAULT now()
);
