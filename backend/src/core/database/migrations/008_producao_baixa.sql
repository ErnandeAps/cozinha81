-- Story 4.2 — Baixa automática de estoque via Ficha (FR-15 auto, AD-9/AD-6).
-- Acrescenta idempotência ao registro de Produção e o status de baixa, sem
-- alterar o ledger (a baixa em si são movimentos `tipo='baixa'` já suportados
-- pela migration 004).

-- cause_key opcional do registro de produção: quando informado, o reenvio com
-- a mesma chave não duplica a Produção nem as baixas derivadas (AD-6).
ALTER TABLE producao ADD COLUMN IF NOT EXISTS cause_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS producao_cause_key_uniq
  ON producao (tenant_id, cause_key) WHERE cause_key IS NOT NULL;

-- status da baixa associada à Produção:
--   pendente  → registrada, ainda não baixou (modo manual — 4.3)
--   baixado   → baixa automática efetuada conforme a Ficha
--   sem_ficha → produção avulsa sem Ficha: não baixa, sinalizada ao Dono/Admin (4.2 AC#3)
ALTER TABLE producao ADD COLUMN IF NOT EXISTS status_baixa text NOT NULL DEFAULT 'pendente'
  CHECK (status_baixa IN ('pendente', 'baixado', 'sem_ficha'));
