-- 0008 — comentarios em foto (spec 014, ADR 0009)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- parent_id da a thread. A PROFUNDIDADE_MAXIMA (packages/core/src/comentario.ts)
-- e imposta no core, nao no schema: resposta de resposta sobe para a raiz, e um
-- CHECK aqui recusaria o que o core resolve subindo.
--
-- body guardado SEM escapar — o core apara mas nao escapa. Escapar na escrita
-- gravaria &lt;script&gt; e voltaria escapado de novo no template; as duas
-- camadas da spec 014 sao servidor e template, e as duas na SAIDA.

CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  upload_id   uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  session_id  uuid REFERENCES guest_sessions(id) ON DELETE SET NULL,
  parent_id   uuid REFERENCES comments(id) ON DELETE CASCADE,
  body        text NOT NULL,
  state       text NOT NULL DEFAULT 'published',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_por_foto ON comments (event_id, upload_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma regra do 0001: ENABLE sozinho nao
-- vale para o dono da tabela, e a aplicacao costuma conectar como dono.
--
-- 🔴 O NULLIF e obrigatorio: apos um SET LOCAL, ao commitar, o GUC customizado
-- volta a string vazia (nao a NULL), e ''::uuid ESTOURA. Ver 0001.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON comments
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
