-- 0059_staff_identidade.sql
-- Equipe Albora. Isolada de `accounts` de propósito: staff tem poder cross-tenant,
-- e comprometer o fluxo de auth de cliente nunca pode virar acesso interno.
-- Colunas em inglês: ADR 0014 (inglês canônico para código novo).

CREATE TABLE staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE staff_magic_links (
  token_hash text PRIMARY KEY,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX staff_magic_links_user ON staff_magic_links (staff_user_id);

-- Sessão de staff carrega poder cross-tenant: além do expiry absoluto, tem
-- inatividade (last_used_at), rotação (rotated_from) e step-up (reauthenticated_at).
CREATE TABLE staff_sessions (
  token_hash text PRIMARY KEY,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  reauthenticated_at timestamptz,
  rotated_from text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_sessions_user ON staff_sessions (staff_user_id);
CREATE INDEX staff_sessions_rotated_from ON staff_sessions (rotated_from) WHERE rotated_from IS NOT NULL;

-- Um staff pode acumular papéis. O mapa papel -> capacidades vive em CÓDIGO
-- (packages/core/src/authorization/), nunca aqui: uma matriz de permissão
-- editável pela UI é superfície de escalação de privilégio.
CREATE TABLE staff_role_assignments (
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','support','finance','compliance','engineering')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_user_id, role)
);
