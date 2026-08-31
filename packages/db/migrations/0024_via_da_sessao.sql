-- 0024 — canal de entrada da sessao (QR impresso vs WhatsApp vs link)
--
-- O funil nascia plano: peca impressa e link no grupo ambos gravavam
-- `qr_scan`. A espinha continua cumulativa; o canal mora na sessao.
-- Forward-only: nunca reescreva apos aplicar em producao.

ALTER TABLE guest_sessions
  ADD COLUMN via text NOT NULL DEFAULT 'link'
    CHECK (via IN ('qr', 'wa', 'link'));
