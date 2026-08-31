-- 0016 — denuncia em comentario e bloqueio entre convidados (spec 014)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.

CREATE TABLE comment_reports (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  comment_id  uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, session_id)
);

CREATE INDEX comment_reports_por_evento ON comment_reports (event_id);

ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON comment_reports
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

CREATE TABLE guest_blocks (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  blocker_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX guest_blocks_por_bloqueado ON guest_blocks (event_id, blocked_id);

ALTER TABLE guest_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_blocks FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON guest_blocks
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE comments ADD COLUMN classifier_verdict text;
ALTER TABLE comments ADD COLUMN released_by_host boolean NOT NULL DEFAULT false;
