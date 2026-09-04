-- Story 10.1, 10.2, 10.3 — Faturamento, Cobranças e Extras

-- 1. Fatura (Controle financeiro do inquilino)
CREATE TABLE IF NOT EXISTS fatura (
  id             uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id      uuid        NOT NULL REFERENCES inquilino (id) ON DELETE CASCADE,
  periodo_inicio timestamptz NOT NULL,
  periodo_fim    timestamptz NOT NULL,
  status         text        NOT NULL CHECK (status IN ('aberta', 'paga', 'vencida', 'cancelada')),
  valor_total    integer     NOT NULL DEFAULT 0 CHECK (valor_total >= 0), -- Em centavos
  criado_em      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fatura ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatura FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fatura_tenant_isolation ON fatura;
CREATE POLICY fatura_tenant_isolation ON fatura
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  );

-- 2. FaturaItem (Detalhamento dos lançamentos da fatura)
CREATE TABLE IF NOT EXISTS fatura_item (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  fatura_id  uuid        NOT NULL REFERENCES fatura (id) ON DELETE CASCADE,
  tipo       text        NOT NULL CHECK (tipo IN ('aluguel', 'modulo', 'consumo_material', 'hora_extra', 'multa')),
  descricao  text        NOT NULL,
  valor      integer     NOT NULL CHECK (valor >= 0), -- Em centavos
  origem_id  uuid,       -- Rastreabilidade (ID de reserva, modulo_flag, ou material_movimento)
  criado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fatura_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatura_item FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fatura_item_tenant_isolation ON fatura_item;
CREATE POLICY fatura_item_tenant_isolation ON fatura_item
  USING (
    EXISTS (
      SELECT 1 FROM fatura f
      WHERE f.id = fatura_id
        AND (
          f.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
          OR current_setting('app.scope', true) = 'platform'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fatura f
      WHERE f.id = fatura_id
        AND (
          f.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
          OR current_setting('app.scope', true) = 'platform'
        )
    )
  );
