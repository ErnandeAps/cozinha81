-- Story 3.2 — Ficha Técnica por porção (FR-11, AD-10). Sub-receitas: Story 3.3.
-- Custo é derivado ON-READ (nunca persistido). Quantidades inteiras (sem float).

CREATE TABLE IF NOT EXISTS ficha (
  id                 uuid        PRIMARY KEY DEFAULT uuidv7(),
  tenant_id          uuid        NOT NULL,
  nome               text        NOT NULL,
  -- quantas porções as quantidades dos itens rendem (custo/porção = total/rendimento).
  rendimento_porcoes integer     NOT NULL DEFAULT 1 CHECK (rendimento_porcoes >= 1),
  criado_em          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

ALTER TABLE ficha ENABLE ROW LEVEL SECURITY;
ALTER TABLE ficha FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ficha_tenant_isolation ON ficha;
CREATE POLICY ficha_tenant_isolation ON ficha
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS ficha_item (
  id           uuid    PRIMARY KEY DEFAULT uuidv7(),
  tenant_id    uuid    NOT NULL,
  ficha_id     uuid    NOT NULL REFERENCES ficha (id) ON DELETE CASCADE,
  -- exatamente UM componente: Insumo OU sub-Ficha (Story 3.3).
  insumo_id    uuid    REFERENCES insumo (id) ON DELETE RESTRICT,
  sub_ficha_id uuid    REFERENCES ficha (id) ON DELETE RESTRICT,
  -- insumo: quantidade em unidade-base escalada (inteiro, igual ao ledger).
  -- sub-ficha: nº de porções × 1000 (mili-porção, escala 3).
  quantidade   bigint  NOT NULL CHECK (quantidade > 0),
  criado_em    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ficha_item_um_componente CHECK (
    (insumo_id IS NOT NULL AND sub_ficha_id IS NULL)
    OR (insumo_id IS NULL AND sub_ficha_id IS NOT NULL)
  )
);

ALTER TABLE ficha_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE ficha_item FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ficha_item_tenant_isolation ON ficha_item;
CREATE POLICY ficha_item_tenant_isolation ON ficha_item
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
