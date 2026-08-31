-- 0006 — indice do feed
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- O feed pagina por cursor, e o cursor e o par (created_at, id): created_at
-- sozinho nao e unico, e o empate entre duas fotos do mesmo microssegundo e
-- exatamente o item que some entre uma pagina e a seguinte. O indice de 0001
-- para em created_at, entao o desempate por id sairia de um sort.
--
-- Parcial em state = 'published' de proposito. O feed le so o que a moderacao
-- liberou, e o indice parcial mantem fora as linhas que o botao de panico
-- retirou — que sao as que nao interessam a nenhuma leitura de convidado.

CREATE INDEX uploads_feed
  ON uploads (event_id, created_at DESC, id DESC)
  WHERE state = 'published';
