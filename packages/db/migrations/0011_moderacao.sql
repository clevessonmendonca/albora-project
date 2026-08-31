-- 0011 — moderacao: denuncia, veredito do classificador, panico (spec 011)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- reports espelha reactions: uma sessao denuncia uma foto no maximo uma vez.
-- A PK (upload_id, session_id) e o que faz "duas denuncias" significar duas
-- sessoes distintas — o toque duplo e o retry de rede nao inflam a contagem
-- que segura a foto do telao (packages/core/src/moderacao.ts).
--
-- As colunas novas em uploads/events mapeiam EstadoDaMidia e EstadoDoEvento do
-- core. Nao precisam de politica: a RLS de uploads/events (0001) ja as cobre.

CREATE TABLE reports (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  upload_id   uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (upload_id, session_id)
);

CREATE INDEX reports_por_evento ON reports (event_id);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma regra do 0001: ENABLE sozinho nao
-- vale para o dono da tabela, e a aplicacao costuma conectar como dono.
--
-- 🔴 O NULLIF e obrigatorio: apos um SET LOCAL, ao commitar, o GUC customizado
-- volta a string vazia (nao a NULL), e ''::uuid ESTOURA. Ver 0001.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON reports
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

-- ─────────────────────────────────────────────────────────────
-- Estado que a moderacao le por foto e por evento. Adicionar coluna nao pede
-- politica nova: uploads e events ja estao sob a RLS de 0001.
--
-- classifier_verdict NULL = ainda nao classificado, tratado como ausencia de
-- sinal adverso na leitura (nao "suspeito"). 'limpo' | 'suspeito' | 'sem-resposta'
-- mapeiam EstadoDaMidia.classificador.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE uploads ADD COLUMN classifier_verdict text;
ALTER TABLE uploads ADD COLUMN released_by_host boolean NOT NULL DEFAULT false;

ALTER TABLE events ADD COLUMN panic    boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN hardened boolean NOT NULL DEFAULT false;
