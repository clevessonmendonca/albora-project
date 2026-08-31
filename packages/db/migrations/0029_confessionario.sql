-- 0029 — Confessionário: pergunta do pack ligada ao upload de vídeo
--
-- A pergunta é chave de vocabulário do pack (lista fechada), nunca texto livre.
-- Só faz sentido em vídeo; a app valida mime no confirm.

ALTER TABLE uploads
  ADD COLUMN prompt_key text;

CREATE INDEX uploads_confessionario_por_evento
  ON uploads (event_id, created_at DESC)
  WHERE prompt_key IS NOT NULL;
