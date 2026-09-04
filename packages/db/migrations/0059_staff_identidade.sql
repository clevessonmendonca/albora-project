-- 0059_staff_identidade.sql
-- Equipe Albora. Isolada de `accounts` de propósito: staff tem poder cross-tenant,
-- e comprometer o fluxo de auth de cliente nunca pode virar acesso interno.

CREATE TABLE staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  visto_em timestamptz
);

CREATE TABLE staff_magic_links (
  token_hash text PRIMARY KEY,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL,
  usado_em timestamptz
);
CREATE INDEX staff_magic_links_user ON staff_magic_links (staff_user_id);

CREATE TABLE staff_sessions (
  token_hash text PRIMARY KEY,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL,
  revogada_em timestamptz,
  criada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_sessions_user ON staff_sessions (staff_user_id);

-- Um staff pode acumular papéis. O mapa papel -> capacidades vive em CÓDIGO
-- (packages/core/src/staff-rbac.ts), nunca aqui: uma matriz de permissão
-- editável pela UI é superfície de escalação de privilégio.
CREATE TABLE staff_role_assignments (
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('owner','support','finance','compliance','engineering')),
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_user_id, papel)
);
