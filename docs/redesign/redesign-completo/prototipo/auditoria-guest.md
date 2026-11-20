# Auditoria de arte: superfície do convidado (`guest.js`)

Skill Impeccable: li de fato `critique.md` (Cognitive Load Assessment e os Hard Invariants; o relatório completo de dois sub-agentes não foi rodado, só a avaliação A, feita por mim), `layout.md`, `typeset.md`, `distill.md`, `polish.md` e `craft-floor.md`. O que foi usado: kicker/eyebrow proibido (removi os 4 `t-label` de Música, Recado, Simulador e Fila); no máximo 4 opções visíveis por decisão (Missão e Momento do editor foram para um `details`); uma ação primária por tela (Descartar, Baixar e Abrir no Spotify viraram quiet/link); texto claro sobre escuro com mais entrelinha (`line-height 1.55`) e notas de 13 px; medida de 34ch no Recado; agrupar por filete e espaço em vez de cartão (`layout`/`distill`); polish: estados vazio/erro/carregando verificados em todas as rotas. `detect.mjs` (geral, `--scope layout` e `--scope type`) sobre `guest.js`: `[]` nos três. Limite: o hook não disparou nas gravações por Bash; rodei o detector manualmente.
Observação: não consegui abrir aba própria (`tabs_create` recusado por limite de abas); usei a aba compartilhada. Verificado em 375 px (Capa, Nome, Câmera, Editor, Confirmação, Explorar, Álbum, Missões, Música, Recado, App) e em 1360 px (a moldura de celular aparece centrada; conferi Música). Todas as rotas, nas fases Antes/Durante e nos 4 estados, renderizam sem erro de console. Confessionário, Compartilhar externo e o sheet de gravação foram só renderizados, sem screenshot.

## Capa (`#/g/:slug`)
1 antes parcial (imagem abstrata + título); agora sim, monograma do evento. 2 n/a (a logo não é do convidado). 3 não, correto aqui. 4 antes usava a cor do evento no botão; agora `--ac`. 5 antes genérica (círculos), agora com personalidade. 6 adequada: convite, nome, data, local, uma ação. 7 clara. 8 imagem removida. 9 sim. 10 médio-alto. Falta: a fonte da data é a de `A.when`; o dia da semana pode não bater com a data fictícia.
## Nome e consentimento
1 sim. 4 ok. 5 o campo de assinatura (Fraunces 30) deu personalidade. 6 consentimento reduzido a uma frase e link para o termo. 7 título, campo, aceite, botão. 8 nenhum. 9 sim. 10 alto.
## Câmera
1 parcial. 3 não (correto). 5 antes um cartão tracejado; agora visor sangrando com cantos e obturador de 88 px. 6 menos: amostras e simulação de sinal ficam recolhidas ou discretas. 7 obturador domina. 8 vídeo e galeria são laterais pequenas. 9 sim. 10 médio-alto. Limite: o visor é simulado, sem câmera real.
## Envio e confirmação da 1ª foto
1 sim (arco da marca). 3 sim, mascote espiando. 4 ok. 5 forte. 6 uma linha honesta, o arco e a missão. 7 mascote, status, ação. 8 miniatura da foto só nas fotos seguintes. 9 sim (próxima missão). 10 alto. Fora do marco "primeira foto" a tela fica mais sóbria, sem mascote grande, só estrela de 76 px não aparece.
## Explorar e Álbum
1 parcial: identidade vem de tipografia e filete. 5 antes: cartão por post com botões; agora foto sangrando, metadados e reação em texto. 6 aviso do gate encurtado. 7 ok. 8 histórias reduzidas a 46 px. 9 ação principal é fotografar (barra inferior). 10 médio-alto. Álbum: numeral grande como herói. Defeito resolvido: o feed nasce com 24 fotos de exemplo, rotuladas.
## Missões
5 lista editorial com romanos; 6 progresso em filete, filete âmbar nas feitas; 8 botões de cartão removidos; 9 Fotografar na missão atual. 10 alto.
## Estados (inexistente, trocado, não começou, encerrado, link expirado/inválido, sem sessão, offline)
Todos com mascote, copy calorosa e uma ação visível. 10 médio-alto. Offline: faixa de uma linha e, na Fila, mascote com explicação.
## Perfil, Minhas fotos, Consentimento
Perfil: nome em Fraunces e "Mudar nome" como link. Consentimento: termo em filetes, revogar sem tom de culpa e com a consequência escrita; Minhas fotos mantém a grade com estado por foto. 10 médio-alto.
## Telas recompostas na 2a rodada
- **Música:** título da trilha em Fraunces, "Abrir no Spotify" virou link, pedidos em lista numerada (romano) com voto em texto/botão de contorno; uma ação primária (Pedir uma música). Antes: cartão com kicker e dois botões de peso igual.
- **Recado:** a mensagem é o herói (Fraunces 24, 34ch) e a assinatura dos anfitriões; um botão (Li, obrigado). Vazio com mascote.
- **Confessionário:** perguntas em Fraunces com Responder/Apagar em link; campo de texto em Fraunces; a gravação mostra o `A.arc` (segundos até 30).
- **App/pareamento:** código de 4 dígitos grande, com `A.arc` do tempo restante; simulador em filete com campo `.input-sign`; instalação na tela inicial virou link.
- **Compartilhar externo:** estado bloqueado com mascote; Baixar imagem vira quiet (Compartilhar é a única ação primária).
- **Editor de filtros:** legenda com `.input-sign`, Missão e Momento recolhidos em `details`, Descartar quiet.
- **Nome (sheet):** `.input-sign`.

## Pendências
Perfil de outro convidado, Minhas fotos e Fila só receberam ajustes pontuais. `A.star` só aparece na confirmação da 1a foto. Imagens `A.img`/`A.photo` seguem como ilustração sóbria de protótipo.

# 3ª passada: sistema, social e emoção

## Verificação determinística
- `node tools/lint.mjs guest.js`: antes 53 espaço + 25 fonte + 2 duração; depois **0**. Migrei os aliases legados `--s-N` (em que `--s-5` valia 24px) para `--space-N` com os mesmos pixels, fontes para `--fs-*` e as duas animações longas para tokens (`gxscan` = 8 × `--dur-3`; `gxplay` com duração por variável).
- `node --check guest.js`: ok. Console sem erro em todas as rotas.
- Auditoria renderizada (`AUDIT.run()`, 19 rotas do módulo, fase Durante, com sessão, upload de exemplo e foto 9:16):

| Largura | overflowX | tinyTargets | smallTargets | contrast | textMin |
|---|---|---|---|---|---|
| 320 | não | 0 | 0 (após ajuste de "mais" e chips) | vazio | 11 (rótulos da `.gnav`, núcleo) |
| 375 | não | 0 | 0 | vazio | 12 (11 na `.gnav`, núcleo) |
| 768 | não | 0 | 0 | vazio | 12 |
| 1280 | não | 0 | 0 (após `min-width` na navegação superior) | vazio | 12 |
| 1920 | não | 0 | 0 | vazio | 12 |

O único `clipped` restante é o `sr-only` "(novo)" (falso positivo). Limite honesto: texto sobre foto não é medido pelo detector.

## Paletas do evento (`A.data.events[0].cor`, `A.render()`)
Telas medidas: capa pública, Nome, Explorar, Missões e Câmera; contraste real sem ocorrência em todas.

| Cor | acento (fill) | texto de acento | rótulo no botão (`--on-ac`) | resultado |
|---|---|---|---|---|
| `#F2D64B` clara | 13,6:1 | 13,6:1 | tinta, 12,6:1 | ok |
| `#14213D` escura | 3,04:1 (clareada pelo motor) | 5,05:1 | papel, 6,3:1 | ok, o acento vira um azul-acinzentado discreto |
| `#E0116F` magenta | 4,2:1 | 4,66:1 | papel, 4,53:1 | ok |
| `#8C7F82` baixa saturação | 5,15:1 | 5,15:1 | tinta, 4,75:1 | ok |
Correções de token neste módulo: marca de seleção do aceite usava `--noite` fixo (agora `--on-ac`); numeral romano e "Você votou" usavam `--ac` como texto (agora `--accent-text`).

## Capa e Nome (B)
- Conjunto: monograma do evento (Fraunces, aparado à altura das maiúsculas com `text-box` quando o navegador suporta), filete de acento, convite, título, data e local, CTA. O mascote não entra na capa por decisão: só aparece em estados, vazios e na 1ª foto.
- Equilíbrio vertical por tokens (`--space-*`); centralização matemática (monograma centrado no espaço livre acima do convite) e óptica (grupo erguido por `padding-bottom`, sem margem negativa nem `transform`).
- CTA na mesma coluna que o texto (largura 100%, máx. `--w-feed`), rótulo `--on-ac`, texto secundário em `--fg-2`.
- Cor do botão = acento do evento derivado por `A.theme`: **é personalização legítima** e fica como está; a aplicação foi confirmada nas quatro paletas acima.
- Larguras: 320×568 (tudo visível, rodapé do CTA incluso, com regra de altura curta), 360, 390, 430 (retrato, mesmo layout), **paisagem 844×390** (duas colunas, sem moldura, CTA visível; no Nome a barra do CTA fica fixa), desktop (moldura de celular centrada).
- `.proto-bar` é só uma alça de 22px na borda esquerda, fora da coluna de 24px de margem: não cobre CTA, nada depende dela.

## Critério emocional (Explorar, Álbum, capa, comentários)
1 acolhimento: sim; "Você foi convidado para", "É só chegar", "Seja o primeiro a reagir", "Que tal começar?". 2 casamento elegante: sim; Fraunces, filete, sem confete nem coração decorativo (o coração só existe como ícone funcional de reação). 3 pessoas e memórias: sim; foto em largura total, avatar e nome logo acima, interface recua. 4 moderna sem ser fria: sim; cabeçalho de post, ações em linha, bottom sheet. 5 várias gerações: parcial; alvos de 44px e rótulos acessíveis, mas o toque longo e o duplo toque precisam de descoberta (há botão equivalente e ícone auxiliar). 6 personalidade ou template: parcial; a estrutura é a familiar de feed social, a assinatura está na tipografia, no filete âmbar e no tom do texto. 7 identidade Albora: sim; acento do evento, âmbar em filete, Fraunces nos nomes. 8 animações com significado: sim; coração pulsa (200 ms), duplo toque mostra o coração sobre a foto (320 ms), a foto abre a partir do lugar onde estava (FLIP, 320 ms), tudo só transform/opacity e desligado com `prefers-reduced-motion`. 9 destaque do conteúdo: sim; foto sem moldura, legenda em 2 linhas com "mais". 10 revisitar: parcial; o desktop ganhou coluna de momentos e missões, mas a fotos de exemplo são ilustrações; com fotos reais isso melhora, pendência de conteúdo.

## Pendências e pedidos ao núcleo
- `icons-lucide.js` não tem `smile-plus` (registrei localmente); `.gnav` usa 11px (abaixo dos 12px do sistema).
- Toque longo, teclado virtual e FLIP foram verificados por código e em janela redimensionada, não em aparelho real.
- No desktop, as demais telas do convidado (Missões, Perfil etc.) continuam na moldura de celular; só Explorar e Álbum têm layout próprio, como pedido.

## Cromo antes da 1ª foto (Explorar, 375×812)
Antes: cerca de 540 px até o cabeçalho do post (título, abas, stories de 48 px com margem, aviso de 3 linhas, chips com 24 px de margem). Depois: a mídia da 1ª foto começa em **344 px** com o aviso visível (cerca de 296 px sem ele) e **49% da altura da janela** mostra a foto (medido por `getBoundingClientRect` do `.gx-pm`, descontando a `.gnav`). Decisões: Fotos/Álbum passaram para o cabeçalho, na linha do título (no desktop voltam para a coluna); stories de 40 px (trilho de cerca de 60 px); o aviso do gate virou 1 frase com botão de dispensar, e o descarte persiste por estado (Fechado e Aberto reaparecem uma vez cada); chips mantidos em 48 px, com margem de 12 px. Lint 0; `AUDIT.run()` em 320/375/768 nas rotas Explorar e Álbum sem overflow, alvos pequenos, contraste nem corte.

## Varredura de transbordo (`overflowChild`) e reflow
- Achados a 320 e causas: Missões e Música (linha com numeral + texto + ação sem quebra: `flex-wrap`, base de 120 px e `overflow-wrap`), Fila (a área de toque do `.switch` vazava 4 px: `inset` sem margem lateral e `flex:none`), capa pública (o halo `::before` do monograma vazava 100 px: `inset` só vertical; monograma com `clamp(56px,28vw,124px)`), cabeçalho com a pílula "Sem sinal" (agora quebra de linha), link "Tentar de novo" sobre o aviso (contraste 3,95: passa a `--fg`).
- `AUDIT.run()` nas 19 rotas, com fila offline e uma foto com falha: 320, 375, 768, 1280 e 1920 sem overflowX, overflowChild, alvos pequenos nem contraste. Lint 0.
- 160 px de largura útil (equivalente a 200% de zoom em 320): botões, controles da câmera e capa já se adaptam; restam transbordos só em componentes do núcleo (`.gnav` com 206 px, linhas `.li`) e em blocos de largura fixa (obturador, mascote). Declarado como não suportado abaixo de 320.
- Paisagem 844×390: câmera em duas colunas (obturador em 189–277 px, visível sem rolar), confirmação com a barra de ações fixa na base (330–378 px), capa e Nome já tratados. Nenhum CTA fica atrás da `.gnav` (o conteúdo rola dentro do `main`).
- Teclado virtual (janela de 375×420 como simulação, não é teclado real): campo de nome visível acima da barra fixa do CTA (`scroll-margin-bottom` e `.gx-submit` fixo); sheet de comentários com o campo a 312–420 px.


## Atualização — 25/10/2026

Consentimento agora identifica explicitamente o contexto demonstrativo e a exclusão local. Aceite desmarcado, termo e retorno de foco verificados.

Evidências atuais: [relatório da continuação](../10-continuacao-prototipo.md), [JSON de validação](evidencias/validacao-continuacao.json). Os resultados anteriores são históricos.
