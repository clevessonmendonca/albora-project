# Redesign do Painel do Anfitrião — spec de design

Data: 2026-09-22
Status: proposta, aguardando revisão
Escopo decidido com o mantenedor: redesenho do zero, todas as sub-telas, backend mínimo **e** features net-new autorizados.

---

## 1. Por que

O painel hoje funciona e é feio de um jeito específico: ele não sabe em que dia vive. As onze abas são as mesmas na véspera, na festa e três meses depois, e nenhuma tela diz ao anfitrião qual é a próxima coisa a fazer. O resultado é um painel administrativo genérico para um produto que vende emoção.

O redesign ataca duas coisas ao mesmo tempo:

1. **Orientação** — o anfitrião entra e entende em segundos onde está, o que já está pronto e o que fazer agora.
2. **Acabamento** — um sistema de componentes só, em vez de dois sistemas de botão, quinze skeletons artesanais e nenhum toast.

### O que existe hoje (diagnóstico)

18 rotas em `apps/web/app/admin/`, todas server components finas que delegam a client components em `apps/web/features/admin/components/client/`.

Navegação em `apps/web/features/admin/components/client/event-nav.tsx`: onze pílulas em três grupos, barra horizontal rolável, **sem um único breakpoint** — a mesma barra no celular e no monitor de 27".

Dívidas confirmadas no código:

| # | Dívida | Evidência |
|---|---|---|
| 1 | Dois enums de fase concorrentes: `draft/active/ended` no banco vs `vivo/agendado/encerrado` derivado de data só na listagem | `packages/db/src/events.ts:34` vs `apps/web/app/admin/page.tsx:23` |
| 2 | Nenhuma transição para `ended` na UI; a fase nunca dirige a tela | — |
| 3 | Dois sistemas de botão: `adminClasses.*` em Tailwind cru convivendo com o `Button` do design system | `features/admin/components/server/admin-shell.tsx:88` |
| 4 | Skeleton artesanal com `animate-pulse` em 15 arquivos; o `Skeleton` de `@albora/ui-web` nunca é importado | `packages/ui-web/src/skeleton.tsx` |
| 5 | `Dialog`, `Sheet` e `Toast` existem no DS e nunca são usados no host; todo feedback é `<p role="alert">` inline reescrito por arquivo | — |
| 6 | Fetch cru (`useEffect` + três `useState`) reimplementado em cada componente; causa raiz de 4 e 5 | — |
| 7 | "Assinar Completo" enterrado dentro de `event-controls.tsx`, sem entrada na navegação | — |
| 8 | Painel de equipe retorna `null` sem permissão, some sem explicação | `features/admin/components/client/event-team-panel.tsx:99` |
| 9 | Estado vazio mudo: `consent-versions.tsx:130` retorna `null`; o funil mostra zeros sem mensagem | — |
| 10 | Admin força tema claro; não há preferência de sistema nem troca | `admin-shell.tsx:8` |

Duas boas notícias que o redesign não pode estragar: **zero hex hardcodado** e **zero string de domínio** em `features/admin`. Os dois guards não negociáveis estão limpos.

---

## 2. Arquitetura de informação

### Princípio

Menos destinos, e um Início que muda de forma. "Ao vivo" não vira um lugar: no dia da festa o Início **é** o painel ao vivo. Isso mantém toda ferramenta a um clique e ainda assim deixa a tela principal falar da fase certa.

### Seis destinos de evento

| Destino | Absorve | Trabalho do anfitrião |
|---|---|---|
| **Início** | `/admin/e/[id]`, `/pre-event` | Onde estou, o que falta, qual a próxima ação |
| **Fotos** | `/album`, `/moderation` | Ver, revisar, destacar, guardar |
| **Convidados** | `/guests`, `/insights` | Quem veio, quem participou, quem é quem |
| **Experiência** | `/identity`, `/missions`, `/guestbook`, música, telão | O que o convidado vê e sente |
| **Compartilhar** | `/qrcode`, links de convite, peças impressas | Fazer o convidado chegar |
| **Ajustes** | `/consent`, equipe, menores, modo endurecido, plano, encerrar | Regras, gente e consequências |

### Nível conta

Lista de eventos, criar evento, cobrança e sair **saem da competição com as abas do evento** e vão para um menu de conta no topo do shell. Cobrança deixa de ser uma aba irmã de "Missões", que é a comparação que o painel faz hoje.

### Formatos descartados

- **Quatro abas + hub "Evento"**: topo mais enxuto, mas põe um clique extra em toda ferramenta de personalização — exatamente as mais visitadas na semana da festa.
- **Fase como navegação (Antes/Durante/Depois)**: imbatível em "onde estou", péssimo em "onde está a ferramenta". O QR é de antes, e o anfitrião procura ele no meio da festa.

---

## 3. Shell e navegação

### Desktop (>= 1024px)

Barra lateral fixa, recolhível, com estado persistido por conta:

- Logo Álbora no topo, clicável para a lista de eventos.
- Seletor do evento atual: nome, data, e um selo de fase.
- Grupo **Evento**: os seis destinos, ícone Lucide + rótulo, item ativo com marcação de superfície e de peso tipográfico (nunca só cor — falha em daltonismo).
- Grupo **Conta**: eventos, cobrança, ajuda, sair.
- Recolhida, vira coluna de ícones com tooltip; o rótulo continua acessível por `aria-label`.

Conteúdo em coluna única de no máximo 72rem, como hoje, mas com faixa de respiro maior e um cabeçalho de página que carrega título, subtítulo e as ações primárias da tela.

### Mobile (< 768px)

- **Tab bar inferior de cinco**: Início, Fotos, Convidados, Experiência, Mais. "Mais" abre um `Sheet` com Compartilhar, Ajustes e o menu de conta.
- Alvo de toque mínimo 44×44, respeitando `env(safe-area-inset-bottom)`.
- Header fino e fixo: nome do evento truncado com `title` completo, selo de fase, sino de pendências, botão de ajuda.
- Badge de pendência de moderação migra da aba antiga para a tab "Fotos", e também aparece no Início como ação.

### Tablet (768–1023px)

Barra lateral já presente, iniciada recolhida. Conteúdo ganha a segunda coluna onde a tela comporta (Início e Fotos), nunca forçada.

### Nomes longos

Nome de evento é campo livre. Toda superfície que o exibe trunca em uma linha com reticências e expõe o valor inteiro em `title`/`aria-label`. A contagem regressiva nunca compete com o nome por espaço: em telas estreitas ela desce para a linha de baixo.

---

## 4. Início por fase

A fase é derivada, nunca digitada. Quatro estados, quatro telas diferentes.

### 4.1 Rascunho (`status = 'draft'`)

O evento existe e o convidado não alcança. A tela é de preparação, não de acompanhamento.

- Boas-vindas com o nome do evento e três linhas do que o Álbora faz: os convidados fotografam, as fotos chegam organizadas, a festa vira um álbum.
- **Checklist de preparo** persistido, com cada item linkando direto para a configuração e marcando sozinho quando a configuração existe (capa definida, missões escolhidas, identidade ajustada, QR baixado, consentimento revisado, equipe convidada).
- Ação primária única: **Publicar evento**, com confirmação que explica a consequência — a partir daí o QR funciona e qualquer convidado com o link entra.
- Nenhum número, nenhum gráfico. Não há o que medir.

### 4.2 Antes (`active`, agora < `starts_at`)

- **Hero** com a capa do evento, o nome em Fraunces, a data por extenso e a **contagem regressiva**. A capa recebe tratamento — escurecimento controlado por token para o texto ganhar contraste, nunca um gradiente decorativo solto. Sem capa, cai para uma composição tipográfica na cor do evento, e o próprio vazio vira a ação ("Escolher a capa").
- **Próximos passos**: no máximo três, priorizados pelo que falta e pelo que está perto no calendário. Cada um com verbo específico e destino direto.
- **Prévia do convidado**: o `PhoneFrame` do DS mostrando a tela real que o convidado vai ver, com a identidade aplicada. Abre em tela cheia por `Sheet`.
- **Chegada dos convidados**: QR e link a um toque, com contagem de quantas peças já foram baixadas se houver o dado, e nada inventado se não houver.
- A contagem regressiva tem presença visual forte e ocupa o hero, não o corpo. As tarefas ficam acima da dobra em telas de celular.

### 4.3 Durante (`active`, entre `starts_at` e `ends_at`)

O Início vira painel ao vivo. Densidade alta, decisões rápidas.

- **Faixa ao vivo**: fotos recebidas, convidados participando, porcentagem de participação contra a meta de 40% (a meta é a H1 do produto, não um número inventado).
- **Precisa de você**: fila de revisão com contagem, comentários denunciados, e qualquer controle em estado anormal (telão pausado, interação fechada quando deveria abrir).
- **Controles operacionais** sempre alcançáveis: pausar telão, gate de interação, modo endurecido. Todos com confirmação que diz a consequência — "Pausar o telão tira as fotos da parede agora. Ninguém é desconectado." Nunca um switch solto.
- Atualização por intervalo curto com respeito a `prefers-reduced-motion`; números trocam com transição discreta, nunca com salto.
- Queda de rede degrada: a faixa congela com marcação de "última atualização" em vez de zerar.

### 4.4 Depois (`ended`, ou `active` com agora > `ends_at`)

- **Balanço** com o payoff emocional: quantas fotos, quantos convidados, quantos momentos. Copy de fechamento, não de dashboard.
- **Curadoria**: destaques escolhidos, o que ainda espera revisão, o que ficou oculto.
- **Guardar**: exportar ZIP, enviar ao Drive, e a retrospectiva.
- **Prazo de acesso**: dia do envio automático para a nuvem do casal e dia da exclusão, lidos dos jobs reais de retenção. Nada de prazo inventado.
- **Encerrar evento**: atalho para a ação, que vive em Ajustes. Um caminho de escrita só, exposto em dois lugares.

---

## 5. Sub-telas

### 5.1 Fotos

Uma tela só, três facetas em abas: **Todas · Revisar · Destaques**.

- Grade de fotos com carregamento progressivo, proporção preservada, nunca corte vertical agressivo no thumbnail.
- Item abre em `Sheet` lateral (desktop) ou tela cheia (mobile) com autor, missão, horário e as ações: destacar, ocultar, remover.
- **Revisar** é a fila: liberar e ocultar em lote, com desfazer por toast dentro de uma janela curta em vez de confirmação modal a cada foto.
- **Destaques** é curadoria positiva net-new: a foto destacada ganha prioridade no telão, na retrospectiva e no topo do álbum.
- Vazios específicos: "Nenhuma foto ainda — o QR já está de pé?" na aba Todas com atalho para Compartilhar; "Fila limpa" em Revisar; "Nada destacado ainda" em Destaques com explicação do que destacar faz.
- Exportação continua atrás de `canManageCoupleOnly`, mas agora **aparece** para quem não pode, explicando por quê.

### 5.2 Convidados

Duas facetas: **Participação** e **Pessoas**.

- Participação: funil real (chegou, consentiu, fotografou), porcentagem contra a meta de 40%, e a confirmação manual de presença que já existe.
- Pessoas: cartões por convidado com primeiro nome, contagem de fotos e último envio. Abre perfil em `Sheet` com as fotos daquela pessoa.
- Insights absorvidos aqui como uma seção, não como aba própria. **Nenhuma métrica nova** além das que o backend já calcula.
- Vazio: "Ninguém entrou ainda" com o caminho para o QR, não um zero mudo.
- PII mascarada em qualquer log; a tela mostra primeiro nome, nunca telefone ou e-mail completo fora do que já é exibido hoje.

### 5.3 Experiência

Hub com uma seção por peça, cada uma com prévia ao lado do controle:

- **Identidade**: cor do evento, capa, tokens. A prévia mostra a tela do convidado, não uma paleta abstrata.
- **Missões**: editor atual, com reordenação e prazo.
- **Recado**: texto e áudio, rascunho e publicação.
- **Música**: sugestões e playlist.
- **Telão**: link, pareamento, modelo de enquadramento, e o botão de pausa.
- Botão persistente **Ver como convidado** no topo, abrindo a prévia real.

### 5.4 Compartilhar

- Link do evento com cópia em um toque e confirmação por toast.
- QR em destaque com download PNG, PDF e impressão.
- Peças prontas: placa de mesa, adesivo, folha de prova — cada uma com miniatura real, não ícone genérico.
- Texto pronto para WhatsApp, copiável.

### 5.5 Ajustes

- **Equipe**: convidar, listar, remover. Sem permissão, a seção **aparece em estado explicado**, nunca `null`.
- **Consentimento**: versões, datas, e um vazio com texto quando não há histórico.
- **Regras do evento**: há menores, modo endurecido, gate de interação — cada um com consequência escrita antes da confirmação.
- **Plano**: estado atual e upgrade, com entrada própria e não mais enterrado nos controles ao vivo.
- **Encerrar evento**: dono da ação. Destrutiva, com confirmação que exige releitura da consequência. O Início da fase Depois apenas atalha para cá.

---

## 6. Domínio e backend

### 6.1 Fase unificada

Função pura em `packages/core/src/fase.ts`:

```
faseDoEvento(evento, agora): "rascunho" | "antes" | "durante" | "depois"
```

Regra: `status === 'draft'` → rascunho. `status === 'ended'` → depois. Caso contrário, compara `agora` com `starts_at`/`ends_at`. **Sem coluna nova** — a fase é derivada, o que evita um campo que pode divergir da verdade e respeita migrations forward-only.

`apps/web/app/admin/page.tsx:23` perde o enum paralelo `vivo/agendado/encerrado` e passa a consumir esta função. O vocabulário passa a ser um só em toda superfície, incluindo o telão e a experiência do convidado quando fizer sentido.

### 6.2 Encerramento real

`events.status` já aceita `'ended'` (migration 0056) e nada escreve esse valor. Ganha caminho de escrita em `PATCH /api/admin/events/[eventId]`, gated a `canManageCoupleOnly`, com confirmação na UI. Sem migration.

### 6.3 Checklist persistente

Migration **0059**, tabela `event_checklist`:

- `event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE`
- `item_key text NOT NULL`
- `done_at timestamptz`
- `done_by uuid REFERENCES accounts(id)`
- `PRIMARY KEY (event_id, item_key)`
- RLS habilitado **e forçado**, política `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`.

Substitui `features/admin/lib/pre-event-checklist.ts` em localStorage, que hoje morre quando o anfitrião troca de celular. Itens cujo estado é derivável do próprio dado (capa existe, missões existem) são calculados, não marcados à mão; a tabela guarda só os que dependem de julgamento humano.

### 6.4 Destacar foto

Migration **0060**: `ALTER TABLE uploads ADD COLUMN highlighted_at timestamptz;` mais índice parcial por evento. Leitura pelo telão, pela retrospectiva e pelo álbum. Escrita só por papel com permissão de gestão.

### 6.5 Retenção visível

Sem migration. `retention_jobs` e `diasRestantesAteD365` já existem em `packages/db/src/retention-jobs.ts` e hoje só o console `/ops` enxerga. Ganha leitura escopada ao evento numa rota de admin, para o Início da fase Depois mostrar as duas datas reais.

### 6.6 Retrospectiva

Net-new, entregue na Onda 6. Capítulos derivados por regra, **sem IA generativa em nenhum ponto** (ADR 0007): janelas de tempo a partir de `taken_at`/`created_at`, missões cumpridas e fotos destacadas. A ordenação prioriza destaque, depois reação, depois cobertura de momentos distintos. Se o volume for insuficiente para capítulos, a tela cai para uma sequência única e diz isso.

### 6.7 Isolamento

Toda leitura e escrita nova passa por `SET LOCAL app.event_id` antes da primeira chamada ao banco. Nenhuma consulta cruza eventos. Chave de storage continua derivada no servidor.

---

## 7. Design system e tokens

### Reconciliação de paleta

Hoje circulam três bases claras diferentes: `design-system-v3.md` propõe `#FAF8F4`/`#1F1B18`, `DESIGN.md` documenta `#F4F0E9`/`#1A1613`, e `packages/tokens/src/marca.ts` implementa os valores de `brand/`. **Vale `brand/`**, como o próprio `DESIGN.md:169` determina. Os valores de `design-system-v3.md` para fundo e tinta são descartados; o acento âmbar `#D9793C` coincide nos três e permanece.

Os neutros intermediários que `design-system-v3.md` lista como hexadecimais próprios (`--ink-2`, `--ink-3`, `--surface-2`, `--surface-3`) viram **opacidade de tinta e papel**, seguindo a regra das cinco cores de `DESIGN.md:173`. Nenhum cinza novo entra.

### Tema

O painel hoje força claro em `admin-shell.tsx:8`. Passa a: claro por padrão, `prefers-color-scheme` respeitada, e troca manual persistida por conta. O escuro é derivado dos tokens de marca (`noite`), não um dark mode "tech" — que é anti-padrão declarado.

### Cor do evento

Duas camadas que nunca se misturam. O chrome do painel usa a marca Álbora, neutra. A cor escolhida pelo casal aparece só onde é conteúdo do evento: capa, prévia do convidado, seleções e destaques, chips de momento, peças de compartilhamento. O contraste e a cor de texto sobre o acento continuam **derivados** pelo resolvedor, nunca escolhidos. Um resolvedor, N renderizadores — web, telão e impressão continuam lendo o mesmo.

### Tipografia

Fraunces como serif de assinatura, uso raro e deliberado: nome do evento no hero, balanço do pós-evento, capa. Instrument Sans em todo o resto. Ícones Lucide, tamanho e peso consistentes.

### Anti-padrões bloqueantes

Glassmorphism, neon, gradiente roxo, dark mode "tech", fonte script, verde sage, rosa blush, ícone de aliança, pombinha ou coração. Somados aos do redesign: card dentro de card, fileira de KPI de painel B2B, emoji na interface, e cartões iguais repetidos para dar sensação de conteúdo.

---

## 8. Componentes e interações

### Fundação a construir na Onda 0

- **`useAdminResource`**: um hook de leitura com estados de carregando, erro, vazio e recarregar. Mata a reimplementação de `useEffect` + três `useState` em cada componente, que é a causa raiz dos skeletons e erros duplicados.
- **Adoção do DS**: `Dialog`, `Sheet`, `Toast` e `Skeleton` de `@albora/ui-web` passam a ser os únicos caminhos. Os quinze `animate-pulse` artesanais são removidos.
- **Morte do `adminClasses`**: `admin-shell.tsx:88` some; sobra o `Button` do design system, com as variantes que faltarem adicionadas ao pacote, não ao app.

### Quando usar o quê

- **Sheet (drawer)** para ver ou editar detalhe sem perder o contexto: foto aberta, perfil de convidado, prévia do convidado.
- **Dialog (modal)** para decisão curta e consequência: publicar, encerrar, pausar telão, remover pessoa.
- **Página** para fluxo longo: editor de identidade, editor de missões, criação de evento.

### Regras de comportamento

- Foco vai para o primeiro elemento interativo ao abrir, e volta ao gatilho ao fechar.
- `Esc` fecha; foco fica preso dentro enquanto aberto.
- Formulário com alteração não salva avisa antes de fechar.
- Sucesso é toast; erro de campo é inline; erro de carregamento é bloco com botão de tentar de novo.
- Ação destrutiva ou sensível explica a consequência **antes** da confirmação, em uma frase, e o botão de confirmar nomeia o ato ("Encerrar evento"), nunca "OK".
- Controles ao vivo são otimistas com rollback visível. O caminho crítico nunca espera o painel.

### Estados vazios

Todo vazio tem texto próprio e um caminho de saída. Nenhum componente retorna `null` por falta de dado ou de permissão. Sem permissão, a seção aparece explicando o que é e quem pode mexer.

---

## 9. Conteúdo

### Princípios

- Verbo específico em vez de rótulo genérico: "Personalizar o evento", "Baixar o QR code", "Revisar fotos", "Compartilhar o álbum". Nunca "Gerenciar".
- Benefício antes do mecanismo quando a ação não é óbvia.
- Calor no hero e no pós-evento; precisão nos controles. Nenhum dos dois invade o outro.
- Sem emoji, sem exclamação em série, sem promessa que o sistema não cumpre.

### Termos que precisam de explicação no lugar onde aparecem

Moderação, consentimento, telão, missões, gate de interação, modo endurecido, retenção. Cada um ganha uma frase curta no contexto da ação, e a mesma frase alimenta a ajuda.

### Ajuda

Uma seção reabrível, não um tour obrigatório. A introdução da primeira visita é curta, dispensável em um toque, e some para sempre quando dispensada. O painel tem que ser usável por quem ignorou o tutorial — isso é requisito, não gentileza.

---

## 10. Acessibilidade e desempenho

- Contraste mínimo 4.5:1 para texto, verificado inclusive sobre capa com imagem.
- Foco visível em tudo que recebe foco, incluindo cartões clicáveis.
- Semântica real: `nav`, `main`, cabeçalhos em ordem, `aria-current` no item ativo, `aria-live` no que atualiza sozinho.
- Alvo de toque 44×44 mínimo.
- `prefers-reduced-motion` desliga transição de número, parallax e qualquer movimento não essencial.
- Imagem de capa e grade com dimensões declaradas e carregamento progressivo; nada de salto de layout.
- Transições curtas e baratas. Efeito visual nunca custa usabilidade nem velocidade.

---

## 11. Ondas

Cada onda fecha verde no CI antes da próxima começar.

| Onda | Entrega |
|---|---|
| **0 — Fundação** | `faseDoEvento`, escrita de `ended`, `useAdminResource`, adoção de Dialog/Sheet/Toast/Skeleton, remoção de `adminClasses`, shell e navegação novos com desktop, tablet e mobile |
| **1 — Início** | Os quatro estados por fase, onboarding dispensável, checklist persistido (migration 0059) |
| **2 — Fotos** | Todas, Revisar, Destaques; destacar foto (migration 0060) |
| **3 — Convidados** | Participação, Pessoas, insights absorvidos |
| **4 — Experiência** | Identidade, capa, missões, recado, música, telão, Ver como convidado |
| **5 — Compartilhar** | Link, QR, peças, texto pronto |
| **6 — Ajustes e Depois** | Equipe, consentimento, regras, plano, encerrar, retenção visível, retrospectiva |
| **7 — Acabamento** | Copy final, vazios, a11y, contraste, foco, desempenho, revisão dos quatro estados ponta a ponta |

A Onda 0 é o que faz o resto parecer um produto só em vez de dezoito telas remendadas. Nenhuma onda posterior deve reintroduzir fetch cru, skeleton artesanal ou botão fora do DS.

---

## 12. Pronto quando

Por onda:

- CI verde, incluindo os guards de isolamento por evento e de tokens, que são bloqueantes desde o primeiro commit.
- Cobertura mantida nos patamares da fase atual do produto; rebaixar gate para deixar o CI verde é violação.
- Nenhum hex em componente, nenhuma string de domínio fora do pack.
- Toda tela nova tem estado de carregando, vazio e erro, e nenhum retorna `null`.
- Mobile e desktop verificados de verdade, não presumidos.

No fim da Onda 7, os quatro estados do Início revisados em um evento recém-criado, na véspera, durante e depois — e um relato objetivo do que mudou, do que foi validado e do que depende de dado que ainda não existe.

---

## 13. Estados de borda

- Evento sem capa, sem convidados, sem fotos, fila vazia, nenhum destaque.
- Nome de evento muito longo; data ausente ou no passado.
- Papel sem permissão de gestão: vê o painel, entende o que não pode e por quê.
- Painel offline: leitura congela com marcação de horário, escrita desabilita com aviso, nada zera.
- Evento publicado sem missões e sem identidade — o Início cobra, não esconde.
- Fila de revisão com volume alto: paginação e ação em lote, sem travar a tela.

---

## 14. Riscos e decisões em aberto

1. **Volume da Onda 0.** É a maior e a menos visível. Entregar mal significa pagar de novo em todas as outras. Aceito como custo.
2. **Retrospectiva.** Os critérios de capítulo são regra, não modelo, e regra pode produzir um resultado sem graça em evento pequeno. Precisa de teste com dado real antes de fechar a Onda 6.
3. **Tema escuro no admin.** É net-new e aumenta a superfície de contraste a verificar. Se a Onda 0 apertar, entra na Onda 7 sem prejuízo para o resto.
4. **Meta de 40% de participação.** É a H1 do produto e aparece na tela. Se o cálculo de participação hoje não corresponde exatamente à definição da H1, isso precisa ser reconciliado antes da Onda 3, não depois.
5. **Sobreposição com `docs/redesign/painel.md`.** Aquela spec cobre parte do mesmo terreno e não foi implementada. Se esta for aprovada, `docs/redesign/painel.md` precisa ser marcado como superado para o repositório não carregar duas verdades.
