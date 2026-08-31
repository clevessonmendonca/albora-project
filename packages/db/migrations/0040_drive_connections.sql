-- 0040 — conexão do Google Drive do casal, por evento (spec drive-export §1/§3.1)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- `event_id` é a própria PK (não um `id` próprio): só existe UMA conexão de
-- Drive por evento — reconectar substitui (UPSERT), nunca acumula. O refresh
-- token nunca é gravado em claro — só ciphertext/iv/tag/key_version (vault
-- em @albora/db, AES-256-GCM, chave fora desta tabela e fora do dump).

CREATE TABLE drive_connections (
  event_id            uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  account_id          uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'conectado'
                        CHECK (status IN ('conectado', 'expirado', 'revogado')),
  drive_folder_id     text NOT NULL,
  drive_account_email text,
  refresh_ciphertext  bytea NOT NULL,
  refresh_iv          bytea NOT NULL,
  refresh_tag         bytea NOT NULL,
  key_version         integer NOT NULL,
  connected_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma disciplina de 0025. O NULLIF
-- nao e defensivo, e obrigatorio: apos um SET LOCAL, ao commitar, o GUC
-- volta a '' (nao a NULL) e ''::uuid estoura em vez de nao casar.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_connections FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON drive_connections
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
