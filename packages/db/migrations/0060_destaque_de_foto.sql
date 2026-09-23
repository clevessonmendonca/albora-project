-- 0060 — destaque de foto (curadoria positiva)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Ate aqui o anfitriao so tinha poder negativo sobre a midia: liberar, ocultar,
-- remover. Destacar e o sinal positivo — "esta aqui e das boas" — que depois
-- prioriza telao, retrospectiva e topo do album.
--
-- Coluna de timestamp em vez de boolean: saber QUANDO foi destacada permite
-- ordenar por curadoria recente sem tabela extra, e `NULL` ja significa "nao
-- destacada" sem valor default mentiroso.
--
-- Nao mexe em `state`. Destacar e curadoria, nao moderacao: uma foto destacada
-- continua publicada, e ocultar uma destacada continua sendo ocultar.

ALTER TABLE uploads ADD COLUMN highlighted_at timestamptz;

-- Indice parcial: a leitura de destaques e sempre "os destaques deste evento",
-- e destaque e minoria da tabela. Indexar a tabela inteira pagaria por linha
-- que nunca aparece nessa consulta.
CREATE INDEX uploads_destaques ON uploads (event_id, highlighted_at DESC)
  WHERE highlighted_at IS NOT NULL;

COMMENT ON COLUMN uploads.highlighted_at IS
  'Quando o anfitriao destacou a foto. NULL = nao destacada. Curadoria, nao moderacao.';
