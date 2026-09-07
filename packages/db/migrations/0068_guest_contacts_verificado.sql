-- 0068 — contato verificado do convidado (Onda SSO, T7)
--
-- `channel` já aceita texto livre ('email'). verified_at/verified_via
-- distinguem um contato VERIFICADO (posse de e-mail provada — Google ou
-- magic link do convidado) de um contato só digitado; a entrega das
-- memórias deve preferir o verificado. NULL-áveis: contatos existentes e
-- não-verificados continuam válidos.
ALTER TABLE guest_contacts ADD COLUMN verified_at timestamptz;
ALTER TABLE guest_contacts ADD COLUMN verified_via text
  CHECK (verified_via IN ('google', 'magic_link'));
