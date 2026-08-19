-- 0036 — story do convidado (composer pos-captura, sub-etapa a do ADR 0009)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- `story` REUSA `uploads` — referencia `uploads.id`, nao duplica bytes nem
-- caminho critico. A linha aqui e so o marcador "este upload e uma story" mais
-- a janela de exibicao. UNIQUE(upload_id): um upload e no maximo uma story: o
-- confirm do upload e idempotente (retry da fila reenvia o mesmo uploadId), e
-- a criacao da story precisa da mesma idempotencia — ON CONFLICT (upload_id)
-- DO NOTHING no lugar de gravarComentario/confirmarUpload.
--
-- Sem `music_track_id` nesta migration: musica na story e a sub-etapa b. A
-- coluna fica de fora agora, e chega numa migration nova quando existir —
-- nunca ALTER nesta, forward-only.
--
-- Expiracao (24h) e filtro de LEITURA (`WHERE expira_em > now()`), sem job de
-- delete: story vencida so some da consulta, a linha continua existindo ate a
-- retencao geral do evento (spec de retencao, fora do escopo desta migration).

CREATE TABLE story (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  upload_id   uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  expira_em   timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_id)
);

-- A leitura ativa filtra por evento e por janela — o índice cobre as duas
-- colunas do WHERE de `storiesAtivasDoEvento`.
CREATE INDEX story_ativas_por_evento ON story (event_id, expira_em);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma disciplina de 0001. O NULLIF nao e
-- defensivo, e obrigatorio: apos um SET LOCAL, ao commitar, o GUC volta a ''
-- (nao a NULL) e ''::uuid estoura em vez de nao casar.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE story ENABLE ROW LEVEL SECURITY;
ALTER TABLE story FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON story
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
