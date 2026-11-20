# Auditoria de arte — host-evento.js (Hoje, Fotos, Convidados)

Método: cada tela foi aberta no navegador (desktop 1360 e celular 375) antes e depois da correção. As 10 perguntas: 1 identidade reconhecível · 2 logo oficial correta · 3 mascote/avatar nos contextos certos · 4 âmbar correto (cromo ≠ cor do evento) · 5 genérica ou com personalidade · 6 quantidade de informação · 7 hierarquia · 8 componente desnecessário · 9 ação principal evidente · 10 nível de produto consolidado.
Formato de cada linha: **Antes** (1ª versão) → **Depois** (versão entregue). S = sim, N = não, P = parcial.

Skill Impeccable usada: `layout.md` (teste do aperto de olhos, agrupar por proximidade, ritmo), `distill.md` (remover o que não ganha lugar: lateral, miniaturas, barra de progresso, cartões), `typeset.md` (Fraunces só nos números e títulos-herói, corpo em Instrument Sans, números tabulares), `craft-floor.md` (proibições: kicker acima de título, cartões de ícone+título+texto, borda lateral colorida, métrica-herói genérica, numeração de seções; verificações de contraste, estados e foco), `polish.md` (ordem de triagem: caminho quebrado → estados → hierarquia → visual) e `animate.md` (um só momento autoral: o ponto do arco; o resto sem animação). O detector (`detect.mjs`, escopos padrão, layout e type) rodou limpo nos dois arquivos; o hook de design não apontou nada ao gravar.

## 1. Hoje · Antes

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1 | Identidade reconhecível | N: título "Hoje", etapa em caixa e lateral de cartões, serviria a qualquer SaaS → S: o arco da logo é o herói e carrega a contagem |
| 2 | Logo oficial | S (vem do núcleo) → S; o arco do herói usa a mesma geometria da logo |
| 3 | Mascote/avatar | N, e certo: não é vazio nem sucesso → N, e certo (o mascote fica para vazios e para o Pronto) |
| 4 | Âmbar correto | P: barra de progresso e itens em `--ev` → S: só `--ac` (arco, ponto-sol, sublinhados, foco); `--ev` não aparece no cromo |
| 5 | Genérica ou personalidade | N: checklist com barra de progresso e cartões → S: o ponto-sol percorre o arco até a data; número em Fraunces leve |
| 6 | Informação | N: 5 blocos competindo (próximo passo, checklist, regras, contagem, ideias, prévia) → P: herói, um passo, lista curta, regras; "ideias" virou um link |
| 7 | Hierarquia | P: o botão do passo e a contagem brigavam → S: número, nome da festa, passo, lista (squint test passa) |
| 8 | Componente desnecessário | S, havia: barra de progresso, lateral, lista de ideias, rótulo "Próximo passo" acima do título → removidos |
| 9 | Ação principal | S → S, agora única e centrada (um botão primário) |
| 10 | Nível de produto | P → P+: falta o arco reagir ao concluir o checklist (decisão: o arco é tempo, não progresso de tarefas) |

## 2. Hoje · Durante

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1 | Identidade | N: quatro números em grade e miniaturas → P: foto viva grande e numerais em Fraunces; a identidade vem da tipografia e da foto |
| 2 | Logo | S → S |
| 3 | Mascote | N, e certo → N, e certo (fila limpa vira uma linha de texto, não ilustração) |
| 4 | Âmbar | P: gráfico e barras em `--ev` → S: barras do ritmo por hora e links em `--ac`/`accent-text`; badge "Ao vivo" em brasa |
| 5 | Personalidade | N → P: a última foto grande mostra a festa de verdade; falta movimento (decisão: sem animação de entrada para não competir com a foto) |
| 6 | Informação | N: tudo ao mesmo tempo, com lateral → S: faixa viva (foto + 3 números), controles discretos, fila, regras recolhidas, ritmo no fim |
| 7 | Hierarquia | P → S: a foto é o herói, os números vêm ao lado, controles em linha fina |
| 8 | Desnecessário | S: faixa de miniaturas (repetia a última foto), cartão do telão, avatares de ativos, bloco de regras aberto → removidos ou recolhidos |
| 9 | Ação principal | N: "Pausar tudo" gritava → S: não há primário; "Pausar tudo" fica discreto à direita e a ação do dia (revisar) é um link no número |
| 10 | Nível de produto | P → P+: a foto nova entra sem animação (limitação aceita, ver relatório) |

## 3. Hoje · Depois (Reviver)

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1 | Identidade | N: título + botão + passos numerados → S: a capa do álbum com o disco de "play" em âmbar é o herói |
| 2 | Logo | S → S |
| 3 | Mascote | N → N (o mascote aparece no vazio "fotos apagadas") |
| 4 | Âmbar | S → S: só o ícone de play sobre o disco |
| 5 | Personalidade | N → S: foto mais curtida em retrato, frase "As fotos são de vocês." em Fraunces |
| 6 | Informação | N: cinco passos numerados em cartões lógicos → P: cinco passos continuam (funcionalidade), mas em filete e sem numeração |
| 7 | Hierarquia | P → S |
| 8 | Desnecessário | S: números de 1 a 5, rótulo "Reviver" acima do título → removidos |
| 9 | Ação principal | S → S: "Assistir o Reviver" (primário único) |
| 10 | Nível de produto | P → P+: os passos ainda são uma lista longa; poderia ser um passo por vez (fora do escopo) |

## 4. Hoje · modo Casal (Acompanhar)

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1–3 | Identidade, logo, mascote | iguais às fases acima (usa os mesmos heróis) |
| 4 | Âmbar | P → S |
| 5 | Personalidade | P → S: herda arco, foto viva e capa |
| 6 | Informação | S: só leitura onde é do organizador → S |
| 7 | Hierarquia | S → S |
| 8 | Desnecessário | N → N: o interruptor "Ver painel completo" permanece no topo |
| 9 | Ação principal | S: aprovar fotos na festa → S |
| 10 | Nível | P → P |

## 5. Fotos (grade, filtros, lista)

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1 | Identidade | N: chips, bordas, selos em todas as fotos → P: grade contínua e abas em texto com sublinhado âmbar |
| 2 | Logo | S → S |
| 3 | Mascote | S (vazios do núcleo) → S |
| 4 | Âmbar | P: seleção e barra em `--ev` → S: seleção, sublinhado e contador em `--ac` |
| 5 | Personalidade | N → P: a grade sem moldura deixa a festa aparecer; foto horizontal ocupa duas colunas |
| 6 | Informação | N: selo "No telão" e rótulo em toda foto → S: só aparece o que exige decisão (para revisar, oculta); oculta esmaece |
| 7 | Hierarquia | P → S: filtro ativo sublinhado, contagem discreta, ações só na seleção |
| 8 | Desnecessário | S: chips-caixa, ícone de telão em cada tile, bolinha de seleção sempre visível → removidos (a bolinha aparece no hover/foco) |
| 9 | Ação principal | P: não há uma, é triagem → P: a barra em pílula aparece só com seleção; atalhos A, R, Z |
| 10 | Nível de produto | P → P+: no celular a bolinha fica sempre visível (sem hover) |

## 6. Fotos · ampliação (lightbox)

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1 | Identidade | N: modal branco de duas colunas → S: tela cheia no escuro, foto inteira, sem cortar |
| 2 | Logo | — |
| 3 | Mascote | — |
| 4 | Âmbar | P → S: botão Aprovar em `--ac` do tema noite; autor em âmbar legível |
| 5 | Personalidade | N → S: cinematográfica; a foto é a interface |
| 6 | Informação | N: lista de dados em coluna → S: uma linha (autor, status, hora, missão, reações) |
| 7 | Hierarquia | P → S: foto, depois autor, depois ações |
| 8 | Desnecessário | S: lista de definição, título "Foto" → removidos; comentários num `<details>` |
| 9 | Ação principal | P → S: Aprovar/Restaurar em destaque quando há decisão; Remover em perigo |
| 10 | Nível | P → P+: sem gesto de arrastar no celular (setas apenas) |

## 7. Convidados · Lista

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1 | Identidade | N → P: funil tipográfico em Fraunces, número de fotos como numeral |
| 2 | Logo | S → S |
| 3 | Mascote/avatar | P: avatares de iniciais em toda linha → N, e certo: avatares removidos da lista (o nome e o número de fotos bastam) |
| 4 | Âmbar | P → S |
| 5 | Personalidade | N: lista com selo e avatar → P: a lista é editorial; o funil dá o tom |
| 6 | Informação | N: funil repetido em Participação, Insights e aqui → S: um funil, no topo, uma vez |
| 7 | Hierarquia | P → S: funil, abas, busca, linhas |
| 8 | Desnecessário | S: chips-caixa, avatares, lead repetindo o funil → removidos |
| 9 | Ação principal | P: abrir a ficha → P (a ação é abrir a ficha; Exportar CSV é secundário) |
| 10 | Nível | P → P+ |

## 8. Convidados · Números e ficha do convidado

| # | Pergunta | Antes → Depois |
|---|---|---|
| 1 | Identidade | N → P |
| 2–3 | Logo e mascote | S / N, e certo (Números antes da festa usa o vazio com mascote) |
| 4 | Âmbar | P: barras em `--ev` → S: barras do funil removidas, gráfico por hora em `--ac` |
| 5 | Personalidade | N → P: veredito em uma frase |
| 6 | Informação | N: quatro blocos de números + funil de barras → S: o funil foi para o topo; ficam confirmar quem veio, canais, missões e ritmo |
| 7 | Hierarquia | P → S |
| 8 | Desnecessário | S: faixa de quatro números e barras horizontais → removidos |
| 9 | Ação principal | S: "Confirmar" o número real → S |
| 10 | Nível | P → P: canais são porcentagens ilustrativas |
| Ficha | A ficha em sheet manteve fotos, missões e ações (bloquear, ocultar nome, reenviar) | Sem mudança de composição; âmbar e foco corretos |

## Decisões que não cabem na tabela

- Eventos "e2" e "e3" usam as mesmas composições; a fase "depois" do e2 mostra a capa do álbum com a foto mais curtida.
- Nada de hex, gradiente decorativo, sombra pesada, emoji ou ícone fora de `A.icon`. Todos os `var(--ev)` de cromo foram trocados por `var(--ac)` (o arquivo não usa `--ev` em nenhum lugar agora).
- Raios: botão pílula, ampliação sem raio (tela cheia), foto da grade sem raio (a foto é a interface), foto grande da faixa viva 12, superfícies 18 (nenhuma restante).

## 3ª passada: sistema (espaço, tipo, motion, contraste, mobile-first)

Lint (`node tools/lint.mjs host-evento.js`): antes 28 (fonte 6, espaço 21, duração 1) → depois 0. Auditoria renderizada em 320, 375, 768, 1280 e 1920 (Hoje nas 3 fases, Fotos, Convidados): sem overflow horizontal, `tinyTargets` 0, contraste sem falhas.

| Ponto | Antes → depois |
|---|---|
| Espaço e tipo | px soltos (6, 10, 18, 56, 72, 11.5, 12.5, 13, 15) → `--space-N` e `--fs-*`; numerais herói (contagem, "no ar", funil) em `--fs-hero`/`--fs-display` |
| Motion | `fade .25s` do lightbox → 320 ms; foto nova ao vivo entra com `hv-in` 200 ms (opacidade + escala .97→1) |
| Lightbox | setas centradas com `margin-top` negativo → `top:0;bottom:0;margin-block:auto` |
| Contador do "cdTarget" | Causa: o alvo era `agora + N dias` fixado na primeira abertura, então toda festa nova mostrava "0 h 00 min". Agora o alvo é a hora marcada do evento (`dataIso` + `hora`) menos o "hoje" do protótipo (14/11 12:00): festa amanhã às 19:00 mostra "1 dia e 6 h 59 min"; a festa de hoje de manhã mostra horas/minutos |
| Seleção em lote | A barra "N selecionadas" não colava: ficava dentro de um `div` sem altura. `#hv-bulk{display:contents}` corrige (antes: invisível ao selecionar no topo; depois: presa acima da barra inferior) |
| Alvos | Bolinha de seleção já tinha 44×44 (círculo visual 24); busca de Fotos/Convidados com input de 44; aba "Lista" com largura mínima; botões de filtro com 44 e rolagem horizontal em vez de 3 linhas no celular |
| Convidados antes da festa | Mesma informação três vezes (lead, aviso e funil) → uma só, no funil, com o convite a reenviar |
| Reviver (mobile) | Capa 4:5 empurrava o título para fora da tela → 1:1 abaixo de 860 px |
| Exportar para a nuvem | Botão nowrap estourava 320 px → botões da linha quebram o texto |

### Critério emocional (Hoje, Fotos, Reviver)

| # | Pergunta | Hoje | Fotos | Reviver |
|---|---|---|---|---|
| 1 | Acolhimento | Sim: o arco com o ponto-sol e o número grande dão calma | Parcial: filtros e busca vêm antes das fotos no celular (agora numa linha rolável) | Sim: "As fotos são de vocês." |
| 2 | Casamento elegante | Sim: Fraunces, filetes, sem caixas | Sim | Sim |
| 3 | Pessoas e memórias | Parcial: antes da festa só há contagem; na festa a última foto é protagonista | Sim: grade sem moldura | Sim: capa do álbum |
| 4 | Moderna sem frieza | Sim | Parcial: barra de seleção escura é funcional, não calorosa | Sim |
| 5 | Várias gerações | Sim: corpo 16, alvos 44, sem jargão | Parcial: atalhos A/R/Z são para quem organiza | Sim |
| 6 | Personalidade | Sim: arco-contagem | Parcial: a grade é boa, a casca ao redor é de painel | Sim |
| 7 | Identidade Albora | Sim: logo-arco como progresso, âmbar só em filete/ponto | Sim | Sim |
| 8 | Animações com significado | Sim: foto nova entra em 200 ms | Sim: abrir foto suave | Sim: sem confete |
| 9 | Destaque merecido | Sim | Sim | Sim |
| 10 | Revisitar | Sim: contador vivo | Sim | Sim |

Pendências: no celular a lista de filtros ainda precede as fotos; um cabeçalho compacto de Fotos exigiria mudar a estrutura do `hostShell` (pedido ao núcleo).

### Convite do plano (`A.plan.nudge`)
- Hoje/antes: `nudge('antes-da-festa')` como linha discreta abaixo do próximo passo, só evento Grátis e fora do modo Acompanhar; Fotos: `nudge('limite-gratis')` só com 40 fotos ou mais (contador real, limite de 50) e nunca em Durante.
- Sem `A.plan.nudge` disponível (ou devolvendo vazio) nada é renderizado; não verifiquei visualmente porque a função ainda não existia no núcleo.


## Atualização — 25/10/2026

Fotos: busca/ordenação recolhidas no celular. Hoje/antes: composição em duas colunas em paisagem baixa. Ver relatório 10 e capturas.

Evidências atuais: [relatório da continuação](../10-continuacao-prototipo.md), [JSON de validação](evidencias/validacao-continuacao.json). Os resultados anteriores são históricos.
