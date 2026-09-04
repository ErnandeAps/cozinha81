-- Migration: Pedido Status Cause Key
-- Story 6.3 (FR-25, AD-6)

-- Limpar a tabela pedido_status se tiver algo pra não falhar ao adicionar NOT NULL UNIQUE caso necessário
-- Mas pra evitar quebrar dev envs que já tem algo, só vamos colocar UNIQUE.

ALTER TABLE pedido_status 
ADD COLUMN cause_key uuid;

-- Em uma situação real em prod com dados já existentes, precisaríamos gerar cause_keys.
-- Como é início de dev, é seguro fazer um UPDATE gen_random_uuid() onde for nulo:
UPDATE pedido_status SET cause_key = gen_random_uuid() WHERE cause_key IS NULL;

-- Agora aplicar a restrição NOT NULL e UNIQUE por tenant
ALTER TABLE pedido_status ALTER COLUMN cause_key SET NOT NULL;
ALTER TABLE pedido_status ADD CONSTRAINT pedido_status_cause_key_tenant_key UNIQUE (tenant_id, cause_key);
