-- 0080 — acervo editorial de inspiracao (ADR 0023)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Conteudo editorial entra por migration porque a aplicacao NAO tem politica
-- de escrita em inspiration_ideas (0079), de proposito: o acervo e curado, nao
-- e user-generated.
--
-- Sem string de dominio: nada de "noivos", "casamento", "casal". O texto fala
-- de evento e de anfitriao, e serve para qualquer pack.
--
-- image_key fica NULL: a imagem entra quando houver arte licenciada. Midia de
-- convidado NUNCA vira material editorial (CLAUDE.md, STJ REsp 1.628.700/MG),
-- mesmo com a foto sendo "so um exemplo".

INSERT INTO inspiration_ideas (slug, theme, title, body, position) VALUES
  (
    'detalhes-que-contam',
    'fotos',
    'Os detalhes que contam a história',
    'O bolo, o buquê, a mesa posta e o sapato no canto do quarto somem em meia hora e quase nunca entram na foto oficial. Peça esses closes logo no começo, quando todo mundo ainda está reparando em tudo.',
    1
  ),
  (
    'pista-vista-por-todos',
    'fotos',
    'Uma pista vista por todos os ângulos',
    'O fotógrafo cobre um lado da pista por vez. Quem está dançando cobre todos ao mesmo tempo. É daí que saem as fotos que ninguém conseguiu posar.',
    2
  ),
  (
    'retrato-mais-verdadeiro',
    'fotos',
    'O retrato mais verdadeiro de vocês',
    'A foto que os convidados tiram de perto pega o que a lente profissional não alcança: a reação a três metros de distância, no meio da conversa, sem ninguém olhar para a câmera.',
    3
  ),
  (
    'qr-na-decoracao',
    'decoracao',
    'O QR integrado à decoração',
    'Placa na mesa de entrada, no bar e perto do banheiro. São os três lugares onde a pessoa está parada, com a mão livre e o celular já na mão — e onde ela realmente escaneia.',
    1
  ),
  (
    'placa-que-explica-sozinha',
    'decoracao',
    'Uma placa que explica sozinha',
    'Quem chega não vai ler um parágrafo. Uma frase curta dizendo o que acontece ao escanear resolve mais que qualquer instrução detalhada: as pessoas decidem em dois segundos se vale o gesto.',
    2
  ),
  (
    'mostre-onde-enviar',
    'experiencia',
    'Mostre onde enviar',
    'A participação não cai por falta de vontade, cai por falta de caminho. Se em algum momento da festa a pessoa não souber para onde mandar a foto, ela não manda.',
    1
  ),
  (
    'convide-sem-cobrar',
    'experiencia',
    'Convide, sem cobrar',
    'Missão é convite, não tarefa. Poucas, escritas como sugestão, funcionam melhor do que uma lista que parece dever de casa no meio da festa.',
    2
  ),
  (
    'revise-antes-de-projetar',
    'experiencia',
    'Revise antes de projetar',
    'O telão é público e não tem desfazer. Deixe a aprovação ligada e combine antes quem fica de olho na fila durante a festa.',
    3
  );
