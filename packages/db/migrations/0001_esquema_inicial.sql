-- 0001 — esquema inicial e isolamento por evento
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Nomes genericos por decisao: o nucleo nao sabe que casamento existe.
-- Nada de couple_names, wedding_date, bride, groom.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tabelas sem event_id: nao carregam dado de evento.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vendors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE packs (
  id          text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- events: a raiz do isolamento. A politica casa por `id`, nao por
-- `event_id`, porque aqui a linha *e* o evento.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  vendor_id           uuid REFERENCES vendors(id) ON DELETE SET NULL,
  pack_id             text NOT NULL REFERENCES packs(id) ON DELETE RESTRICT,
  slug                text NOT NULL UNIQUE,
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz NOT NULL,
  -- NULL = interacao fechada. Gate do ADR 0009, decidido pelo anfitriao.
  interaction_opens_at timestamptz,
  identity_tokens     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Tabelas com event_id. Toda uma delas: UUID, NOT NULL, FK.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title_key   text NOT NULL,
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guest_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  display_name        text NOT NULL,
  consent_version     text NOT NULL,
  consented_at        timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guest_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  channel     text NOT NULL,
  -- PII. Mascarada em log sempre, e apagada pelo job de retencao.
  value       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE uploads (
  id            uuid PRIMARY KEY,
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  challenge_id  uuid REFERENCES challenges(id) ON DELETE SET NULL,
  storage_key   text NOT NULL UNIQUE,
  mime          text NOT NULL,
  bytes         integer NOT NULL,
  caption       text,
  state         text NOT NULL DEFAULT 'published',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reactions (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  upload_id   uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Reagir duas vezes e reagir uma vez. E o que faz o botao sobreviver a
  -- toque duplo e a retry de rede sem inflar contagem.
  PRIMARY KEY (upload_id, session_id)
);

CREATE TABLE funnel_events (
  id          bigserial PRIMARY KEY,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid REFERENCES guest_sessions(id) ON DELETE SET NULL,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX uploads_por_evento    ON uploads (event_id, created_at DESC);
CREATE INDEX reactions_por_evento  ON reactions (event_id);
CREATE INDEX sessions_por_evento   ON guest_sessions (event_id);
CREATE INDEX funnel_por_evento     ON funnel_events (event_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado.
--
-- ENABLE sozinho nao vale para o dono da tabela — e a aplicacao costuma
-- conectar como dono. FORCE e o que faz a politica valer para todo mundo
-- menos BYPASSRLS.
--
-- current_setting(..., true) devolve NULL quando o setting nunca existiu.
--
-- 🔴 O NULLIF nao e defensivo, e obrigatorio. Depois de um SET LOCAL, ao
-- commitar, um GUC customizado NAO volta a NULL: volta a string vazia. E
-- ''::uuid nao "nao casa" — ele ESTOURA com invalid input syntax.
--
-- Sem o NULLIF, a mesma consulta se comporta de duas formas na mesma pool:
-- em conexao nova devolve zero linhas, e em conexao reciclada por outro
-- evento devolve erro 500. Descoberto pela suite de isolamento; o teste que
-- trava isso e o "conexao reciclada".
-- ─────────────────────────────────────────────────────────────

ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events         FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON events
  USING (id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE challenges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges     FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON challenges
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON guest_sessions
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE guest_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_contacts FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON guest_contacts
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE uploads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads        FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON uploads
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions      FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON reactions
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE funnel_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events  FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON funnel_events
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
