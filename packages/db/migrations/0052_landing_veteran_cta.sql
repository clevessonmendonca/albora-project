-- 0052 — evento analytics landing_veteran_cta (convidado que já usou Albora)

ALTER TABLE product_events DROP CONSTRAINT IF EXISTS product_events_name_check;

ALTER TABLE product_events ADD CONSTRAINT product_events_name_check
  CHECK (name IN (
    'landing_view',
    'landing_scroll_50',
    'landing_demo',
    'landing_cta',
    'landing_veteran_cta',
    'account_created',
    'event_created',
    'qr_downloaded',
    'checkout_started',
    'checkout_paid'
  ));
