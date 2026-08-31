-- 0009 — a musica do casal (spec 018, camada 1 do ADR 0011)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Metadado e hiperlink, nunca bytes de audio. A fronteira do ADR 0011 vive em
-- `validarSaidaDeCompartilhamento` do @albora/core; aqui o banco guarda de onde
-- e o link, o que ele identifica e o texto exibivel — nada que contenha audio.
--
-- provider/content_type/identifier saem do parser do nucleo (`lerLinkDeMusica`),
-- que valida o host contra conjunto fechado antes de qualquer escrita. A `url`
-- gravada e a recomposta pelo nucleo, nunca a string colada — sem parametro de
-- rastreamento pendurado por quem colou e que 150 convidados vao abrir.

-- ─────────────────────────────────────────────────────────────
-- A faixa que o casal escolheu. Uma por evento: a linha *e* a musica do
-- evento, por isso `event_id` e a PK.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE event_music (
  event_id      uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  provider      text NOT NULL,
  content_type  text NOT NULL,
  identifier    text NOT NULL,
  region        text,
  url           text NOT NULL,
  -- Metadado e enriquecimento: sem ele, a exibicao cai para o link cru.
  title         text,
  artist        text,
  cover_url     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- As faixas que os convidados sugeriram. Deduplicada por (evento, sessao,
-- faixa): a mesma sessao sugerindo a mesma faixa duas vezes continua valendo
-- um voto — sobrevive a toque duplo e a retry de rede sem inflar contagem,
-- pelo mesmo motivo da PK de `reactions`. A mesma faixa vinda de N sessoes sao
-- N linhas, e a contagem de votos e o numero de sessoes distintas.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE music_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  provider      text NOT NULL,
  content_type  text NOT NULL,
  identifier    text NOT NULL,
  region        text,
  url           text NOT NULL,
  title         text,
  artist        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, session_id, provider, content_type, identifier)
);

-- A reconstrucao da fila le por evento em ordem de chegada: o desempate estavel
-- de `ordenarSugestoes` e a primeira sessao a sugerir cada faixa.
CREATE INDEX music_suggestions_por_evento
  ON music_suggestions (event_id, created_at ASC, id ASC);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma disciplina de 0001. O NULLIF nao e
-- defensivo, e obrigatorio: apos um SET LOCAL, ao commitar, o GUC volta a ''
-- (nao a NULL) e ''::uuid estoura em vez de nao casar.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE event_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_music FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON event_music
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE music_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_suggestions FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON music_suggestions
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
