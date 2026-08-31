-- 0020 — convidados esperados (spec 009, task 020 B-02)
--
-- Denominador da métrica principal: sessões_com_upload / expected_guests.
-- Forward-only: nunca reescreva após aplicar em produção.

ALTER TABLE events
  ADD COLUMN expected_guests integer NOT NULL DEFAULT 150
    CHECK (expected_guests > 0);
