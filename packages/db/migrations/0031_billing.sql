-- 0031 — billing Asaas + título do evento
--
-- Webhook é a única escrita de plan pago. Checkout fora do caminho crítico.
-- Tabelas sem RLS de evento: sem PII de convidado; o app confere account_id
-- na sessão de host antes de criar cobrança.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS title text;

CREATE TABLE billing_customers (
  account_id         uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  asaas_customer_id  text NOT NULL UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing_payments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_id           uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  asaas_payment_id   text NOT NULL UNIQUE,
  status             text NOT NULL
                       CHECK (status IN ('pending', 'confirmed', 'received', 'refunded', 'overdue', 'deleted')),
  plan               text NOT NULL CHECK (plan IN ('celebration', 'vendor')),
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  billing_type       text,
  invoice_url        text,
  paid_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX billing_payments_por_evento ON billing_payments (event_id, created_at DESC);
CREATE INDEX billing_payments_por_conta ON billing_payments (account_id, created_at DESC);

CREATE TABLE billing_webhook_events (
  asaas_event_id  text PRIMARY KEY,
  event_name      text NOT NULL,
  payment_id      text,
  processed_at    timestamptz NOT NULL DEFAULT now()
);
