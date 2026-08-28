# Redesign do Admin e da Landing — editorial moderno, foto-first

> Design doc. Escopo: **superfície do anfitrião** (`/admin/**`) e **landing** (`/`, `/15-anos`, `/[slug]`). Não cobre convidado, telão nem `/ops` nesta rodada.
> Data: 2026-08-17 · Branch de origem: `task-004-cliente-upload`
> Companheiro de [`docs/superpowers/specs/2026-08-17-convidado-social-moderno-design.md`](./2026-08-17-convidado-social-moderno-design.md) — mesma linguagem moderna, registro diferente.

---

## 1. O que estamos construindo, em uma frase

Levar a linguagem moderna já decidida para o convidado (Fraunces chique, foto-first, cards com ar, elevação por sombra/cor) para o admin e a landing — mas no **registro editorial claro** (Aesop/Kinfolk/Cereal do `DESIGN.md` §1), não no social escuro do convidado — e, ao investigar as duas superfícies, corrigir uma divergência real de código encontrada nesta rodada: **o admin hoje resolve tokens no chão escuro por omissão**, contra a própria regra do `DESIGN.md`.

## 2. Contexto — o que já existe

### 2.1 A landing já está no registro certo

`apps/web/app/landing/landing-page.tsx` (consumida por `/`, `/15-anos` e — via redirect — `/[slug]`) já é editorial, tokenizada e madura: `Reveal` com `IntersectionObserver`, `ScrollDemo` de 300vh, `PolaroidFan`, `Timeline` por hora, `IdentityWall` trocando modelo em tempo real, cards com `shadow-suave`/`shadow-alta`, `bg-gradient-chao-quente`, Fraunces 300 em todo título (`Heading` de `pieces.tsx`). Não há hex literal, não há palavra de domínio fora do pack (`pack.tokens`, `resolvePackText`). Esta rodada **não reescreve a landing** — poli e estende com o que falta (§5.12).

### 2.2 O admin é funcional, plano, e nunca adotou o vocabulário que a landing criou

`apps/web/features/admin/components/server/admin-shell.tsx` define `AdminSection` como `rounded-superficie border border-linha bg-superficie p-6` — filete e nada mais. Nenhum arquivo em `apps/web/features/admin/**` ou `apps/web/app/admin/**` usa `shadow-suave`, `shadow-alta`, `shadow-acento`, `bg-gradient-chao-quente` ou `bg-gradient-device` — todos definidos em `apps/web/app/tailwind.css` §"Profundidade em duas alturas" e usados extensivamente pela landing. **O vocabulário visual moderno já existe no repositório; o admin simplesmente nunca o importou.** Isto muda o escopo do trabalho: menos "inventar um novo sistema", mais "adotar o que já está no `@theme inline` e nunca foi puxado para dentro do painel".

Sintomas concretos da defasagem, lidos em código real:

- **Sem elevação.** Todo card do admin (`AdminSection`, os cards de `create-event-wizard.tsx`, `event-controls.tsx`) é filete + fundo plano. Nenhum usa sombra — mesmo a landing já ter `--shadow-suave`/`--shadow-alta` calculados a partir de `--ink` (nunca preto puro, DESIGN.md §6).
- **`Switch` duplicado.** `packages/ui-web/src/switch.tsx` exporta um `Switch` acessível (`role="switch"`, `shadow-suave` no thumb). `event-controls.tsx` (linhas 375–401) reimplementa o próprio `Switch` local, sem sombra e sem reusar o pacote — dois componentes fazendo a mesma coisa, um deles invisível para quem for manter o design system central.
- **Nav de seção em pílula preenchida.** `event-nav.tsx` marca a seção ativa com `bg-acento text-sobre-acento` numa pílula — o registro de "app", não de "menu impresso" que o `DESIGN.md` §4 pede para chip/preset (sublinhado, versalete). Não é o mesmo caso de uso de um preset de foto, mas está no mesmo veio: é a única navegação primária do produto do anfitrião e hoje lê como um painel de SaaS genérico.
- **Nenhuma tela é foto-first.** `HostAlbum` (`host-album.tsx`) mostra uma grade `7rem` minúscula com bordas — nunca uma foto grande. Não existe hoje nenhuma tela no admin onde a foto do evento seja a protagonista, ao contrário do convidado (onde é a regra) e da própria landing (que já usa `Frame`/`NightSlot`/`Polaroid` como protagonistas).
- **Zero card "cópia impressa".** O `DESIGN.md` §4 define a "cópia impressa" (papel `#FDFBF7`, rotação -7°/+5.5°, sombra dupla, legenda em versalete) como a unidade de exibição de foto na superfície clara — é exatamente o vocabulário que falta no álbum do admin, e a landing já sabe desenhar (`Polaroid` em `showcases.tsx`).

### 2.3 Achado: o admin resolve no chão ESCURO por omissão — contra o próprio `DESIGN.md`

Isto não é opinião de design, é rastreável em código:

```ts
// packages/tokens/src/marca.ts
export const ALBORA_BRAND: Tokens = {
  ...
  background: "dark", // "Escuro por física... Ver DESIGN.md §2." — mas essa nota é sobre o CONVIDADO
};
```

```ts
// packages/tokens/src/resolver.ts — canonicalize()
background: layerBackground(tokens) ?? "dark",
```

`resolveTokens({ marca: ALBORA_BRAND })`, sem `pack`/`evento`, devolve `background: "dark"` — porque é isso que `ALBORA_BRAND.background` vale, e não há camada por cima para sobrepor. E é exatamente essa chamada que:

- `admin-shell.tsx` → `adminVars()` (usada por **todo** `AdminShell`, ou seja, todas as páginas de `/admin/e/[eventId]/**` e `/admin`)
- `apps/web/app/admin/new/page.tsx` (o wizard)
- `apps/web/app/admin/sign-in/page.tsx`

fazem, sem excecão e sem override. A landing, em contraste, sabe corrigir isto: `landing-page.tsx` linha 165 passa `pack: { ...pack.tokens, background: "light" }` explicitamente.

**Conclusão:** hoje o admin herda `--bg`/`--ink`/`--acento` derivados do chão `noite`, contra a regra explícita do `DESIGN.md` §2 ("Modo duplo — CLARO (papel) → admin, marketing, papelaria impressa"). Este redesign corrige isso na Fase 1 (Task 1.1 do plano) — é a base de tudo o que vem depois, porque nenhuma decisão de sombra/cor tokenizada faz sentido em cima do chão errado.

### 2.4 Papéis já existem no dado; não existem na tela

`apps/web/features/admin/data/load-event-page.ts` já resolve `role: HostEventRole` via `roleForAccountOnEvent` (ADR 0013) — `owner`, `couple` ou `planner` — e `canManageCoupleOnly` já gateia ações sensíveis (ZIP completo em `host-album.tsx`, Assinar Completo e "há menores" em `event-controls.tsx`, convidar equipe em `event-team-panel.tsx`). O dado de papel já existe. **O que não existe é uma experiência diferente para cada papel** — `couple` e `planner` veem exatamente o mesmo `AdminShell` denso, só com menos botões. Isto é o cerne da pergunta "noivos vs. admin" do §4.

## 3. Decisão de produto — pivô assumido (precisa de aprovação do mantenedor)

O briefing desta rodada pede para adaptar a DNA moderna do convidado incluindo **"tema claro/escuro à escolha"** para admin/landing. Isso esbarra numa regra hoje marcada não-negociável no `DESIGN.md` §2 e §7:

> "Não existe toggle de tema em nenhuma superfície... O admin trabalha de dia e a papelaria vai para gráfica." / "❌ Toggle de tema em qualquer superfície"

O spec do convidado (`2026-08-17-convidado-social-moderno-design.md` §2) já pivotou essa regra **só para o convidado**, por decisão explícita do mantenedor, com a obrigação de atualizar `CLAUDE.md`/`DESIGN.md`/ADR na mesma leva. Este documento assume que o pedido desta rodada **estende o mesmo pivô ao admin e à landing** — mas como é uma segunda quebra da mesma regra, e a regra tinha uma razão de produto explícita ("admin trabalha de dia"), registro aqui a leitura e a condição:

| | Antes (`DESIGN.md` hoje) | Proposto aqui |
|---|---|---|
| Admin | Sempre `papel`, sem alternador | **Claro por padrão** (`prefers-color-scheme` do sistema, com fallback claro); alternador manual, escolha persistida por conta (não por evento) |
| Landing | Sempre `papel` | Mesma coisa — o visitante escolhe, nunca a marca decide por ele |
| Papelaria impressa | Sempre `papel` | **Sem mudança.** Impressão não tem "sistema" — PDF/SVG de peça continua fixo em `papel`, sempre. Toggle é de tela, nunca de arquivo exportado |

**Por que isto ainda é seguro:** o admin do casal é ferramenta de trabalho, não o caminho crítico de sábado às 20h — a regra que protege H1 é a do convidado (tela clara às 22h agride a pupila de quem está na festa). O anfitrião configurando o evento numa segunda-feira de manhã, ou o cerimonialista monitorando o painel à noite durante a festa, não têm essa restrição fisiológica — na verdade um painel de monitoramento ao vivo à noite é o caso de uso onde escuro ajuda. **Condição:** isto precisa da mesma atualização de cânone que o convidado já vai fazer (Fase 6 deste plano estende a mesma MR de cânone, não abre uma segunda rodada de mudança de regra).

**Se o mantenedor não confirmar o pivô**, a Fase 1 deste plano ainda vale — a correção do §2.3 (admin sempre claro) é necessária e correta com ou sem alternador; o alternador em si (Task 1.2) fica opcional/descartável sem afetar o resto do trabalho.

## 4. "Noivos" vs. "admin" — investigação e recomendação

Hoje **não existe** separação de experiência por papel — só de permissão. `couple` e `planner` compartilham byte a byte a mesma UI: mesmo `EventNav` com 8 seções, mesma densidade, mesmos formulários de configuração. Ambos entram pelo mesmo `/admin/e/[eventId]`.

Isto é uma dissonância real: o casal quer *acompanhar a festa* (participação, últimas fotos, "está pegando?") mais do que *configurar* (identidade, missões, modelos de telão) — configuração acontece uma vez, semanas antes; acompanhar acontece na noite do evento, com o celular na mão, talvez no meio de uma dança. O cerimonialista, por outro lado, é o operador: ele configura, modera, resolve problema ao vivo — é o usuário do painel denso.

**Recomendação: sim, criar uma visão "Noivos" — mas como um MODO de exibição dentro do mesmo painel, não uma segunda base de código.**

- **Não duplicar rotas.** `/admin/e/[eventId]` continua sendo a URL única; o que muda é o que ela renderiza por papel/preferência.
- **Um novo modo "Acompanhar"** (foto-first, poucos números grandes, "chegando agora" com fotos reais em destaque — não a grade `7rem` de hoje) substitui a tela "Ao vivo" atual quando o usuário é `couple` **e** escolhe esse modo. `planner`/`owner` continuam vendo (ou podem alternar para) o painel denso — eles precisam dos controles de pânico, modo endurecido, moderação.
- **O `EventNav` de 8 seções encolhe para o casal.** Identidade, Missões, Recado e Peças são configuração de "antes da festa" — fazem sentido resumidos num único "Preparar" para quem só passa por ali uma vez. Convidados/Moderação/Insights ficam acessíveis, mas não é preciso as 8 abas visíveis toda vez.
- **A pergunta que decide esta separação (implementação, não design):** o cerimonialista pode estar num evento onde não existe casal cadastrado como usuário do painel (ele é dono da conta). Nesse caso o modo "Acompanhar" simplesmente nunca aparece — é role-gated, não um onboarding a mais.

Isto **não é fora de escopo** — é o Fase 3 deste plano (§8). O ponto de decisão de produto (se o pivô do modo "Acompanhar" nasce já habilitado ou atrás de flag) fica para a discussão de implementação; o design doc só estabelece que a distinção **é real e é resolvida como modo, não como produto separado**.

## 5. Sistema visual — registro editorial claro

Herda o `DESIGN.md` inteiro; esta seção só destaca o que muda ou fica mais explícito para admin/landing.

### 5.1 Base
- **Chão sempre claro por padrão** (papel), com o alternador do §3 quando aprovado. Nunca escuro por omissão — Task 1.1 do plano corrige a regressão do §2.3.
- **Foto entra como protagonista onde já existe conteúdo real** — o álbum do admin, o resumo "ao vivo", a visão "Noivos". Configuração pura (identidade, missões) continua sem foto de fundo — não há foto de evento ainda quando o casal está configurando.
- **Elevação por sombra, nunca por caixa colorida** — `shadow-suave` no card padrão, `shadow-alta` no que precisa se destacar (resultado de export pronto, resumo "ao vivo" em destaque). Ambas já existem em `apps/web/app/tailwind.css`; a Fase 1 só as introduz no `AdminSection`.

### 5.2 Tipografia
- Fraunces **300**, nunca acima (regra dura do `DESIGN.md` §3: acima de 400 só no convidado/telão). O admin hoje já usa `font-titulo` corretamente em títulos de seção — o que falta é peso consistente (alguns `text-lg` sem `font-light` explícito) e tamanho maior em menos lugares ("delicadeza vem de peso baixo em tamanho grande", nunca o contrário).
- Rótulo em versalete serifado com tracking ≥0.20em onde hoje há `uppercase tracking-rotulo text-ink-3` em `text-[0.6875rem]`/`text-xs` — já é o padrão certo em vários lugares (`event-insights.tsx`, `guest-funnel.tsx`); falta estender para o resto (`event-nav.tsx`, badges de status).
- Dado tabular (contagens, `%`, datas) já usa `tabular-nums` nos `Stat` de `live-summary.tsx`/`guest-funnel.tsx`/`event-insights.tsx` — manter, é o único lugar onde mono/tabular é certo (`DESIGN.md` §3).

### 5.3 Componentes-chave (adotar o que existe, criar o que falta)

**Adotar (já existe em `packages/ui-web` ou `apps/web/app/tailwind.css`, subutilizado):**
- `Switch` de `@albora/ui-web` — substitui a duplicata local de `event-controls.tsx`.
- `Card` de `@albora/ui-web` (`rounded-token`, `bg-superficie`/`bg-acento-superficie`) como base, estendido com variante `elevated` (`shadow-suave`) para o novo `AdminSection`.
- `Badge` de `@albora/ui-web` (`tone: neutral|accent|outline`) — substitui os `<span className="rounded-pilula ...">` ad hoc espalhados por `moderation-page.tsx`, `host-album.tsx`, `create-event-wizard.tsx`.
- `Avatar`/`initials` de `@albora/ui-web` — hoje `guest-display-names.tsx` e `event-team-panel.tsx` mostram nome/e-mail em texto puro; um avatar com iniciais dá âncora visual sem PII adicional.
- `bg-gradient-chao-quente`, `shadow-alta`, `bg-gradient-device` — para o herói de `/admin` (lista de eventos) e o card de resultado do wizard.

**Novos (não existem ainda, seguem o vocabulário do `DESIGN.md` §4):**
- **`AdminCard`** — `AdminSection` v2: filete + `shadow-suave`, raio `rounded-superficie` (18px), padding maior. Variante `highlight` com `shadow-alta` + leve `bg-gradient-chao-quente` para o card que precisa se destacar (ex.: card de export pronto, resumo "a festa está pegando?").
- **`PrintedCopyCard`** — a "cópia impressa" do `DESIGN.md` §4 (fundo `#FDFBF7` via token, rotação leve, sombra dupla, legenda em versalete) para o grid do álbum do admin — substitui a grade `7rem` sem alma de `host-album.tsx`.
- **`EditorialTabs`** — navegação de seção em versalete + sublinhado (tracking ≥0.20em, `border-bottom` de 1px que vira `--acento` no item ativo), substituindo a pílula preenchida de `event-nav.tsx`. Mantém `aria-current`/foco visível; é reestilo, não reestrutura de rota.
- **`LiveStat` foto-first** — o "chegando agora" de `live-summary.tsx`/`guest-funnel.tsx` ganha fotos maiores (não a grade de 4 colunas atual) com a mesma leitura de card de foto que a landing já sabe desenhar (`Frame`/`NightSlot`), mantendo URL assinada e curta validade (já é assim hoje — não muda).

### 5.4 Voz e copy
Sem mudança em relação ao `DESIGN.md` §7 — a copy do admin já segue o padrão ("Não foi possível salvar agora. Tente de novo.", nunca código HTTP). Manter.

## 6. Arquitetura de navegação

Rotas **não mudam** — é reestilo e reorganização de densidade, não reestrutura de URL (o `EventNav` de `event-nav.tsx` mapeia direto para as 8 seções existentes). O que muda:

- **`/admin`** ganha uma cabeça editorial (hoje é lista pura); a lista de eventos em si continua uma lista, mas cada linha vira um card com data em versalete, não um `<Link>` sublinhado num `<ul>`.
- **`/admin/e/[eventId]`** passa a ser onde o **modo** (Acompanhar vs. Painel) se decide — ver §4. `EventNav` unificado continua existindo por baixo para quem está no modo Painel.
- **`/admin/vendor/insights`** (fase 3, B2B2C) não muda de rota nem ganha modo "Noivos" — é sempre o cerimonialista/fornecedor, então fica no registro denso.

## 7. Mapa tela-por-tela (hoje → alvo)

> "Hoje" descrito no nível de rota/componente lido em código real nesta investigação; passos de implementação detalham arquivo a arquivo na hora de planejar cada fase (§ "Como este plano está estruturado" no plano de implementação).

### 7.1 Dashboard do anfitrião — `/admin` (`apps/web/app/admin/page.tsx`)
- **Hoje:** `AdminShell` com `AdminSection` plano; lista de eventos em `<ul>`/`<Link>` sublinhado; estado vazio com um parágrafo e um botão.
- **Alvo:** herói leve com `bg-gradient-chao-quente` (mesmo gradiente da landing) atrás do CTA "Criar novo evento"; cada evento da lista vira `AdminCard` com sombra, data em versalete Fraunces, e — quando o evento já tem fotos — uma mini-prévia da última foto enviada (thumb assinado, já disponível via `/api/admin/events/{id}` que `LiveSummary` já consome). Estado vazio ganha ilustração leve (gradiente + ícone, sem stock de casamento — `DESIGN.md` §7).

### 7.2 Onboarding — `/admin/new` (`create-event-wizard.tsx`)
- **Hoje:** wizard de 5 passos num modal fixo (`fixed inset-0 grid place-items-center`) sobre `bg-bg`/`bg-superficie` planos; barra de progresso em pílulas finas — já correto (`DESIGN.md` progresso = filete). Preview de identidade (`identityPreviewClassName`) é um card sem sombra.
- **Alvo:** mesmo fluxo de 5 passos; container ganha `shadow-alta`; preview de identidade ganha `shadow-suave` + a foto de exemplo real do momento sendo escolhido (hoje é só cor/nome); tela de resultado (`Result`) ganha o mesmo `bg-gradient-chao-quente` da landing para o CTA de pagamento, em vez de fundo plano.

### 7.3 Entrar — `/admin/sign-in` (`sign-in-form.tsx`)
- **Hoje:** `Card` num `fixed inset-0 grid place-items-center` plano, chão escuro por omissão (§2.3).
- **Alvo:** primeira correção óbvia é o chão claro (Task 1.1). Visualmente, card ganha `shadow-alta`, título maior em Fraunces 300 (hoje já é `font-light tracking-titulo`, só falta o tamanho "delicado" do `DESIGN.md` §3).

### 7.4 Sala de controle do evento — `/admin/e/[eventId]` (`event-page-layout.tsx` + `event-controls.tsx` + `live-summary.tsx` + `event-team-panel.tsx`)
- **Hoje:** uma pilha longa de `AdminSection` idênticas — pânico, há-menores, modo endurecido, interação social, moderação/convidados, ajuda, upgrade, música, peças, links, equipe. Sem hierarquia visual entre "isto muda a experiência de 200 pessoas agora" (pânico) e "isto é um link para copiar".
- **Alvo:** ver §4 — modo "Acompanhar" (foto-first, poucos números) para `couple`, modo "Painel" (a pilha atual, mas com `AdminCard` com sombra e agrupamento visual: **Controles de risco** — pânico, há-menores, modo endurecido — em destaque com `shadow-alta`; **Configuração** — música, peças, links, equipe — em cards padrão) para `planner`/`owner`. `LiveSummary` (hoje uma grade de thumbs `size-full object-cover` em quadrados minúsculos) ganha o tratamento `LiveStat` foto-first do §5.3.

### 7.5 Insights — `/admin/e/[eventId]/insights` (`event-insights.tsx`)
- **Hoje:** já bem escrito em copy ("A festa está pegando?"), mas visualmente é a mesma grade `Stat` genérica de `guest-funnel.tsx`/`live-summary.tsx` — três componentes quase idênticos e nenhum com identidade visual própria.
- **Alvo:** mesmo conteúdo (dados agregados, sem nome/thumb — regra de privacidade correta e mantida), números principais (H1 participação) em Fraunces grande (`--d-section`/`--d-screen` da escala do `DESIGN.md`) em vez de `text-2xl` genérico — é o número que decide a noite, merece ser o maior texto da tela.

### 7.6 Convidados — `/admin/e/[eventId]/guests` (`guest-funnel.tsx` + `guest-display-names.tsx`)
- **Hoje:** funil em `Stat` genérico + lista de sessões com botões "Trocar"/"Ocultar" em `adminClasses.primaryButtonSm`/`dangerButtonSm`.
- **Alvo:** mesma estrutura; `Badge` de `@albora/ui-web` para contagem de fotos por sessão em vez do texto puro atual; sem mudança de dado exibido (a regra "sem lista nominal fora daqui" já está certa e não muda).

### 7.7 Moderação — `/admin/e/[eventId]/moderation` (`moderation-page.tsx` + `review-queue.tsx` + `comment-moderation.tsx`)
- **Hoje:** fila em cards `bg-bg` planos com dois botões; badge de contagem em pílula preenchida (`bg-critico`/`bg-superficie-alta`) — este é um caso onde a pílula preenchida está correta pelo `DESIGN.md` (badge de estado urgente, não filtro/chip).
- **Alvo:** cards da fila ganham a mesma foto em miniatura da mídia em revisão (hoje só mostra texto "Foto · {autor}" sem imagem — decidir se vale mostrar a própria foto suspeita é uma decisão de produto a confirmar na implementação, já que é conteúdo potencialmente sinalizado). Resto é polish de sombra/tipografia, sem mudança de fluxo de decisão (Manter/Ocultar/Remover continuam exatamente como são — é caminho de segurança, não de estilo).

### 7.8 O álbum — `/admin/e/[eventId]/album` (`host-album.tsx` + `host-export.tsx`)
- **Hoje:** grade `minmax(7rem,1fr)` com fotos em `aspect-[3/4]` e borda fina — a tela mais "foto" do admin hoje, mas ainda tratada como grade de arquivo, não como acervo.
- **Alvo:** este é o candidato natural a `PrintedCopyCard` (§5.3) — grid de cópias impressas com leve rotação e sombra, em vez de grade seca. Ação de ocultar continua exatamente igual (clique → seleciona → confirma) — é o visual da unidade que muda, não a interação. `HostExport` (ZIP completo/curado) ganha `AdminCard` com `shadow-alta` quando o job está `pronto` (é o momento de destaque — "seu arquivo está pronto").

### 7.9 Missões — `/admin/e/[eventId]/missions` (`missions-editor.tsx`)
- **Hoje:** lista com drag-and-drop, switch local por item, preview de `MissionBanner` já vindo de `@albora/ui-web` — este arquivo já reusa um componente compartilhado corretamente, é o exemplo a seguir nos outros.
- **Alvo:** só polish de sombra/raio nos itens de lista; preview do banner ganha o fundo de câmera com leve atmosfera (reusar o padrão `Frame atmosphere` que a landing já tem em `pieces.tsx`) em vez do `bg-superficie` vazio atual.

### 7.10 Identidade — `/admin/e/[eventId]/identity` (`identity-editor.tsx`)
- **Hoje:** grid de 2 colunas — lista de presets + preview `identityPreviewClassName` sem sombra. Modelos de telão em grade de botões.
- **Alvo:** preview ganha `shadow-suave` e o mesmo `IdentityWall` interativo da landing poderia, no limite, ser o mesmo componente reaproveitado aqui (o admin hoje reimplementa uma versão reduzida do que `interactives.tsx` já tem pronto) — avaliar na implementação se compensa extrair `IdentityWall` para `packages/ui-web` e consumir dos dois lados, ou se o acoplamento com `pack`/`PACKS` da landing torna isso mais complexo do que vale.

### 7.11 Recado — `/admin/e/[eventId]/guestbook` (`guestbook-editor.tsx`)
- **Hoje:** textarea + campo de data/hora + gravador de áudio (`guestbook-audio-field.tsx`) num único `AdminSection`.
- **Alvo:** polish de card/sombra; sem mudança de fluxo (é conteúdo sensível — voz do casal — não precisa de foto-first, é texto).

### 7.12 Insights do fornecedor — `/admin/vendor/insights` (`apps/web/app/admin/vendor/insights/page.tsx`)
- **Hoje:** lista de eventos da conta com data, sem números agregados ainda ("H1 por festa quando o funil existir", comentário no próprio código).
- **Alvo:** fora do escopo funcional desta rodada (é Fase 3 do produto, B2B2C) — só herda o polish visual de `AdminCard`/`AdminShell` das outras telas, para não ficar visualmente destoante.

### 7.13 Landing — `/`, `/15-anos`, `/[slug]` (`landing-page.tsx` + `pieces.tsx` + `showcases.tsx` + `interactives.tsx`)
- **Hoje:** já no registro certo (§2.1). Pontos de polish identificados:
  - O tema claro/escuro do §3, se aprovado, precisa de um `ThemeController` análogo ao do convidado — hoje a landing sempre força `background: "light"` explicitamente (linha 165), então o alternador é aditivo, não uma correção de bug como no admin.
  - `LandingStickyCta`/`LandingBeacon`/`LandingCtaLink`/`LandingDemoLink` não foram lidos a fundo nesta rodada (fora do escopo de layout visual — são instrumentação de CTA); revisar na implementação se emitem evento com PII antes de tocar.

## 8. Fora de escopo (desta rodada)

- Convidado, telão, `/ops/*` (dashboard interno da Albora, não do anfitrião).
- App nativo do anfitrião — não existe e não está sendo proposto.
- Mudança de rota ou de fluxo de dado — é reestilo + reorganização de densidade + um modo de exibição por papel, nunca schema novo.
- Implementar de fato o modo "Noivos" (Fase 3 do plano faz a task breakdown; a decisão de habilitar por padrão ou por flag é de implementação).
- Resolver a decisão de mostrar ou não a foto suspeita na fila de moderação (§7.7) — fica anotada para confirmação no início da Fase 4.

## 9. Invariantes de segurança que continuam (não mudam com este redesign)

- Isolamento por evento (`event_id` + RLS forçado, `SET LOCAL`) — nenhuma tela deste redesign lê ou escreve fora do evento do próprio anfitrião; `roleForAccountOnEvent` continua sendo o gate.
- Nenhuma string de domínio em componente — `pack`/`resolvePackText` continuam sendo a única fonte de vocabulário de vertical, inclusive nos novos componentes (`PrintedCopyCard`, `EditorialTabs` etc. não sabem o que é "casamento").
- Nenhum hex literal — todo componente novo sai de token (`--acento`, `--ink`, `--papel`…), guard `tokens` continua bloqueante.
- Nenhuma PII crua em log — `guest-display-names.tsx`, `comment-moderation.tsx`, `event-team-panel.tsx` continuam sem log de nome/e-mail fora do necessário.
- Export (ZIP) continua exigindo reautenticação por e-mail (`use-host-export.ts`) — não é tocado por este redesign.
- `canManageCoupleOnly`/`roleForAccountOnEvent` continuam sendo o único gate de ação sensível — o modo "Noivos" é cosmético/de exibição, nunca abre uma permissão nova nem esconde uma ação que hoje é visível para `couple`.

## 10. Fases de implementação (visão)

1. **Fundação: chão claro + elevação + tema opcional** — corrigir o §2.3 (admin sempre claro por padrão), introduzir `AdminCard`/`Badge`/`Switch` compartilhado, `EditorialTabs`; alternador de tema se o pivô do §3 for aprovado.
2. **Dashboard + onboarding** (`/admin`, `/admin/new`, `/admin/sign-in`).
3. **Sala de controle do evento** (`/admin/e/[eventId]` ao vivo/insights/guests/moderation) + modo "Noivos" (§4).
4. **Álbum, Identidade, Missões, Recado** (conteúdo foto-first — `PrintedCopyCard`, preview de identidade com sombra).
5. **Landing polish + tema opcional + `/admin/vendor/insights`**.
6. **Cânone** — atualizar `DESIGN.md`/`CLAUDE.md` (se o pivô do §3 for aprovado) na mesma leva do pivô do convidado; guards e testes verdes.

Gate de qualidade mantido: guards de isolamento e tokens bloqueantes desde o primeiro commit; cobertura conforme a fase do produto (tabela do `CLAUDE.md`).

## 11. Self-review (cobertura do pedido)

- Explorar admin rota a rota, nível componente → §7.1–7.12, com arquivo real citado em cada. ✓
- Explorar landing → §2.1, §7.13. ✓
- Componentes reutilizáveis (`packages/ui-web`) → §5.3, com achado de duplicação (`Switch`). ✓
- Investigar "noivos vs. admin" com recomendação fundamentada → §4. ✓
- Sistema visual adaptado ao registro claro (não copiar o convidado escuro) → §5, com âncora explícita no `DESIGN.md` §1. ✓
- Tema claro/escuro à escolha, tratado como pivô a confirmar (não assumido silenciosamente) → §3. ✓
- Achado concreto e verificável em código (chão escuro por omissão no admin) → §2.3, com trecho de `resolver.ts`/`marca.ts` citado. ✓
- Fora de escopo e invariantes de segurança → §8, §9. ✓
