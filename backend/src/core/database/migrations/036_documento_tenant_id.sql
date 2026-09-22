-- Corrige o esquema legado de documento: o documento pertence ao inquilino e não à cozinha.
-- A tabela antiga pode ter sido criada antes da coluna tenant_id, e o uso de
-- CREATE TABLE IF NOT EXISTS impede a correção automática em bancos já existentes.

ALTER TABLE documento ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE documento d
SET tenant_id = i.id
FROM inquilino i
WHERE d.tenant_id IS NULL
  AND d.cozinha_id IS NOT NULL
  AND i.cozinha_id = d.cozinha_id;

-- Se houver documentos sem inquilino resolvido, isto falha explicitamente para
-- evitar vazamento de dados e manter o contrato correto do domínio.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM documento WHERE tenant_id IS NULL) > 0 THEN
    RAISE EXCEPTION 'documento com tenant_id nulo detectado; associe cada documento ao inquilino antes de tornar a coluna NOT NULL';
  END IF;
END
$$ LANGUAGE plpgsql;

ALTER TABLE documento
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE documento
  DROP CONSTRAINT IF EXISTS documento_tenant_id_fkey;

ALTER TABLE documento
  ADD CONSTRAINT documento_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES inquilino (id) ON DELETE CASCADE;

-- Mantém a compatibilidade com dados legados, mas o relacionamento principal é o tenant.
ALTER TABLE documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documento_tenant_isolation ON documento;
CREATE POLICY documento_tenant_isolation ON documento
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.scope', true) = 'platform'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
