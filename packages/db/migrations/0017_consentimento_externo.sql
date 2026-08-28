-- 0017 — consentimento de saída do perímetro (spec 015, ADR 0009)
--
-- Segundo consentimento, versionado e datado, separado da entrada.
-- Só autoriza compartilhar para fora; nunca subir, galeria ou telão.

ALTER TABLE guest_sessions
  ADD COLUMN external_consent_version text,
  ADD COLUMN external_consented_at timestamptz,
  ADD COLUMN external_consent_revoked_at timestamptz,
  ADD COLUMN external_name_on_frame boolean NOT NULL DEFAULT false;
