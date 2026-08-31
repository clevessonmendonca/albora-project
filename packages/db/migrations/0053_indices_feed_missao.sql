-- 0053 — indices do feed filtrado por missao e do progresso por sessao
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- uploads_feed (0006) cobre o feed do evento inteiro. Quando o convidado
-- filtra por missao, o predicado challenge_id fica fora da chave e o
-- planner ou varre o indice parcial ou recua para seq scan na noite
-- cheia. Este indice e o mesmo cursor (created_at, id) com challenge_id
-- na chave, so nas linhas publicadas que realmente tem missao.
--
-- O EXISTS de "esta sessao ja mandou foto nesta missao" (listarDesafios)
-- casa session_id + challenge_id. uploads_por_sessao (0005) ordena por
-- created_at e nao cobre esse lookup.

CREATE INDEX uploads_feed_por_missao
  ON uploads (event_id, challenge_id, created_at DESC, id DESC)
  WHERE state = 'published' AND challenge_id IS NOT NULL;

CREATE INDEX uploads_por_sessao_e_missao
  ON uploads (event_id, session_id, challenge_id)
  WHERE state = 'published';
