-- 0028 — uma title_key por evento em challenges
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- O editor e `substituirDesafios` ja recusam duplicata em memoria. Sem o
-- UNIQUE, dois PUT concorrentes (ou um INSERT cru) gravavam a mesma missao
-- duas vezes, e o Map por chave ficava com um id so — fotos ligadas a outra
-- linha perdiam a missao no proximo replace. `substituirDesafios` continua
-- compativel: UPDATE de quem permanece, INSERT so de chave nova, DELETE do
-- resto; o id sobrevive quando a chave fica.
--
-- Seed (`semear` de teste e `tools/db/semear-dev.mjs`) nao tem duplicata:
-- quatro chaves distintas, e o seed de dev so insere se o evento ainda nao
-- tem missao. Nao colapsamos em silencio: duas linhas com a mesma chave
-- podem ter uploads em ids diferentes, e juntar e decisao de produto. Se
-- este bloco estourar, resolva as duplicatas e reaplique.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM challenges
     GROUP BY event_id, title_key
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      '0028: challenges tem title_key duplicada no mesmo evento. Colapse as linhas (um id por chave, uploads.challenge_id apontando para o sobrevivente) antes de aplicar UNIQUE (event_id, title_key).';
  END IF;
END $$;

ALTER TABLE challenges
  ADD CONSTRAINT challenges_event_id_title_key_key UNIQUE (event_id, title_key);
