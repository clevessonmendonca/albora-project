-- 0023 — o recado dos anfitrioes (spec 019, tela A-12)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Um recado por evento no primeiro corte: `event_id` e UNIQUE, nao so FK.
-- Varios recados pedem notificacao, e notificacao tem ADR proprio.
--
-- O texto e o corpo; o audio e a camada. Colunas de audio nascem nulas —
-- a chave, quando existir, e derivada no servidor em
-- `events/{event_id}/recado/...`. O cliente nunca a informa.
--
-- `published_at` NULL = ainda nao agendado, logo invisivel para todo
-- convidado. A mesma mecanica do gate da interacao (ADR 0009).

CREATE TABLE recado (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                uuid NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  body                    text NOT NULL,
  audio_key               text,
  audio_duration_seconds  integer,
  published_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recado_audio_coerente CHECK (
    (audio_key IS NULL) = (audio_duration_seconds IS NULL)
  ),
  CONSTRAINT recado_audio_positivo CHECK (
    audio_duration_seconds IS NULL OR audio_duration_seconds > 0
  )
);

-- Leitura por sessao de convidado. Id opaco de sessao, nunca o nome:
-- nome de convidado e PII, e esta e tabela de evento como qualquer outra.
-- PK (recado_id, session_id): reabrir o app nao e ler de novo.
CREATE TABLE recado_lido (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  recado_id   uuid NOT NULL REFERENCES recado(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recado_id, session_id)
);

CREATE INDEX recado_lido_por_sessao ON recado_lido (event_id, session_id);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma disciplina de 0001. O NULLIF
-- nao e defensivo, e obrigatorio: apos um SET LOCAL, ao commitar, o GUC
-- volta a '' (nao a NULL) e ''::uuid estoura em vez de nao casar.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE recado ENABLE ROW LEVEL SECURITY;
ALTER TABLE recado FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON recado
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE recado_lido ENABLE ROW LEVEL SECURITY;
ALTER TABLE recado_lido FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON recado_lido
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
