-- 0067 — state de uso único do SSO Google (Onda SSO, T3)
--
-- Mesma disciplina de magic_links/staff_magic_links/session_tokens: uma
-- linha por nonce, consumida por UPDATE...RETURNING atômico (nunca
-- ler-depois-escrever). FORA de RLS de propósito — como session_tokens
-- (migration 0003): mapa hash->contexto de vida curtíssima, não dado de
-- evento; event_id/guest_session_id só são preenchidos para surface='guest'.
CREATE TABLE oidc_states (
  nonce_hash        bytea PRIMARY KEY,
  surface           text NOT NULL CHECK (surface IN ('host', 'staff', 'guest')),
  return_to         text NOT NULL,
  event_id          uuid REFERENCES events(id) ON DELETE CASCADE,
  guest_session_id  uuid REFERENCES guest_sessions(id) ON DELETE CASCADE,
  expires_at        timestamptz NOT NULL,
  consumed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Índice parcial: só a fatia de linhas ainda vivas importa pra varredura
-- de expiração; consumidas ficam de fora e não incham o índice.
CREATE INDEX oidc_states_por_expiracao ON oidc_states (expires_at) WHERE consumed_at IS NULL;
