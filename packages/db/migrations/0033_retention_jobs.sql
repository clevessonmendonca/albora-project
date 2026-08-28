-- 0033 — jobs de retenção pós-evento
--
-- +48h aviso · D330 stub Drive · D365 delete fail-closed (nunca se export falhou).
-- Sem RLS de evento: o runner precisa listar due cross-event (sem PII).

CREATE TABLE retention_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('plus_48h', 'd330_drive', 'd365_delete')),
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'done', 'skipped', 'failed')),
  due_at        timestamptz NOT NULL,
  attempts      integer NOT NULL DEFAULT 0,
  last_error    text,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, kind)
);

CREATE INDEX retention_jobs_due ON retention_jobs (status, due_at)
  WHERE status IN ('pending', 'failed');
