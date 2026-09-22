-- Corrige o modelo atual de documentos do inquilino: cozinha_id é opcional.
-- O documento é associado ao inquilino; a cozinha continua como referência
-- compatível apenas quando a operação for específica da cozinha.

ALTER TABLE documento ALTER COLUMN cozinha_id DROP NOT NULL;
