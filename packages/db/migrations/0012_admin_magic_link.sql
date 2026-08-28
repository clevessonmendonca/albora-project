-- 0012 — login do anfitrião por magic link (spec 009)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- A camada de CONTA, acima do evento. `accounts` (0001) ja existe; aqui entram
-- as duas credenciais do anfitriao. Nenhuma tem `event_id`: a conta e dona de N
-- eventos, e vive um nivel acima do isolamento por evento. Por isso ficam fora
-- da RLS de evento — como `session_tokens`, guardam so o hash, nunca o token.
--
-- 🔴 Duas credenciais, dois tempos de vida:
-- - magic_links: uso unico, validade curta. E o que chega no e-mail do casal.
-- - host_sessions: a sessao depois de consumir o link. Revogavel.
--
-- O e-mail comprometido nao basta sozinho para acao destrutiva (baixar acervo,
-- excluir): a spec 009 exige reautenticacao, que emite um novo magic link. Esta
-- migration da a base; a reautenticacao entra com as acoes destrutivas.

CREATE TABLE magic_links (
  token_hash  bytea PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX magic_links_por_conta ON magic_links (account_id);

CREATE TABLE host_sessions (
  token_hash  bytea PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX host_sessions_por_conta ON host_sessions (account_id);
