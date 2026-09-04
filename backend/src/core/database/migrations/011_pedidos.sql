-- Migration: Pedidos
-- Story 6.2 (FR-28)

CREATE TABLE pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES inquilino(id) ON DELETE CASCADE,
  numero serial NOT NULL,
  origem varchar(50) NOT NULL, -- 'Manual', 'iFood', '99Food'
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pedido_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES inquilino(id) ON DELETE CASCADE,
  pedido_id uuid NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  status varchar(50) NOT NULL,
  alterado_em timestamptz NOT NULL DEFAULT now()
);

-- RLS setup (GUC canônico app.tenant_id + FORCE; corrigido na Story 7.3 —
-- antes usava app.current_tenant, inexistente em runtime, o que fazia a policy
-- lançar "unrecognized configuration parameter" em toda escrita do papel runtime).
ALTER TABLE pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido FORCE ROW LEVEL SECURITY;
ALTER TABLE pedido_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_status FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedido_tenant_isolation ON pedido;
CREATE POLICY pedido_tenant_isolation ON pedido
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS pedido_status_tenant_isolation ON pedido_status;
CREATE POLICY pedido_status_tenant_isolation ON pedido_status
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
              OR current_setting('app.scope', true) = 'platform')
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
