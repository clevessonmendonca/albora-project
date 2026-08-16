-- 0032 — product_events (landing) + analytics_snapshots
--
-- Sem PII. product_events não tem event_id (cookie anônimo). Snapshots
-- são materializados por job (papel agregador / conexão de job).

CREATE TABLE product_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL
                 CHECK (name IN (
                   'landing_view',
                   'landing_scroll_50',
                   'landing_demo',
                   'landing_cta',
                   'account_created',
                   'event_created',
                   'qr_downloaded',
                   'checkout_started',
                   'checkout_paid'
                 )),
  anon_id      text,
  pack_hint    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_events_por_nome ON product_events (name, created_at DESC);

CREATE TABLE analytics_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope        text NOT NULL CHECK (scope IN ('event', 'vendor', 'platform')),
  scope_id     text NOT NULL,
  period       text NOT NULL CHECK (period IN ('live', 'day', 'week', 'all')),
  metrics      jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX analytics_snapshots_unico
  ON analytics_snapshots (scope, scope_id, period);
