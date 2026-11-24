# Auditoria de arte — console (`#/c`)

Segunda passada. Direção: operacional, preciso, denso; tinta e papel; âmbar (`--ac`) só em foco, seleção e estado ativo; sem mascote e sem ilustração; hierarquia por tipografia e filete. Auditado em 1360 e 375 de largura. Impeccable usado: `critique`, `craft-floor`, `polish`, `layout`, `typeset`, `operate`, `distill` (cortar cartões e blocos repetidos).

Legenda das 10 perguntas: 1 identidade, 2 logo, 3 mascote/avatar, 4 âmbar, 5 personalidade, 6 quantidade de informação, 7 hierarquia, 8 componente desnecessário, 9 ação principal, 10 nível de produto. S = sim, N = não, P = parcial. “Antes” é o que a auditoria achou; “Depois” é o que está no código agora.

## Achados comuns (todas as telas)

| Achado | Antes | Depois |
|---|---|---|
| Logo | Círculo âmbar com “a” e a palavra “albora” escrita à mão no login; menu lateral sem etiqueta | `A.logo` oficial no menu e no login, com a etiqueta “console” (`cfg.tag`); no celular a barra do topo ganha logo + “console” |
| Contexto de sessão | Rótulo “Console da equipe” e um selo de papel; “ver como” só aparecia em faixa quando ativo; no celular a barra do topo some e o papel não aparecia | Faixa discreta e sempre visível: papel, pessoa, identidade confirmada, “Ver como: nenhum” ou “Vendo como X até HH:MM”; no celular a mesma faixa entra no topo do conteúdo |
| Âmbar | Selo de administração em âmbar; foco padrão do navegador | Âmbar só em foco (`:focus-visible`), linha da fila selecionada, aba do menu atual, chip ativo (sublinhado) e o ponto de “vendo como” |
| Vazios | Ícone de 40px sobre título centralizado em todo vazio | Texto alinhado à esquerda sobre um filete, sem ícone nem mascote (`vazio()`); erro mantém o ícone de alerta por ser funcional |
| Cartões | Blocos de número (KPI) na visão geral, em Assinaturas e LGPD; faixas com fundo para explicar papéis, filtros e aviso de leitura | Faixa de números em linha com filete (`figs`), linhas de tabela, `details` para a explicação dos papéis, nota com filete |
| Tabelas | Linhas de 48 a 62px, texto quebrando em 2 e 3 linhas, cabeçalhos fg-3 | Linhas de 43 a 47px (texto em uma linha com reticências; motivo completo no `title` e em “Detalhes”), botão 36px com área de toque de 44px |
| Contraste | Texto pequeno e cabeçalhos em `--fg-3` (limite de 4,5:1) | Dentro do console, texto pequeno, `muted`, cabeçalhos e dt usam `--fg-2` |

## Visão geral — `#/c`

| # | Resposta |
|---|---|
| 1 | P → S. Antes parecia o painel de qualquer SaaS (cartões de KPI + barras). Agora é uma fila numerada com a marca no menu. |
| 2 | N → S. Logo oficial com “console”. |
| 3 | S. Avatar monocromático (tinta) para a pessoa da equipe; sem mascote. |
| 4 | S. Marcadores de urgência usam brasa (estado), não âmbar; âmbar só no foco da linha. |
| 5 | N → P. Personalidade vem da lista ordenada e da tipografia; é seca de propósito. |
| 6 | N → S. Antes 5 seções com 4 cartões e 4 barras; agora uma fila (10 itens) e uma tabela de leituras. |
| 7 | S. “Precisa de atenção agora” é o primeiro bloco; leituras vêm depois; ao vivo por último. |
| 8 | S → N. Cartões de KPI, barras do funil e bloco de série de participação removidos (dados mantidos como linhas). |
| 9 | S. A ação é abrir o 1º item da fila; cada linha leva à tela já filtrada. |
| 10 | P → S. Estados de carregando, vazio e erro com texto próprio por bloco. |

Composição: antes título + lead + chips + 5 seções com cartões; depois título + fila ordenada por urgência (urgentes primeiro, depois maior atraso), com prazo e responsável em cada linha, “Por área: …” como resumo; “Leituras” em tabela com os chips de período ao lado do título; “Acontecendo agora” em lista de filetes.

## Entrar e Confirmar identidade — `#/c/entrar`, `#/c/reauth`

| # | Resposta |
|---|---|
| 1 | P → S. Logo oficial + “console”; resto continua seco. |
| 2 | N → S. |
| 3 | S. Sem mascote. |
| 4 | S. Botão primário em tinta. |
| 5 | P. Comum para login, aceitável no console. |
| 6 | P. A seção “Contas de teste do protótipo” fica longa; é só do protótipo e está rotulada. |
| 7 | S. Um título, um formulário. |
| 8 | P. “Entrar com Google” é segundo botão por exigência do inventário (F70). |
| 9 | S. “Enviar link de acesso”. |
| 10 | S. Erros dizem o que houve e o que fazer. |

## Contas, Eventos, Assinaturas, LGPD, Retenção, Equipe interna — listas

| # | Resposta |
|---|---|
| 1 | S. Mesma tabela, mesma faixa, mesmo menu. |
| 2 | S. |
| 3 | S. Sem mascote e sem ilustração, inclusive nos vazios. |
| 4 | S. Chip ativo e item de menu atual com filete âmbar; sem preenchimento âmbar. |
| 5 | P. Personalidade fica na tipografia do título e na densidade; sem enfeite. |
| 6 | N → S. Antes: três cartões de número em Assinaturas e LGPD, mais um aviso de papéis em Equipe. Agora: uma linha de números com filete e `details`. |
| 7 | S. Busca, filtros e tabela; contagem “N de M · página” em cima. |
| 8 | S → N. Cartões de número e aviso com fundo removidos. |
| 9 | S. Em cada lista a ação por linha é “Gerir” ou “Atender”, e o título leva à ficha. |
| 10 | S. Ordenação sobre todos os resultados, paginação, estados e permissão por papel. |

## Fichas — `#/c/contas/:id`, `#/c/eventos/:id`

| # | Resposta |
|---|---|
| 1 | S. |
| 2 | S. |
| 3 | S. Avatar com iniciais em tinta. |
| 4 | S. |
| 5 | P. Cabeçalho com avatar e dados; seções por filete, sem cartão. |
| 6 | P. Ficha de conta ainda tem 6 seções; cada uma tem dado próprio. “Ver como” e “Trilha” poderiam ir para abas num produto real. |
| 7 | S. Seções com título de 16px e filete. |
| 8 | P. A participação do evento ainda usa barras (`cx-bar`), porque mostra 4 etapas em ordem; mantidas por serem a leitura natural do funil. |
| 9 | S. Ação principal no topo (“Revelar contato” / “Abrir ticket”), menu “Mais ações” para as perigosas. |
| 10 | S. Ações perigosas pedem motivo, confirmação de identidade quando preciso e confirmação com a consequência escrita. |

## Suporte — `#/c/suporte`

| # | Resposta |
|---|---|
| 1 | S. |
| 2 | S. |
| 3 | S. |
| 4 | S. Linha selecionada ganha filete âmbar à esquerda. |
| 5 | P. |
| 6 | P. Os filtros ocupavam cinco linhas de chips; no desktop passam a ficar lado a lado. |
| 7 | S. Fila à esquerda, conversa à direita. |
| 8 | S → N. Faixa “seu papel só lê” virou nota com filete; painel vazio não usa mais ícone. |
| 9 | S. “Enviar resposta” é o único primário no painel; “Abrir ticket” fica no topo como secundário. |
| 10 | S. |

## Auditoria e Segurança — `#/c/auditoria`, `#/c/seguranca`

| # | Resposta |
|---|---|
| 1 | S. |
| 2 | S. |
| 3 | S. |
| 4 | S. |
| 5 | P. |
| 6 | S. Auditoria em tabela de uma linha por registro; segurança agrupa por tipo com histograma de 7 dias. |
| 7 | S. |
| 8 | N. |
| 9 | P. Em Segurança o “Reconhecer” só aparece quando há alerta; em Auditoria a ação é “Exportar CSV” (só administração). |
| 10 | S. Registro imutável (sem editar nem apagar), exportação também auditada. |

## O que ficou de fora

- Segurança ainda tem uma seção por tipo com `details`; poderia virar uma tabela única filtrável, mas isso mudaria o fluxo de F116 a F118.
- Barras do funil do evento (`cx-bar`) continuam na ficha do evento.
- A faixa de contexto não é fixa (sticky) no celular; no desktop fica na barra do topo, que é fixa.
- Teste com leitor de tela não foi feito.

## 3ª passada — sistema (espaço, tipo, movimento, contraste, mobile-first) e critério de confiança e precisão

Impeccable usado: `operate`, `layout`, `typeset`, `polish`, `distill`. Rodado em 320, 375, 768, 1280 e 1920, em todas as rotas `#/c/*` (visão, contas, ficha de conta, eventos, ficha de evento, assinaturas, suporte com e sem ticket aberto, retenção nas duas visões, LGPD, auditoria, segurança, equipe, entrar, confirmar identidade, 404).

### Números

| Medida | Antes | Depois |
|---|---|---|
| `node tools/lint.mjs console.js` | 19 (13 espaço, 6 fonte) | **0** |
| Rolagem horizontal em `.table-wrap` (375) | 25 a 614 px em 12 telas (suporte e auditoria: 200 e 614) | **0** em todas as larguras |
| `overflowX` da página | 0 (mas cabeçalho da ficha de evento passava 70 px da tela em 375) | 0 |
| Alvos < 24 px (`tinyTargets`, 375) | 1 a 6 por tela | **0** |
| Alvos entre 24 e 44 px (`smallTargets`) | 4 a 35 por tela | **0** em todas as larguras |
| Contraste (`contrast`) | 1 a 4 por tela (chips) | **0** |
| Menor texto (`textMin`) | 11 | **12** |

### Estratégia de tabelas (decidida por tabela)

Regra única, medida no bloco da tabela (container query), não na janela: **< 760 px** cada linha é um item de lista com título (o nome ou assunto), 2 a 3 campos com rótulo, ações da linha e “Detalhes” sob demanda; os cabeçalhos viram a faixa “Ordenar por” (só as colunas ordenáveis visíveis). **760 px até o limite de cada tabela:** tabela compacta, colunas principais e “Detalhes” abre uma linha extra com o resto. **Acima do limite** (900 px; Eventos 1060; Auditoria 1300, ou seja, no console nunca) mostra todas as colunas. Sem rolagem horizontal em nenhuma largura; não foi preciso a alternativa de rolagem explícita.

| Tabela | Lista (< 760) | Compacta (760+) | Escondido atrás de “Detalhes” |
|---|---|---|---|
| Contas | nome + e-mail, plano, status | + tipo, nº de eventos | criada, último acesso |
| Eventos | título, data, status | + anfitrião, convidados, participação | fornecedor, fotos |
| Assinaturas | fornecedor, plano, status, valor, Gerir | + próxima cobrança | atraso |
| Suporte | ticket, prazo, status (as 3 colunas) | idem (coluna de 440 a 500 px fica sempre em lista) | nada |
| LGPD | titular, pedido, prazo, situação, Atender | + recebido | nada |
| Retenção por evento | evento, apagar (dia 365), Gerir | + exportar (dia 330) | nada |
| Tarefas de retenção | evento, situação, vence, Tentar de novo | + etapa | tentativas |
| Auditoria | o que fez, alvo, quando, quem | idem | motivo, detalhes (IP) |
| Equipe | pessoa, papel, situação, Gerir | idem | último acesso |
| Segurança (por tipo) | detalhe, quando, quem, origem | tabela | nada |
| Leituras (visão geral) | leitura e valor na mesma linha, “como ler” embaixo | tabela | nada |

### O que mudou além das tabelas

- **Espaço e tipo:** todo `margin`, `padding` e `gap` do CSS e dos estilos em linha usa `var(--space-N)`; todo `font-size` usa `--fs-*`; números tabulares em tabela, fila, faixa de números e contexto; o que era 12,5 e 13 px virou 12 ou 14.
- **Movimento:** 120 ms em hover de linha, chip, link e seta de “Detalhes”; 200 ms ao abrir `details`; nenhum valor fora de 120/200/320. Só `opacity` e `transform`.
- **Atalho `/`:** foca a busca da tela (ou abre a busca global se a tela não tem); ignora campo de texto, modal e menu aberto.
- **Linhas por página:** seletor 10/15/25/50 em toda tabela; o foco volta ao seletor depois da troca.
- **Ação de linha:** botão de 32 px com área de toque de 44 px (antes 36 + 8 = 44 só quando o `::before` do núcleo vencia); botões do cabeçalho de ordenação e do menu lateral também chegam a 44.
- **Ação perigosa proporcional ao risco:** um selo no topo do formulário diz se dá para desfazer. Desfazer logo depois (suspender conta, trocar plano, cortesia): motivo + toast “Desfazer”. Reverter depois, com registro (abrir pedido de exclusão, desativar acesso de alguém da equipe): motivo + confirmação com a consequência escrita, **sem digitar nome** (antes pedia). Irreversível (apagar evento agora, executar exclusão de conta, cancelar assinatura, reembolsar): confirmação de identidade + motivo + confirmação com a consequência + digitar o nome.
- **Estados do botão:** desativado dos botões de página (45% de opacidade), foco âmbar, pressed e carregando vêm do núcleo.
- **Faixa de contexto, avisos e cabeçalho:** o aviso de “ver como” quebra linha no celular, as ações do cabeçalho da página também (a ficha de evento passava 70 px da tela).

### Critério de confiança e precisão (as 10 perguntas, adaptadas)

| # | Pergunta | R | Resposta |
|---|---|---|---|
| 1 | Clareza: dá para entender o que a tela mostra em 3 segundos? | S | Título, contagem “N de M · página” e a primeira linha dizem onde se está; em celular o título da linha é o nome, não uma célula solta. |
| 2 | Segurança percebida: o operador sabe o que está fazendo e em nome de quem? | S | Faixa de papel, identidade confirmada e “ver como” sempre à vista; ação perigosa traz o selo de risco antes de pedir qualquer coisa. |
| 3 | Densidade: cabe o que se precisa sem esconder o que importa? | P | Em 1280 a tabela mostra 5 a 7 colunas; o resto está em “Detalhes”. Auditoria perde motivo e IP da linha em 1280. |
| 4 | Ausência de ruído: algo decorativo disputa a atenção? | S | Sem ícone nem ilustração em vazio, sem cartão, âmbar só em foco, seleção e estado ativo. |
| 5 | Precisão: números e datas são lidos sem ambiguidade? | S | Números tabulares, “≈” onde é aproximado, prazo com sinal e texto (não só cor). |
| 6 | Previsibilidade: o mesmo gesto faz a mesma coisa em todas as telas? | S | Uma só tabela, um só seletor, um só atalho, um só desenho de ação perigosa. |
| 7 | Reversibilidade: o erro tem saída? | S | Desfazer em toast onde é possível; onde não é, o selo avisa antes e a confirmação exige o nome. |
| 8 | Eficiência: o operador experiente ganha tempo? | S | `/` para buscar, ⌘K para ir a qualquer lugar, linhas por página, ordenação sobre todos os resultados. |
| 9 | Acessibilidade: dá para usar sem mouse e em tela pequena? | S | Teclado completo nas tabelas e nos fluxos, 44 px nos alvos, sem rolagem horizontal de 320 a 1920. Falta teste com leitor de tela. |
| 10 | Confiança no registro: dá para provar o que foi feito? | S | Toda ação grava na auditoria com quem, quando e motivo; a própria exportação do registro também fica registrada. |

### Pendente

- Teste com leitor de tela (a tabela vira lista só por CSS, a ordem de leitura segue o código: título, depois campos).
- Os filtros da Auditoria ocupam 4 linhas no desktop (3 grupos de chips e datas); poderiam virar um painel recolhível, mas isso muda o fluxo dos filtros.
- A mensagem de erro de lista exibe o texto genérico do núcleo (“Não deu para carregar”), igual em todos os módulos.
