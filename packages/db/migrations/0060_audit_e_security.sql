-- 0060_audit_e_security.sql
-- Auditoria de negócio e eventos de segurança (ADR 0016 §5). Duas tabelas,
-- não três: application_logs é observabilidade, vai para stdout.

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  actor_kind text NOT NULL CHECK (actor_kind IN ('staff','system','host')),
  actor_id uuid,
  actor_label text,                 -- mascarado, NUNCA PII crua
  action text NOT NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('account','event','ticket','subscription','staff_user','platform')),
  target_id text,
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  ip_hash text
);
CREATE INDEX audit_log_at ON audit_log (at DESC);
CREATE INDEX audit_log_actor ON audit_log (actor_id, at DESC);
CREATE INDEX audit_log_target ON audit_log (target_kind, target_id, at DESC);

CREATE TABLE security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('login.failed','magic_link.abuse','capability.denied','rate_limit.exceeded','session.reuse','reauth.failed')),
  actor_kind text,
  actor_id uuid,
  ip_hash text,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX security_events_at ON security_events (at DESC);
CREATE INDEX security_events_kind ON security_events (kind, at DESC);

-- append-only por GRANT: a aplicação insere e lê, nunca corrige nem apaga
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;
GRANT INSERT, SELECT ON audit_log TO albora_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM albora_app;
GRANT INSERT, SELECT ON security_events TO albora_app;
