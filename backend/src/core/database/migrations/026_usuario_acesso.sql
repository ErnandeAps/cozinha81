CREATE TABLE IF NOT EXISTS usuario_acesso (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  app text NOT NULL CHECK (app IN ('portal', 'backoffice')),
  papel text NOT NULL CHECK (papel IN ('admin', 'gestor', 'operador', 'cozinha')),
  ativo boolean NOT NULL DEFAULT true,
  permissoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE usuario_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_acesso FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuario_acesso_tenant_isolation ON usuario_acesso;
CREATE POLICY usuario_acesso_tenant_isolation ON usuario_acesso
  USING (true)
  WITH CHECK (true);
