-- 0041 — export_jobs ganha destino Drive, sem reescrever o que já existe
-- (spec drive-export §3.2)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- `published_snapshot` é quantas linhas de `uploads` (state='published')
-- existiam no evento no instante em que este job foi criado. É o que
-- permite ao D365 confirmar cobertura total, e não só "existiu 1 export"
-- (packages/core/src/retention.ts, mayDeleteAtD365).
--
-- Jobs antigos (destination default 'zip') continuam válidos sem migrar
-- dado nenhum: bytes_total/bytes_uploaded nascem 0, published_snapshot
-- nasce NULL — um job zip nunca precisou dessas colunas.

ALTER TABLE export_jobs ADD COLUMN destination text NOT NULL DEFAULT 'zip'
  CHECK (destination IN ('zip', 'drive'));
ALTER TABLE export_jobs ADD COLUMN drive_folder_id text;
ALTER TABLE export_jobs ADD COLUMN bytes_total bigint NOT NULL DEFAULT 0;
ALTER TABLE export_jobs ADD COLUMN bytes_uploaded bigint NOT NULL DEFAULT 0;
ALTER TABLE export_jobs ADD COLUMN published_snapshot integer;
