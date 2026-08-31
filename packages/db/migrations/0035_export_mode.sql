-- 0035 — modo do job de export (full vs curated)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Estende export_jobs com coluna `mode` para diferenciar entre export
-- completo (todas as fotos publicadas) e curado (seleção automática do
-- álbum via selecionarParaAlbum). Jobs antigos (mode NULL) leem como 'full'.

ALTER TABLE export_jobs ADD COLUMN mode text;

ALTER TABLE export_jobs ADD CONSTRAINT export_jobs_mode 
  CHECK (mode IS NULL OR mode IN ('full', 'curated'));

-- Jobs antigos viram 'full' na leitura. Novos jobs devem informar o modo
-- explicitamente, mas o padrão do banco permite NULL para manter a migration
-- idempotente (re-rodar não estoura).
