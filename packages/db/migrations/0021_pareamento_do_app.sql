-- 0021 — pareamento web → app (spec A-11)
--
-- A web gera um codigo de 4 digitos amarrado a uma sessao existente. O app
-- instalado digita o codigo e recebe um token opaco para a mesma sessao —
-- unica coisa que o convidado digita alem do nome.
--
-- Fica FORA da RLS, como session_tokens e wall_pairings: o resgate resolve
-- por codigo antes de haver contexto de evento. Sem PII — so mapeamento
-- codigo → (event_id, session_id).

CREATE TABLE app_pairings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL,
  status      text NOT NULL DEFAULT 'pendente',
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_pairings_por_sessao ON app_pairings (session_id);
