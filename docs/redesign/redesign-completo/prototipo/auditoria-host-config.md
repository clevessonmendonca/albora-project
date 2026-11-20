# Auditoria de arte — host-config (2ª passada)

Telas abertas no navegador em 1360 e 375 (Estilo, Compartilhar, Ajustes/Evento, Ajustes/Exportar e a lista de Ajustes, Comunidade, Inspiração, Ajuda; Privacidade, Equipe, Plano e a conversa foram conferidas por medição de estouro horizontal e leitura do HTML, sem captura). Impeccable usado: `critique.md` (perguntas de hierarquia e "cartões para tudo"), `craft-floor.md` (proibições: kicker acima de título, `border-left` colorido > 1px, cartão dentro de cartão), `layout.md` (leitura, agrupamento, ritmo), `typeset.md` (Fraunces nos títulos e números, corpo 17px a 65ch), `distill.md` (cortar rótulos, banners e botões repetidos) e `detect.mjs` sobre o `.js` (sem achados). Perguntas: 1 identidade, 2 logo, 3 mascote, 4 âmbar, 5 personalidade, 6 quantidade de informação, 7 hierarquia, 8 componente desnecessário, 9 ação principal, 10 nível de produto.

## Antes (o que a revisão encontrou) e depois

| Tela | Antes | Depois |
|---|---|---|
| Estilo | Coluna de cartões (`.hc-opt` com borda 2px, pílulas de paleta, 6 seções com `t-title`), chips de salto, prévia de 340px com abas Convidado/Telão/Álbum | Editor em filete (estilos como lista tipográfica com "Aa" na fonte real, paleta em linhas, ponto âmbar na seleção) e prévia grande e fixa com as três superfícies juntas, sem abas |
| Compartilhar | Três seções iguais (Convite, Peças, Telão), duas peças com QR pequeno, dois cartões `outline` para os métodos do telão, QR e botões repetidos | A placa em escala como objeto herói, um botão principal (Baixar a peça), telão como bloco operacional com status grande, métodos separados por um filete, atalhos de protótipo recolhidos |
| Ajustes | Hub de 5 itens com ícone em cartão-lista e painel com `t-display` | Leitura de documento: índice em texto à esquerda (ponto âmbar no atual), um painel único com campos em linha (rótulo à esquerda), seções por filete |
| Comunidade | Banner, selo de assunto como badge acima do título, chips, `t-title` pequeno | Título em Fraunces 24px, assunto em texto âmbar na linha de metadados, filtros sublinhados, nota de privacidade como parágrafo com filete |
| Inspiração | Lista em linha com `t-label` acima do título (kicker) | Duas colunas editoriais, título em Fraunces, assunto na linha de ações, sem kicker |
| Ajuda | Quatro abas sem identidade | Página de leitura: mascote na abertura, índice por âncoras, glossário em duas colunas, FAQ, suporte e tour em sequência |

## Auditoria por tela (depois das correções)

| Tela | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Estilo** `/estilo` | Sim: Fraunces e prévia do evento dão cara própria. | Sim: a logo vem do rail do núcleo; a tela não a repete. | Parcial: sem mascote; o vazio da prévia não existe, só o aviso de cerimonialista. | Sim: pontos de seleção e foco em `--ac`; `--ev` só na prévia (botão do convidado). | Parcial: o editor ainda é uma coluna longa de seções; a prévia é o que tem personalidade. | Parcial: 6 seções empilhadas; tudo é útil, mas a rolagem é grande (o índice de âncoras ajuda). | Sim: a prévia lidera, as seções seguem a ordem de decisão. | Parcial: o banner de fase (quando aparece) ainda é caixa. | Sim: não há botão, é autosave com toast; a ação é escolher e ver. | Parcial: bom no desktop; no celular a prévia ocupa a primeira tela e empurra o editor. |
| **Compartilhar** | Sim: o objeto impresso com o nome em Fraunces é reconhecível. | Sim (núcleo). | Não: sem mascote; ok, é tela operacional. | Sim: abas sublinhadas em âmbar, status em verde/atenção, nada preenchido de âmbar. | Sim: a placa em escala é a assinatura da tela. | Parcial: a coluna de controles ainda tem 10 itens (link, peça, tamanho, cor, checagem, 3 botões, 2 notas, QR avulso). | Sim: placa, depois ação, depois telão. | Parcial: "Mesma cor em todo o kit" e "Pacote completo" disputam atenção com o botão principal. | Sim: "Baixar a peça (PDF)"; "Convidar" fica só no topo. | Sim no desktop; no celular a placa vem inteira antes do link. |
| **Compartilhar > Telão** | Sim: status em serifa grande. | Sim. | Não. | Sim. | Parcial: dois métodos lado a lado são honestos, mas visualmente neutros. | Sim: atalhos e histórico recolhidos. | Sim: status, depois código e link. | Não. | Parcial: "Abrir telão" é botão de linha, correto (um principal só na tela). | Sim. |
| **Ajustes > Evento** | Sim: título Fraunces, campos sem raio exagerado. | Sim (núcleo). | Não: tela de formulário, sem mascote. | Sim: ponto âmbar no índice. | Parcial: sóbria demais, é formulário. | Sim: 6 campos. | Sim. | Não. | Sim: "Salvar alterações". | Sim. |
| **Ajustes > Privacidade, Equipe, Exportar, Plano** | Sim. | Sim. | Sim no vazio da Equipe e da cerimonialista (mascote); demais não. | Sim. | Parcial: Exportar é uma lista de seções iguais. | Parcial: Exportar tem 6 blocos; é o lugar de tudo que sai do evento. | Sim: filetes e títulos Fraunces 24px. | Parcial: "Protótipo: simular sessão expirada" e atalhos aparecem como botão. | Sim: cada seção tem a sua; só Plano usa o primário. | Parcial. |
| **Comunidade** | Sim: conversa vira título em serifa. | Sim. | Sim: vazio e filtro vazio usam o mascote. | Sim: assunto em `--accent-text`. | Sim. | Sim: 5 conversas por vez. | Sim. | Não: o banner virou parágrafo. | Sim: "Começar uma conversa". | Parcial: o conteúdo é de exemplo e diz isso em cada item. |
| **Comunidade > conversa** | Sim. | Sim. | Sim no vazio (conversa indisponível). | Sim. | Sim: título de 44px e corpo de 17px. | Sim. | Sim. | Não. | Sim: "Responder". | Sim. |
| **Inspiração** | Sim: duas colunas editoriais. | Sim. | Sim: vazio por tema e vazio de salvas usam o mascote. | Sim. | Sim. | Sim. | Sim. | Parcial: dois botões por ideia (Salvar, Usar); necessários, mas repetem 12 vezes. | Parcial: não há um principal; cada ideia tem o seu "Usar". | Parcial. |
| **Ajuda** | Sim: mascote na abertura. | Sim. | Sim: abertura e vazios (sem pedidos, sem termo). | Sim. | Sim. | Sim: texto corrido por seção. | Sim. | Não. | Sim: "Enviar pedido" é o único primário. | Parcial: sem busca global nas perguntas. |


---

# 3ª passada: sistema (espaço, tipo, motion, contraste, mobile-first) e emoção

Escopo: Estilo, Compartilhar (convite, peças, telão), Ajustes (Evento, Privacidade, Equipe, Exportar, Plano), Comunidade (lista e conversa), Inspiração e Ajuda. Arquivo: `host-config.js`.

## O que mudou no código

- **CSS reescrito mobile-first** (base em 320, `min-width` só acrescenta; pontos 560, 640, 700, 760, 800, 1000). Espaço só por `var(--space-N)` (o alias legado `--s-N` saiu: ele estava deslocado, `--s-5` valia 24px), tipografia só por `--fs-*`, medida de leitura por `--measure`, raios por `--r-*`, durações de transição 120 ms (toque) e 200 ms (estado) via `--dur-1/--dur-2`. Nenhum `style` com px sobrou; estilos inline restantes são só valores calculados (percentuais da prévia do telão, `--pa`/`--qw` da placa, cores das amostras).
- **Estados de controle**: `.hc-tl`, botões da faixa (`.hc-seg`), estilos, paleta, índice dos Ajustes e resumos de `details` ganharam transição de cor/borda/transform em 120 ms, `:active` com escala .977, `:disabled` e foco pelo `:focus-visible` global. Alvos mínimos de 44px (inclui o `::before` do interruptor, 44 de altura).
- **Contraste pelo motor central**: sumiu o cálculo próprio (`rgbOf`, `lum`, `ratio`, `legivel`, sonda de cor no DOM). O selo do editor de Estilo agora usa `A.theme.resolve(cor, 'noite'|'papel')` e `A.contrast`, e a prévia do convidado, do telão e do álbum recebe `A.theme.scope(cor, chão)` (botão sobre acento usa `var(--on-ac)`). O QR da placa mede com `A.contrast` contra o papel (`--papel` lido do token). O botão "Escurecer até ficar legível" saiu: o tom é ajustado por construção e a tela diz isso.
- **Estilo no celular**: o editor é a primeira tela; a prévia virou o sheet "Ver como fica" (abas Convidado, Telão, Álbum). Desktop (>=1000) mantém a prévia fixa ao lado, com as três superfícies juntas.
- **Missões no celular**: título e interruptor na mesma linha; as ações (renomear, remover, subir, descer) descem para uma segunda linha alinhada à direita, em vez de espremer o texto a 60px.
- **Placa**: dimensionada por CSS (`aspect-ratio`, `container-type`, `cqw`), sem recalcular em JS por `innerWidth`; texto interno escala com o papel e nunca passa de 12px para baixo; QR proporcional ao milímetro escolhido; o conjunto responde a redimensionar. No celular a placa ocupa no máximo 42% da altura da tela e o link do convidado aparece logo abaixo.
- **Banners sem caixa**: fase e cerimonialista viraram uma linha com ícone entre dois filetes (`.hc-bn`), sem fundo; o aviso "O que muda ao salvar" idem.
- **Alinhamento óptico**: interruptores centralizados na linha, amostras de cor sem margem negativa, amostra de estilo "Aa" em coluna fixa de 48px, mascote da Ajuda em 96px no celular e 128px a partir de 560px, centralização só em vazios e na placa.
- **Autosave**: todo salvamento automático passa por `saved()` (toast único, atrasado 450 ms para não empilhar); entraram o tamanho e a cor do QR, o fundo do QR e a autorização de voz. Telão conectado (código ou link) chama `A.celebrate` no ponto de status, o único momento expressivo do módulo.
- **Tour**: o cartão deixou de usar opacidade em texto e tamanhos fixos; fica acima da barra inferior no celular com `env(safe-area-inset-bottom)`.

## Números

| Verificação | Antes | Depois |
|---|---|---|
| `node tools/lint.mjs host-config.js` | 47 (29 espaço, 15 fonte, 3 `--ev`) | **0** |
| Auditoria renderizada 320, 375, 768, 1280, 1920 (12 rotas) | alvos de 34 a 41px nas abas e índice; busca com 24px; links de 25px; título de post com 36px | sem estouro horizontal, `tinyTargets` 0, `smallTargets` 0 no módulo, `contrast` vazio, sem texto <12px no módulo |
| Texto <12px | prévias com 10,5 e 11px | 12px (a tabbar do núcleo usa 11px e o `pill-count` 11,5px: pedido abaixo) |
| Estados loading, empty, error x dono e cerimonialista x antes, durante, depois | n/a | 7 rotas x 24 combinações renderizam sem exceção nem tela vazia |

## Teste de paletas (editor de Estilo, via `A.theme.resolve`)

Nas dez situações abaixo, o texto do botão "Tirar foto" sobre o acento resolvido, o numeral romano da missão sobre o fundo escuro e os três selos ficaram em 4,5:1 ou mais, e a auditoria renderizada não achou contraste baixo em nenhum elemento da tela.

| Cor | Botão do convidado | Numeral/detalhe no escuro | Observação |
|---|---|---|---|
| Marsala & Marinho | 6,0 | 4,7 | combo 1 |
| Oliva & Areia | 6,0 | 4,7 | combo 2 |
| Terracota & Ocre | 5,0 | 4,8 | combo 3 |
| Ardósia & Rosé | 6,3 | 4,7 | combo 4 |
| Vinho & Dourado | 6,3 | 4,7 | combo 5 |
| Grafite & Champanhe | 6,2 | 5,0 | combo 6 |
| Clara `#F2D64B` | 12,6 | 13,6 | no claro a cor sozinha dá 1,4:1: o selo avisa e mostra o tom ajustado |
| Escura `#14213D` | 6,3 | 5,1 | no escuro a cor sozinha é quase invisível: o motor clareia |
| Saturada `#E0116F` | 4,5 | 4,7 | o mais apertado; passa por pouco, vale vigiar |
| Baixa saturação `#8C7F82` | 4,8 | 5,2 | cinza-rosado fica sóbrio, sem perder leitura |

Placa: com a cor Tinta, o QR passa em qualquer paleta (contraste >15:1). Com "Cor do evento" ou "versão clara", só `#14213D` passa nos 7:1 do QR; as outras mostram o motivo e bloqueiam o download, como combinado.

## Critério emocional

| # | Pergunta | Estilo | Compartilhar (placa) | Ajuda |
|---|---|---|---|---|
| 1 | Acolhimento | Sim: a primeira tela é o editor, com frase curta e a prévia a um toque. | Sim: a placa vem inteira, com o nome do casal em serifa e o filete âmbar. | Sim: mascote na abertura e "fale com a gente" na primeira frase. |
| 2 | Adequada a um casamento elegante | Sim: estilos aparecem como "Aa" na fonte real, sem cartão. | Sim: papel, tinta e sombra rente, sem glossy. | Parcial: texto correto e sóbrio, pouco cerimonial; a elegância vem do mascote e da serifa. |
| 3 | Pessoas e memórias protagonistas | Parcial: a prévia usa ilustração, não foto real (limite do protótipo). | Parcial: a placa é objeto, não gente; o texto "tire suas fotos" é o convite. | Parcial: não há pessoas; o glossário fala de festa. |
| 4 | Moderna sem ser fria | Sim: filetes e ar; acento só em ponto e sublinhado. | Sim. | Sim. |
| 5 | Convidativa a várias gerações | Sim: corpo 16px, alvos de 44px, rótulos sem jargão. | Sim: instrução em uma frase e nome grande. | Sim: glossário em linguagem de festa. |
| 6 | Personalidade ou template | Sim: Fraunces e a prévia viva dão cara própria. | Sim: a placa em escala é a assinatura. | Parcial: o conteúdo é uma lista de leitura; a personalidade está no topo. |
| 7 | Detalhes reforçam a identidade | Sim: ponto de seleção âmbar, numeral romano em `--accent-text`. | Sim: filete âmbar sob o nome. | Sim: mascote oficial. |
| 8 | Animações com significado | Sim: só 120/200 ms de resposta; nenhuma festa de confete. | Sim: "telão conectado" é o único momento expressivo (`A.celebrate`). | Sim: seta do FAQ gira em 200 ms ao abrir. |
| 9 | Conteúdo com o destaque merecido | Sim: decisão (estilo, cor) à frente, sistema atrás. | Sim: placa, depois ação, depois telão. | Sim: busca do glossário e FAQ no topo. |
| 10 | Dá vontade de revisitar | Parcial: depois de escolher, o editor é de uso raro; a prévia convida a voltar a ver. | Parcial: a placa só volta quando preciso imprimir de novo. | Parcial: ajuda é por natureza visita curta. |

Pendências que vêm dos "parcial": a prévia com fotos reais (depende de upload de capa, IDE-09), e o ritual de voltar ao editor (Estilo) depois da festa, hoje sem gancho.

## Pedidos ao núcleo (`core.js`, `ds.css`)

1. `.tabbar a` usa 11px e `.pill-count` 11,5px (abaixo do piso de 12px); os links do `rail` têm 42px de altura (piso 44px).
2. `.search input` mede 24px de altura (o contêiner passa de 44); o módulo contorna com `min-height` local em Comunidade e Ajuda, melhor resolver no componente.
3. Alias `--s-5..--s-8` apontam para `--space-6/8/12/16` (deslocados em um passo); outros módulos que ainda usem `--s-N` herdam valores diferentes do nome.
4. `A.emptyState` não aceita tamanho do mascote; em 320px ele pesa na primeira tela.
5. Sem `chevup` em `icons-lucide.js`; o módulo gira `chevdown` com classe local.

## Convite ao plano Completo

Compartilhar (telão) e Estilo (modelos de telão) mostram uma linha inline via `A.plan.nudge('telao')` e `A.plan.nudge('recurso-exclusivo')`, só em evento Grátis e porque os 4 modelos são do Completo (conferido em `A.data.planos`). Nunca bloqueia o pareamento. Se `A.plan` não existir, não aparece nada. Lint=0.
