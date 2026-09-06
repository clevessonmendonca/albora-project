-- 0062_photo_moderation.sql
-- Estado de moderacao por midia. Substitui o Set em memoria de classify.ts,
-- que nao sobrevive a mais de uma instancia: N workers classificavam o mesmo
-- lote e o custo do provedor era pago N vezes.
--
-- RLS FORCADA, nao so habilitada: ENABLE sozinho nao vale para o dono da
-- tabela, e a aplicacao conecta como dono. O NULLIF e obrigatorio — apos o
-- SET LOCAL o GUC volta a string vazia, e ''::uuid estoura em vez de falhar
-- fechado.

CREATE TABLE photo_moderation (
  upload_id    uuid PRIMARY KEY REFERENCES uploads(id) ON DELETE CASCADE,
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','claimed','done','failed')),
  provider     text,
  attempts     int NOT NULL DEFAULT 0,
  claimed_at   timestamptz,
  completed_at timestamptz,
  -- Categorias e escores brutos do provedor: insumo para recalibrar limiar
  -- sem reclassificar tudo. NUNCA a imagem, nunca PII.
  result       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photo_moderation_pendentes ON photo_moderation (event_id, status);

ALTER TABLE photo_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_moderation FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON photo_moderation
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
