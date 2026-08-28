-- 0048 — token de passagem web → app (ADR 0009)
--
-- Complementa o codigo de 4 digitos: um token opaco de uso unico vai no link
-- universal quando o app ja esta instalado. Hash no banco, string so na URL.

ALTER TABLE app_pairings
  ADD COLUMN passagem_token_hash bytea UNIQUE;
