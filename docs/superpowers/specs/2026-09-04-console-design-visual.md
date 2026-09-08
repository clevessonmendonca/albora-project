# Console Interno — spec de design visual e de interação

**Data:** 2026-09-04
**Status:** design aprovado, pronto para plano
**Modo:** Operate — o visitante vem completar uma tarefa, não ser convencido nem entretido
**Companheiro:** [spec de arquitetura](./2026-09-04-console-interno-design.md) · [ADR 0016](../../adr/0016-camadas-do-console-interno.md)
**Referências:** Linear.app; quatro painéis de referência do dono (Nodus/auditlog, Ecomora, Crowz, Finexy)

---

## 1. A postura

O console é a superfície onde o dono descobre se o negócio existe, o suporte apaga um incêndio de sábado à noite, e o compliance prova que cumpriu um prazo legal. Nenhuma dessas pessoas está aqui para ter uma experiência. Estão aqui para **saber** e para **agir**.

Isso inverte quase todas as decisões que valem na superfície do convidado:

| Superfície do convidado | Console |
|---|---|
| Uma coisa por tela, respirando | Muita coisa por tela, escaneável |
| Tipografia editorial, generosa | Tipografia densa, alinhada, tabular |
| A foto é a heroína | **O dado é o herói** |
| Emoção, celebração | Confiança, precisão |
| A cor sai da identidade do casal | A cor é fixa, da Albora, sempre |

**O teste desta spec:** se um número aparece e o operador precisa parar para descobrir o que ele significa, a tela falhou. Se ele precisa clicar para descobrir se algo está ruim, a tela falhou.

## 2. O que tiramos das referências — e o que recusamos

Nodus (auditlog), Ecomora, Crowz e Finexy. Três dos quatro são **claros** — o que confirma, e não contraria, o claro do admin da Albora (`adminVars('light')`). O quarto é um app móvel escuro.

**O que os quatro fazem igual, e está certo:**

1. **O cartão de métrica imprime a linha de base em texto.** "Last month: 2345" (Finexy), "Previous: 3" (o app), "Total for the week: 354" (Nodus). É a linha de base — não o delta — que torna o número interpretável: `+15%` sozinho não diz se saímos de 4 para 5 ou de 4.000 para 4.600. **Adotamos como obrigatória.**
2. **Estado é pílula com texto e fundo suave.** "In Progress", "Complete", "Waiting", "Finished", "Expired". Nunca um ponto colorido mudo.
3. **Barra de ferramentas acima da tabela:** contagem de itens · busca · Filtros · Exportar · tamanho de página (Nodus, Finexy). É o cabeçalho operacional de qualquer tabela grande.
4. **Ordenar e filtrar por coluna, no próprio cabeçalho** (Nodus).
5. **Seletor de período explícito no topo à direita** — "This week", "April 10 – May 11". Todo número tem janela, e a janela fica visível.
6. **Atalho de teclado impresso dentro do campo de busca** (`K ⌘`, Finexy). O atalho que ninguém vê não existe.
7. **Contador no item de navegação** (Finexy: Analytics `20`, Store `99+`). Trabalho pendente aparece no mapa, não só quando você entra.
8. **Sidebar agrupada por seção** (Finexy: Menu · Products · General). Com nove itens, agrupar é o que evita virar lista.

**Do Linear, além disso:** hierarquia por peso e cor em vez de tamanho; teclado como cidadão de primeira classe; estado vazio que ensina; silêncio visual — nada pisca, nada compete.

**O que recusamos, e por quê:**

- **Nav horizontal em pílulas** (Nodus). Bonita com sete itens; quebra com nove mais contadores. Sidebar agrupada, como Finexy.
- **Blob de gradiente e cartão neon** (Nodus tem um retângulo verde-limão em gradiente; Crowz tem arcos coloridos). Anti-padrão bloqueante aqui. `backdrop-blur` reprova no guard.
- **Preenchimento hachurado/listrado nas barras** (Finexy, Ecomora). Textura que não codifica nada, e que vira ruído no monitor de quem passa o dia na tela.
- **Cartão de upsell** ("Upgrade Your Crowd", Crowz). Console interno não vende nada para a própria equipe.
- **Menu `•••` escondendo as ações da linha** (Ecomora, ambos). A ação escondida é a ação não descoberta; nas telas de suporte a ação fica visível na linha.
- **Miniatura decorativa e avatar por toda parte** (Ecomora, Crowz). Aqui a coluna é dado, não vitrine.
- **Dashboard de vaidade.** Toda métrica responde a "o que eu faço diferente se ela piorar?". Se não responde, sai.
- **Gráfico no lugar de uma frase.** Donut de três fatias substituindo "89% dos eventos estão ativos". Se cabe numa frase, é uma frase.

## 3. O buraco tipográfico, e como fecha

A escala existente (`apps/web/app/tipografia.css`, valores de `packages/tokens/src/tipografia.ts`) foi desenhada para a superfície de celebração:

```
.tipo-display  clamp(2.5rem, 6vw, 4rem)     .tipo-body     1rem / 1.55
.tipo-title    clamp(1.75rem, 4vw, 2.5rem)  .tipo-caption  0.875rem / 1.45
.tipo-subtitle 1.25rem                      .tipo-label    0.75rem / 1.2, +0.05em
.tipo-body-lg  1.125rem
```

**O que a escala já resolve:** o título de página. Os quatro painéis de referência têm título grande e editorial — "Auditlog Overview", "Sales Overview", "Dashboard" — e isso está certo: é a âncora que diz onde você está antes de qualquer dado. `.tipo-title` cobre esse papel sem mudança.

**O que ela não resolve:** o dado. `.tipo-body` tem line-height 1.55, leitura de parágrafo, não varredura de coluna. E não existe degrau entre `caption` (0.875) e `label` (0.75). Densidade é regra para o dado, nunca para o título.

**Decisão:** o console ganha um registro denso, `tipo-den-*`, definido **no mesmo arquivo e derivado da mesma fonte de verdade** (`ESCALA_TIPOGRAFICA`), nunca com números soltos num componente:

```
.tipo-den-metrica   var(--fonte-titulo)  2rem     / 1.0   / -0.02em / tabular-nums
.tipo-den-titulo    var(--fonte-titulo)  1.125rem / 1.25  / -0.01em
.tipo-den-corpo     var(--fonte-corpo)   0.875rem / 1.35
.tipo-den-dado      var(--fonte-corpo)   0.875rem / 1.35  / tabular-nums
.tipo-den-rotulo    var(--fonte-corpo)   0.75rem  / 1.2   / +0.04em / uppercase
```

`tabular-nums` em `metrica` e `dado` não é detalhe: sem ele, uma coluna de valores dança na vertical a cada dígito diferente, e comparar dois números vira leitura em vez de olhada.

**Regra:** `.tipo-den-*` só existe dentro de `/console`. A superfície do convidado nunca fica densa.

## 4. Cor em modo Operate

Tokens já existentes, resolvidos com `ALBORA_BRAND` via `adminVars('light')` — o console **nunca** herda a identidade do casal, senão o painel se repinta conforme o evento aberto.

**A regra que organiza tudo:** acento e semântica são coisas diferentes.

- `--acento` — marca a Albora e o estado *ativo* da navegação. **Não** significa "bom".
- `--critico` — significa erro, estouro de SLA, falha. Nunca decora.
- `--ink`, `--ink-2`, `--ink-3` — a hierarquia real do console. Título em `ink`, apoio em `ink-2`, metadado em `ink-3`.
- `--linha` — separação. É a ferramenta principal de estrutura numa tela densa, não a sombra.

**Estado nunca é só cor.** Todo `StatusBadge` carrega texto; a cor é reforço. Um operador com deuteranopia lê a fila de tickets igual.

**Tons semânticos** (derivados por `color-mix` sobre os tokens, sem hex novo):

| Tom | Uso | Composição |
|---|---|---|
| Neutro | Rascunho, arquivado, sem ação | `--ink-3` sobre `--superficie` |
| Positivo | Ativo, pago, concluído | `--acento` sobre `--color-acento-superficie` |
| Atenção | Perto do SLA, pagamento atrasado, retenção pendente | `--acento` sobre `--color-acento-fundo`, com borda `--color-acento-borda` |
| Crítico | SLA estourado, job falhado, conta suspensa | `--critico` sobre `--color-critico-superficie` |

Atenção e Positivo compartilham matiz por decisão: a paleta da Albora é quente e não tem um amarelo próprio. Eles se distinguem por **peso e borda**, e sempre pelo rótulo. Se na prática ficarem confundíveis, o conserto é um token novo na marca, não um hex no componente.

## 5. O quadro — três zonas

```
┌────────────┬──────────────────────────────────────────────────┐
│            │  BARRA DE CONTEXTO           56px                │
│            │  título · ações · busca ⌘K · ator                │
│  SIDEBAR   ├──────────────────────────────────────────────────┤
│   240px    │                                                  │
│   fixa     │  PALCO                                           │
│            │  faixa de métricas → filtros → tabela            │
│            │  max-width 1440, respiro 24px                    │
│            │                                                  │
└────────────┴──────────────────────────────────────────────────┘
```

- **Sidebar 240px**, `.elev-1`, borda direita `--linha`. Colapsa para 64px (só ícone + tooltip) abaixo de 1280px. Vira gaveta abaixo de 900px.
- **Barra de contexto 56px**, `.elev-0` com borda inferior. Não flutua, não borra, não gruda com sombra — ela **é** o topo. Da esquerda para a direita: título da tela · ações primárias · campo de busca com o atalho **`⌘K` impresso dentro do campo** (Finexy acerta nisso: atalho invisível é atalho inexistente) · seletor de período · ator.
- **Seletor de período** é global da tela e obrigatório onde há número temporal — "7 dias", "30 dias", "90 dias", intervalo. Toda métrica exibida herda dele, e a janela fica escrita. Número sem janela é número sem significado.
- **Palco** rola; sidebar e barra não. Numa tabela de 400 linhas, perder a navegação ao rolar é perder o mapa.
- **Sem breadcrumb.** A sidebar diz onde você está; o título diz o quê. Breadcrumb num app de dois níveis é ruído.

## 6. Densidade

Grade de 4px. Escala de espaço do console: `4 · 8 · 12 · 16 · 24 · 32`. Nada de 40, 48, 64 — respiro editorial não pertence aqui.

| Elemento | Altura | Regra |
|---|---|---|
| Linha de tabela | 44px | É o piso de toque **e** o teto de densidade. Não descer. |
| Cabeçalho de tabela | 36px | `.tipo-den-rotulo`, fundo `--superficie`, grudado no topo ao rolar |
| Item de navegação | 36px de caixa, **44px de alvo** | O alvo passa do desenho via padding; nunca encolher o alvo para caber |
| Cartão de métrica | 96px | Rótulo, valor, delta |
| Botão | 36px normal, 44px de alvo | Igual à nav |

**A regra de 44px não negocia com densidade.** Quando as duas brigam, o alvo cresce por padding e o desenho fica igual.

## 7. Navegação

Nove itens em **três grupos** — nove numa lista corrida vira lista; agrupado, vira mapa (Finexy acerta nisso). Cada item só aparece se o ator tem a capacidade; um grupo cujos itens todos sumiram some junto, com o rótulo.

| Grupo | Item | Capacidade | Contador |
|---|---|---|---|
| **Negócio** | Visão geral | `analytics.platform.read` | — |
| | Contas | `accounts.read` | — |
| | Eventos | `events.read` | — |
| | Assinaturas | `subscription.read` | pagamentos em atraso |
| **Operação** | Suporte | `tickets.read` | tickets abertos; **`--critico` se algum SLA estourou** |
| | LGPD | `lgpd.dsar.read` | DSAR dentro de 3 dias do prazo |
| **Governança** | Auditoria | `audit.read` | — |
| | Segurança | `security.read` | eventos das últimas 24h, se houver |
| | Equipe | `staff.manage` | — |

**Contador é trabalho pendente, nunca vaidade.** Só recebe contador o item onde o número significa "alguém precisa fazer alguma coisa". "Contas: 1.240" não é informação, é ruído — e some. Zero não renderiza a pílula: um badge "0" ensina a ignorar badges.

**Item sem permissão não aparece cinza — não aparece.** Mostrar desabilitado ensina ao operador o que ele não pode, o que é informação que ele não precisa e um mapa da superfície interna que ele não deveria ter.

Ativo: fundo `--color-acento-superficie`, texto `--acento`, e uma barra de 2px na borda esquerda. Cor sozinha não marca estado ativo — quem não distingue o matiz perde a posição.

Rodapé da sidebar: ator, papéis, sair. Se estiver impersonando, **o banner vive aqui e no topo**, em `--critico`, sem como fechar.

## 8. Anatomia dos dois blocos que aparecem em toda tela

### 8.0.1 Cartão de métrica

```
┌──────────────────────────────────┐
│ TICKETS ABERTOS         ·rótulo· │   .tipo-den-rotulo, --ink-3
│ 47            ↑ 12%              │   .tipo-den-metrica + pílula de delta
│ Últimos 7 dias · antes: 42       │   .tipo-den-corpo, --ink-3
└──────────────────────────────────┘   96px, .elev-1, borda --linha
```

Quatro elementos, todos obrigatórios:

1. **Rótulo** — o que é, sem ambiguidade.
2. **Valor** em `.tipo-den-metrica` com `tabular-nums`.
3. **Delta** em pílula, com **seta e sinal**, não só cor — quem não distingue verde de vermelho ainda lê `↑ 12%`.
4. **Linha de base em texto** — a janela e o valor anterior. É o item que os quatro painéis de referência acertam e que a maioria dos dashboards erra.

**A direção do delta não é a direção do bem.** Tickets abertos subindo é ruim; H1 subindo é bom. O cartão recebe a orientação explicitamente (`bomQuando: "sobe" | "desce"`) e nunca infere pelo sinal. Errar isso pinta uma crise de verde.

Sem base de comparação honesta — série curta demais, período incompleto — o cartão mostra o valor e `—` no lugar do delta, com "sem período anterior". **Nunca inventa tendência com dois pontos.**

### 8.0.2 Barra de ferramentas da tabela

```
┌──────────────────────────────────────────────────────────────┐
│ 237 itens │ 🔍 buscar…        │ Filtros ⚙ │ Exportar │ 25 ▾ │
└──────────────────────────────────────────────────────────────┘
```

- **Contagem à esquerda**, e ela reflete o filtro aplicado, não o total da tabela — senão mente.
- **Busca** com placeholder dizendo o que é buscável ("conta, e-mail, id do evento"), não "Buscar…".
- **Filtros** abre painel; os filtros ativos viram fichas removíveis abaixo da barra, porque filtro escondido é a causa nº1 de "sumiu meu dado".
- **Exportar** só aparece com capacidade, e **toda exportação grava auditoria** — export é vazamento em potencial de dado de cliente.
- **Tamanho de página** persiste por operador.
- Cabeçalho de coluna carrega ordenação (`aria-sort`) e, onde faz sentido, filtro próprio.

## 8.1 As telas

### 8.1.1 Visão geral — a tela do dono

Ordem é argumento. A H1 abre porque ela decide se o negócio existe.

1. **H1 em destaque**, sozinha, largura total: % de convidados presentes que enviaram ≥1 foto. Número em `.tipo-den-metrica` grande, sparkline de 30 dias ao lado, delta contra o período anterior. Uma frase abaixo dizendo o que é, porque o dono vai mostrar essa tela para outra pessoa.
2. **Faixa de métricas**, 4 colunas: eventos ativos · convidados alcançados · MRR · tickets abertos. Cada uma com delta e sparkline mínima.
3. **Funil de ativação**, horizontal: escaneou → consentiu → primeira foto. Cada degrau mostra absoluto, % do anterior, e **onde morre** destacado em `--critico`. É a tela que responde "por que a H1 caiu".
4. **Duas colunas:** eventos recentes (tabela compacta) | saúde operacional (retenção pendente/falhada, exports falhados) — falha em `--critico` e **clicável**, porque um job falhado é trabalho, não informação.

Sem dado suficiente para um delta ser honesto, mostra o número e `—` no lugar do delta. **Nunca inventa tendência com dois pontos.**

### 8.1.2 Contas

`DataTable`: conta · tipo (anfitrião/fornecedor) · plano · eventos · criada · último acesso · status.
Filtros na `FilterBar`: tipo, plano, status, busca. Ordenação por qualquer coluna. Paginação por cursor.
**PII mascarada por padrão** — `j••••@gmail.com`. Revelar é ação explícita, exige `accounts.pii.reveal`, e grava auditoria.

### 8.1.3 Conta — detalhe

`EntityHeader`: nome, tipo, status, ações permitidas ao ator. Abaixo, três painéis:
- **Identidade** — contato mascarado, criada em, último acesso, consentimentos.
- **Atividade** — eventos, assinatura, pagamentos recentes.
- **Trilha** — as últimas entradas de `audit_log` cuja alvo é esta conta. O operador vê o que a equipe já fez aqui antes de fazer mais.

### 8.1.4 Eventos

Tabela: evento · anfitrião · fornecedor · data · convidados · fotos · **H1 do evento** · status.
A coluna H1 é a razão desta tela existir — ordenar por ela é encontrar quais festas funcionaram.
Detalhe: agregados, funil do evento, retenção, consentimento. **Zero PII de convidado, em nenhuma coluna, para nenhum papel.**

### 8.1.5 Assinaturas

Faixa: MRR · assinaturas ativas · inadimplência · churn 30d.
Tabela: fornecedor · plano · status · próxima cobrança · atraso · valor.
Atraso em `--critico` a partir do primeiro dia. Ações de mutação só aparecem para quem tem a capacidade — e só chegam na Onda C.

### 8.1.6 Suporte — fila

A tela mais usada do console. Duas zonas, sem navegar para fora:

```
┌───────────────────────────┬────────────────────────────┐
│ FILA                      │  TICKET SELECIONADO        │
│ SLA · prioridade · conta  │  thread · responder        │
│ 44px por linha            │  contexto do cliente       │
└───────────────────────────┴────────────────────────────┘
```

- Ordenação padrão: **SLA mais próximo do estouro primeiro**. Não é a criação, não é a prioridade — é o que queima.
- Contagem regressiva por linha. Ao estourar, a linha inteira ganha fundo `--color-critico-superficie` e o rótulo vira "Estourado há 12min". Não pisca: uma fila com seis estouros piscando é inutilizável, e o problema já está dito pela cor e pelo texto.
- Painel de contexto ao lado da thread: plano, eventos, pagamentos, erros recentes. **PII mascarada.** Atender um ticket quase nunca exige o contato — quando exige, é um clique auditado.

### 8.1.7 LGPD

Três abas: **DSAR** (com prazo legal e dias restantes — vermelho ao passar), **Retenção** (d330/d365, falhas acionáveis), **Consentimento** (agregado, sem nomes).
Exclusão de conta usa `DangerDialog`: exige digitar o identificador da conta, exige motivo, e diz em texto o que será apagado. Irreversível merece atrito.

### 8.1.8 Auditoria e Segurança

Duas telas com o mesmo formato, fontes diferentes.
**Auditoria** — `audit_log`: quando · ator · ação · alvo · motivo. Filtro por ator, ação, alvo, período. Expandir mostra `metadata`. É a tela que prova.
**Segurança** — `security_events`: login falho, rate limit, permissão negada, reuso de sessão. Agrupada por tipo, com contagem. É a tela que avisa.

Nenhuma das duas tem ação. São de leitura por construção — a trilha que se edita não é trilha.

### 8.1.9 Equipe

Tabela: pessoa · papéis · último acesso · status. Convidar, atribuir papel, suspender.
Ao lado de cada papel, **as capacidades que ele concede, em texto**. Quem atribui um papel precisa ver o que está dando, não decorar.
Atribuir papel exige reautenticação — é escalação de privilégio.

## 9. Estados

Toda tela tem cinco, e todos são projetados, não deixados acontecer:

| Estado | Tratamento |
|---|---|
| **Carregando** | Esqueleto na forma do conteúdo real. Usa `--color-ink-skeleton`; a animação de pulso respeita o kill-switch global de reduced-motion. |
| **Vazio de verdade** | `EmptyState` que ensina: "Nenhum evento ainda. Eles aparecem aqui quando um anfitrião publica o primeiro." Nunca "Sem dados". |
| **Vazio por filtro** | Diferente do anterior: "Nenhum ticket com estes filtros" + botão limpar. Confundir os dois faz o operador achar que o sistema está vazio. |
| **Erro** | O que falhou, o que fazer, e um botão tentar de novo. Nunca só "Algo deu errado". |
| **Sem permissão** | Não acontece: o item não está na nav e a rota redireciona. Se chegou pela URL, mensagem seca sem revelar o que existe do outro lado. |

## 10. Movimento

Herda o sistema de Onda 0 e usa **quase nada** dele:

- Transição de rota: fade de 120ms em `var(--curva)`. Nada desliza — deslizamento em navegação lateral engana sobre hierarquia.
- Hover de linha: mudança de fundo em 80ms.
- Painel/gaveta: 180ms com `ease-saida` na saída.
- `ease-mola` **só** em toque/pressão de botão. Nunca em aparição de dado.
- **Nada em loop.** Nenhum pulso, brilho ou seta animada. Numa tela que fica aberta oito horas, movimento contínuo é fadiga.
- Tudo cai para 0ms sob `prefers-reduced-motion` — via o kill-switch global, sem `style={{animation}}` inline, que escapa dele.

## 11. Acessibilidade

- **AA no mínimo**, e AAA no corpo denso — 0.875rem em contraste AA marginal cansa numa jornada de oito horas.
- Alvo ≥44px, sem exceção, inclusive em ação destrutiva.
- `aria-sort` no `<th>` ordenável; anúncio da mudança em live region.
- Foco visível com anel de 2px em `--acento`, com deslocamento — nunca `outline: none`.
- Gráfico com `role="img"` e `aria-label` obrigatório, mais tabela visualmente oculta com os dados. Um gráfico sem texto alternativo é um dado que não existe para quem usa leitor.
- Ordem de tabulação seguindo o visual. Atalho pular-para-conteúdo antes da sidebar.
- ⌘K alcançável por teclado e anunciado.

## 12. Anti-padrões — bloqueantes em review

- Qualquer hex literal em componente.
- `backdrop-blur` / `backdrop-filter` — reprova no guard.
- Gradiente decorativo, neon, sombra colorida.
- Estado comunicado **só** por cor.
- Alvo abaixo de 44px.
- Número sem unidade, sem período, ou sem base de comparação em texto.
- Delta sem seta e sinal (só cor), ou com direção inferida do sinal em vez de declarada.
- Delta calculado sobre dois pontos e apresentado como tendência.
- Gráfico sem `aria-label`.
- Preenchimento hachurado, listrado ou texturizado que não codifica dado.
- Ação de linha escondida atrás de `•••` numa tela operacional.
- Contador de navegação exibindo `0`, ou contando coisa que não é trabalho pendente.
- Exportação sem linha de auditoria.
- Contagem na barra de ferramentas mostrando o total quando há filtro aplicado.
- Ícone sozinho como única ação numa tabela, sem rótulo acessível.
- Item de navegação desabilitado em vez de ausente.
- `animate-pulse` ou `style={{animation}}` inline — escapam do kill-switch de reduced-motion.

## 13. Critério de sucesso

- O dono abre o console e sabe em cinco segundos se a semana foi boa — pelo número e pelo delta, sem clicar.
- O suporte identifica o ticket mais urgente sem ordenar nada: ele já está no topo, vermelho e com o tempo dito em palavras.
- O compliance prova um atendimento de DSAR exportando uma tela, sem pedir query.
- Ninguém precisa de mouse para atravessar o console.
- Nenhuma tela mostra nome ou contato de convidado. Em nenhum papel, em nenhum filtro, em nenhum export.
