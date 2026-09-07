-- 0070 — entrega das fotos ao convidado (ADR 0019)
--
-- delivery_tokens: link opaco assinado para a galeria da sessão. Segundo
-- conceito, separado do session_tokens de auth: TTL próprio (dias) e
-- revogável/purgável à parte. guest_magic_links: prova de posse de e-mail
-- pelo convidado, NUNCA toca accounts. delivery_opens_at é o gate do casal;
-- delivered_at fecha a idempotência da entrega.
ALTER TABLE events         ADD COLUMN delivery_opens_at timestamptz;
ALTER TABLE guest_contacts ADD COLUMN delivered_at      timestamptz;

CREATE TABLE delivery_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE delivery_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tokens FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON delivery_tokens
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

CREATE TABLE guest_magic_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  token_hash  bytea NOT NULL UNIQUE,
  -- PII. Mascarada em log sempre, e apagada pela retenção.
  email       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE guest_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_magic_links FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON guest_magic_links
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
