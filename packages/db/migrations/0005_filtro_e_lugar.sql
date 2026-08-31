-- 0005 — filtro recomendado e lugar na festa
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.

-- O filtro que o anfitriao sugere. NULL = nenhum, e a tira sai na ordem do
-- catalogo. E sugestao, nao imposicao: quem aplica e o convidado (N5.9).
--
-- Guarda o id do preset, e nao os parametros, de proposito. Parametros
-- gravados aqui congelariam a estetica do evento na versao do catalogo que
-- estava no ar no dia — e a correcao de uma curva deixaria de alcancar os
-- eventos ja criados.
ALTER TABLE events ADD COLUMN recommended_filter text;

-- "Onde na festa" — id de lista fechada do pack, nunca texto livre e nunca
-- coordenada. O EXIF sai no cliente justamente porque GPS em foto de
-- convidado e exposicao real; reintroduzir localizacao aqui desfaria o
-- controle inteiro (N6.9).
ALTER TABLE uploads ADD COLUMN place text;

-- A galeria do proprio convidado e o caminho de remocao ("posso apagar as
-- minhas a qualquer momento") leem por sessao. Sem indice, cada leitura
-- varre o evento inteiro na noite em que ele tem mais linhas.
CREATE INDEX uploads_por_sessao ON uploads (session_id, created_at DESC);
