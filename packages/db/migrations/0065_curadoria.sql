-- 0065_curadoria.sql
-- Curadoria do livro: sinais aritmeticos por midia (hash perceptual, nitidez,
-- exposicao) e a fila que os calcula. Molde de retention_jobs (0033).
--
-- Numero 0065 e nao 0056: a faixa 0056-0058 pertence ao redesign, 0059-0061 ao
-- console interno e 0062+ a moderacao, nenhum deles mergeado ainda. O runner
-- (packages/db/src/migrar.ts) rastreia por NOME em _migrations, entao o gap e
-- inofensivo — reutilizar numero e que produziria dois arquivos iguais no merge.
--
-- RLS FORCADA, nao so habilitada: ENABLE sozinho nao vale para o dono da
-- tabela, e a aplicacao conecta como dono. O NULLIF e obrigatorio — apos o
-- SET LOCAL o GUC volta a string vazia, e ''::uuid estoura em vez de falhar
-- fechado.

CREATE TABLE curation_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts      integer NOT NULL DEFAULT 0,
  claimed_at    timestamptz,
  completed_at  timestamptz,
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX curation_jobs_pendentes ON curation_jobs (status, created_at)
  WHERE status IN ('pending', 'processing');

-- Um registro por midia. Score NULL significa SINAL AUSENTE, que e diferente
-- de sinal ruim: a midia continua disponivel no editor do livro como qualquer
-- outra, sem flag e sem rebaixamento. Mesma assimetria do classificador de
-- moderacao, onde erro vira 'sem-resposta' e nunca 'limpo' nem 'suspeito'.
CREATE TABLE media_curation_scores (
  upload_id     uuid PRIMARY KEY REFERENCES uploads(id) ON DELETE CASCADE,
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  -- Hash perceptual como texto: bigint do Postgres e assinado e o hash usa
  -- os 64 bits. Hex evita o wrap silencioso.
  perceptual_hash text,
  sharpness     real,
  exposure      real,
  computed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX media_curation_scores_evento ON media_curation_scores (event_id);

ALTER TABLE curation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_jobs FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON curation_jobs
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE media_curation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_curation_scores FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON media_curation_scores
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
