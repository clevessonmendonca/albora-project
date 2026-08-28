-- 0049 — missões personalizadas no challenges
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Antes: title_key NOT NULL, sem texto livre.
-- Depois: ou title_key (chave do pack) ou custom_title (texto livre do casal),
--         mas nunca os dois e nunca nenhum.
--
-- O guard CHECK garante que uma linha não fica sem identidade de titulo.
-- O UNIQUE (event_id, title_key) existente (0028) permanece — NULL != NULL no
-- Postgres, logo duas missões personalizadas do mesmo evento coexistem sem
-- violar o constraint.

ALTER TABLE challenges
  ALTER COLUMN title_key DROP NOT NULL;

ALTER TABLE challenges
  ADD COLUMN custom_title text;

ALTER TABLE challenges
  ADD CONSTRAINT challenges_titulo_xor
    CHECK (
      (title_key IS NOT NULL) <> (custom_title IS NOT NULL)
    );
