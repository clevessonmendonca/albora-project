# Admin e Landing Editorial Moderno — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkbox (`- [ ]`).
>
> **Spec de origem:** [`docs/superpowers/specs/2026-08-17-admin-landing-moderno-design.md`](../specs/2026-08-17-admin-landing-moderno-design.md)
> **Companheiro de:** [`docs/superpowers/plans/2026-08-17-convidado-social-moderno.md`](./2026-08-17-convidado-social-moderno.md) — mesma cadência de fases, superfície diferente.

**Goal:** Levar a superfície do anfitrião (`/admin/**`) e a landing (`/`, `/15-anos`, `/[slug]`) para a linguagem editorial moderna do `DESIGN.md` (Fraunces 300, cards com elevação, foto-first onde há conteúdo real), corrigindo primeiro a divergência de código encontrada na investigação — o admin resolve tokens no chão escuro por omissão — e, em seguida, decidir e implementar a separação "Noivos" (foto-first, acompanhar) vs. "Painel" (denso, configurar) para o mesmo `/admin/e/[eventId]`.

**Architecture:** Next.js App Router + monorepo pnpm. Tokens resolvidos em runtime (`@albora/tokens`) via `resolveTokens`/`toVariables`; hoje o admin chama isso através de `adminVars()` em `apps/web/features/admin/components/server/admin-shell.tsx`, sem passar `background`, o que herda o `"dark"` de `ALBORA_BRAND` (`packages/tokens/src/marca.ts`) — Fase 1 corrige isto forçando `"light"` por padrão. Componentes compartilhados vivem em `@albora/ui-web` (`packages/ui-web/src`); telas específicas do admin em `apps/web/features/admin/components/{client,server}/`; a landing em `apps/web/app/landing/`. Vocabulário de elevação/gradiente (`shadow-suave`, `shadow-alta`, `bg-gradient-chao-quente`, `bg-gradient-device`) já existe em `apps/web/app/tailwind.css` — este plano importa esse vocabulário para o admin em vez de inventar um novo.

**Tech Stack:** TypeScript, React 19 / Next.js (App Router), pnpm workspaces, Vitest, Playwright (e2e), Postgres + RLS, Tailwind v4 (`@theme inline` em `apps/web/app/tailwind.css`) com classes utilitárias sobre tokens semânticos (`bg`, `ink`, `acento`, `linha`, `superficie`).

## Global Constraints

- **Node 22** (`.nvmrc`). Rodar sempre com `nvm use 22`.
- **Zero hex literal em componente.** Cor/fonte/raio/espaço saem de token semântico. Guard `tokens` é bloqueante.
- **Isolamento por evento não negociável.** `roleForAccountOnEvent`/`canManageCoupleOnly` continuam sendo o único gate de ação sensível — o modo "Noivos" (Fase 3) é cosmético, nunca abre nem esconde uma permissão. Guard `isolamento` bloqueante.
- **Nenhuma string de domínio no núcleo.** `pack`/`resolvePackText` continuam a única fonte de vocabulário de vertical, inclusive em componentes novos (`AdminCard`, `EditorialTabs`, `PrintedCopyCard`). Guards `dominio`/`packs` bloqueantes.
- **Nenhuma PII crua em log.** Nome/e-mail de convidado ou de membro da equipe, mascarados sempre.
- **Migrations forward-only** em produção (esta rodada não deve precisar de migration nenhuma — é reestilo + um modo de exibição; se alguma task descobrir necessidade de schema novo, parar e avisar).
- **O pivô do tema claro/escuro (Fase 1, Task 1.6 e Fase 5) depende de confirmação explícita do mantenedor** (spec §3) — sem essa confirmação, pular as tasks de alternador e manter só a correção do chão claro por padrão.
- **Commits Conventional Commits** com escopo (`feat(admin):`, `feat(ui-web):`, `feat(landing):`, `docs(adr):`).
- **CLI de review: `gh`.** MR de feature vai pra `stable`. Nunca merge sem pedido explícito.
- **Verificar todo artefato declarado** (`git status`, `pnpm guards`, `gh pr view`).

## Como este plano está estruturado

O redesign são **6 fases**. Este documento entrega a **Fase 1 pronta pra executar** (passos bite-sized). As Fases 2–6 vêm como **lista de tarefas com arquivos, entregável e intenção de teste** — cada uma é expandida para passos bite-sized **just-in-time, lendo o código daquela área**, imediatamente antes de executá-la.

**Ordem obrigatória:** 1 → 2 → 3 → 4 → 5 → 6. Cada fase entrega software funcionando e testável.

---

## FASE 1 — Fundação: chão claro + elevação compartilhada

Meta: o admin renderiza no chão claro por padrão (corrigindo a regressão da spec §2.3), os componentes compartilhados do design system (`Switch`, `Card`, `Badge`) são reusados em vez de duplicados, e o vocabulário de elevação/gradiente (`shadow-suave`, `shadow-alta`, `bg-gradient-chao-quente`) existe dentro de um `AdminCard` novo — antes de qualquer tela consumir.

### Task 1.1: `adminVars()` força chão claro por padrão

**Files:**
- Modify: `apps/web/features/admin/components/server/admin-shell.tsx`
- Modify: `apps/web/app/admin/new/page.tsx`
- Modify: `apps/web/app/admin/sign-in/page.tsx`
- Test: `apps/web/features/admin/components/server/admin-shell.test.ts` (criar)

**Interfaces:**
- Produces: `adminVars(background?: "light" | "dark"): CSSProperties` — sem argumento, resolve `background: "light"` (correção da regressão); com argumento, permite o override que a Fase 5/alternador vai usar.

- [ ] **Step 1: Teste que falha** — em `admin-shell.test.ts`, chamar `adminVars()` sem argumento e comparar `--bg` contra `toVariables(resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } }))` — hoje `adminVars()` devolve o `--bg` de `noite` (herdado de `ALBORA_BRAND.background === "dark"`), então o teste falha contra o código atual.
- [ ] **Step 2: Rodar e ver falhar** — `nvm use 22 && npx vitest run apps/web/features/admin/components/server/admin-shell.test.ts`.
- [ ] **Step 3: Implementar** — `adminVars(background: "light" | "dark" = "light")`, passando `pack: { background }` (ou `evento`, seguindo o mesmo padrão de `eventVars` em `apps/web/features/guest/lib/event-vars.ts`) para `resolveTokens`. Atualizar as duas chamadas equivalentes em `admin/new/page.tsx` e `admin/sign-in/page.tsx` (hoje `toVariables(resolveTokens({ marca: ALBORA_BRAND }))` direto) para usar a mesma função em vez de duplicar a chamada.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Verificação visual manual** — `pnpm dev`, abrir `/admin/sign-in`, `/admin/new?plano=free` e `/admin` (com sessão): confirmar fundo papel, nunca noite. Capturar antes/depois no PR — é a correção mais visível da fase.
- [ ] **Step 6: Commit** — `fix(admin): resolver tokens no chão claro por padrão`.

### Task 1.2: `AdminCard` — card com elevação, substitui `AdminSection`

**Files:**
- Modify: `apps/web/features/admin/components/server/admin-shell.tsx`
- Test: `apps/web/features/admin/components/server/admin-card.test.tsx` (criar)

**Interfaces:**
- Produces: `AdminCard({ variant, children }: { variant?: "default" | "highlight"; children: ReactNode })` — `default` é `rounded-superficie border border-linha bg-superficie shadow-suave p-6` (a mesma `AdminSection` de hoje, mais `shadow-suave`); `highlight` troca para `shadow-alta` + `bg-gradient-chao-quente`, para o card que precisa se destacar (resultado de export pronto, resumo "a festa está pegando?").
- Mantém `AdminSection` como alias de `AdminCard` (variant default) por uma release, para não quebrar todo import de uma vez — ver Task 1.3 para a migração dos consumidores.

- [ ] **Step 1: Teste que falha** — renderiza `AdminCard` sem `variant`: classe contém `shadow-suave`, não contém `shadow-alta`. Com `variant="highlight"`: contém `shadow-alta` e `bg-gradient-chao-quente`, não contém `shadow-suave`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** com `cn`/`cva` de `@albora/ui-web` (mesmo padrão de `packages/ui-web/src/badge.tsx`) em vez de string literal concatenada, para ficar consistente com o resto do design system.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(admin): AdminCard com elevação (shadow-suave/shadow-alta)`.

### Task 1.3: Migrar consumidores de `AdminSection` → `AdminCard`

**Files:**
- Modify (import + rename, sem mudança de conteúdo): todos os arquivos que hoje importam `AdminSection` de `admin-shell.tsx` — `event-controls.tsx`, `live-summary.tsx`, `event-team-panel.tsx`, `guest-funnel.tsx`, `identity-editor.tsx`, `host-album.tsx`, `moderation-page.tsx`, `event-insights.tsx`, `guestbook-editor.tsx`, `missions-editor.tsx`, `admin/page.tsx`, `admin/vendor/insights/page.tsx` (lista levantada nesta investigação; confirmar com `rg "AdminSection" apps/web` antes de começar).
- Test: nenhum teste novo — os testes existentes de cada componente continuam valendo; a migração não muda comportamento, só a classe CSS aplicada.

- [ ] **Step 1:** `rg -l "AdminSection" apps/web` para a lista definitiva de arquivos.
- [ ] **Step 2:** trocar `AdminSection` por `AdminCard` (sem `variant`, ou seja, comportamento visual quase idêntico + sombra nova) em cada import/uso. Onde a spec (§7) já apontou um candidato a `variant="highlight"` (resultado de export pronto em `host-export.tsx`, resumo "ao vivo" em `live-summary.tsx`), aplicar a variante ali.
- [ ] **Step 3:** `pnpm typecheck` — confirma que nenhum import ficou órfão.
- [ ] **Step 4: Verificação visual manual** — abrir cada rota migrada, confirmar sombra aplicada sem quebra de layout.
- [ ] **Step 5: Commit** — `refactor(admin): migrar AdminSection para AdminCard em todas as telas`.

### Task 1.4: Remover `Switch` duplicado de `event-controls.tsx`

**Files:**
- Modify: `apps/web/features/admin/components/client/event-controls.tsx`
- Test: nenhum teste novo — `Switch` de `@albora/ui-web` já não tem teste próprio; se não existir, considerar abrir subtarefa separada (fora deste plano) em vez de bloquear aqui.

**Interfaces:**
- Consumes: `Switch` de `@albora/ui-web` (`packages/ui-web/src/switch.tsx`) — já tem `role="switch"`, `aria-checked`, `shadow-suave` no thumb.

- [ ] **Step 1:** Remover a função `Switch` local (linhas 375–401 de `event-controls.tsx`) e o import correspondente.
- [ ] **Step 2:** Importar `Switch` de `@albora/ui-web` e ajustar as três chamadas (`hasMinors`, `hardened`) para a assinatura `{ checked, onChange, label }` do componente compartilhado (hoje a versão local usa `{ on, disabled, label, onChange }` — mapear `on`→`checked`; `disabled` não existe no `Switch` compartilhado, então decidir nesta task se estende o componente compartilhado com `disabled?` — provável que sim, já que "salvando" precisa desabilitar o toggle).
- [ ] **Step 3:** Se `disabled` for adicionado ao `Switch` compartilhado, escrever o teste que falha primeiro (`packages/ui-web/src/switch.test.tsx`, criar): `disabled` bloqueia `onClick` e aplica `opacity`/`cursor-wait`. Implementar, ver passar.
- [ ] **Step 4: Verificação visual manual** — `/admin/e/[eventId]` (Ao vivo): alternar "há menores" e "modo endurecido", confirmar visual e estado de "salvando" idênticos ao anterior.
- [ ] **Step 5: Commit** — `refactor(admin): usar Switch compartilhado de @albora/ui-web`.

### Task 1.5: `EditorialTabs` — navegação de seção em versalete + sublinhado

**Files:**
- Create: `packages/ui-web/src/editorial-tabs.tsx`
- Modify: `packages/ui-web/src/index.ts` (export)
- Modify: `apps/web/features/admin/components/client/event-nav.tsx` (consome, mesma lista de `SECTIONS`)
- Test: `packages/ui-web/src/editorial-tabs.test.tsx`

**Interfaces:**
- Produces: `EditorialTabs({ items, active, base }: { items: { label: string; suffix: string }[]; active: string; base: string })` — cada item em versalete Fraunces (`text-[0.6875rem] uppercase tracking-rotulo`), `border-bottom` 1px transparente que vira `--acento` no ativo, sem pílula preenchida. Mantém `aria-current="page"` no item ativo e alvo de toque ≥48px (admin, não convidado).

- [ ] **Step 1: Teste que falha** — renderiza com 3 items e `active` correspondente ao segundo; assert: o segundo tem `aria-current="page"`, os outros não; todos os `href` são `${base}${suffix}`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** com tokens semânticos, sem hex, seguindo o padrão de "Preset/chip — sublinhado, não pílula" do `DESIGN.md` §4.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Trocar `event-nav.tsx`** para consumir `EditorialTabs` com a mesma lista `SECTIONS` de hoje — sem mudar rota nenhuma, só o componente visual.
- [ ] **Step 6: Verificação visual manual** — `/admin/e/[eventId]/*`, confirmar as 8 seções navegáveis, ativa sublinhada, sem pílula preenchida.
- [ ] **Step 7: Commit** — `feat(ui-web): EditorialTabs substitui pílula preenchida na navegação de seção`.

### Task 1.6 (condicional ao pivô do §3): Alternador de tema claro/escuro para admin

> **Só executar esta task se o mantenedor confirmar o pivô da spec §3.** Sem confirmação, pular para Task 1.7 — a Fase 1 já entrega valor completo sem alternador (chão claro corrigido é suficiente).

**Files:**
- Create: `apps/web/features/admin/lib/theme-preference.ts` (server: lê cookie `albora_tema_admin`; retorna `"light" | "dark" | null`)
- Create: `apps/web/features/admin/components/client/theme-controller.tsx` (client: aplica preferência, escuta `prefers-color-scheme`, grava cookie, expõe toggle)
- Modify: `apps/web/features/admin/components/server/admin-shell.tsx` (ligar preferência resolvida em `adminVars(pref)`)
- Test: `apps/web/features/admin/lib/theme-preference.test.ts`

**Interfaces:**
- Produces: `readAdminThemePreference(cookies): "light" | "dark" | null`; `<AdminThemeController initial={...} />` com `toggleTheme()`; cookie `albora_tema_admin` (nome distinto do `albora_tema` do convidado — sessões e preferências dos dois produtos não se misturam).

- [ ] **Step 1: Teste que falha** — mesma forma do Task 1.2 do plano do convidado: cookie `light`/`dark`/ausente → retorno correto, validação contra conjunto fechado.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `readAdminThemePreference`.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Implementar `AdminThemeController`** — 1ª pintura sem cookie segue `prefers-color-scheme`, default cai para `light` se indisponível (nunca `dark` por omissão — é a mesma regressão do §2.3, não reintroduzir); alternar grava cookie e reaplica `adminVars`.
- [ ] **Step 6: Ligar no `AdminShell`** — lê a preferência (server) e passa para `adminVars(pref ?? undefined)`; botão sol/lua no header do shell, ao lado do `SignOutButton`.
- [ ] **Step 7: Verificação manual** — abrir `/admin` com SO no claro e no escuro; alternar; recarregar; sem flash.
- [ ] **Step 8: Commit** — `feat(admin): tema claro/escuro com default do sistema (pivô confirmado)`.

### Task 1.7: Guards + typecheck + lint verdes; abrir PR da fundação

- [ ] **Step 1:** `nvm use 22 && pnpm guards` → 7/7 verdes (isolamento, tokens, dominio, packs, sessao, features, api-routes).
- [ ] **Step 2:** `pnpm typecheck && pnpm lint` → limpos.
- [ ] **Step 3:** `pnpm test` → verde (componentes novos cobertos, migração de `AdminSection` não quebrou teste existente nenhum).
- [ ] **Step 4:** `git ls-remote origin <branch>` confirma push; `gh pr create` para `stable` com resumo da fundação e capturas antes/depois do chão claro. **Não** mergear.

---

## FASE 2 — Dashboard do anfitrião + onboarding

> Expandir para bite-sized lendo antes: `apps/web/app/admin/page.tsx`, `create-event-wizard.tsx`, `sign-in-form.tsx`, `apps/web/app/tailwind.css` (vocabulário de gradiente já disponível).

- **2.1 Dashboard** (`/admin`) — herói leve com `bg-gradient-chao-quente` atrás do CTA; cada evento da lista em `AdminCard`, data em versalete Fraunces, mini-prévia da última foto quando existir (reusar o endpoint que `LiveSummary` já consome, `/api/admin/events/{id}`, sem endpoint novo). Estado vazio com gradiente + copy atual (sem stock de casamento). Teste: dashboard com 0 e com N eventos renderiza os dois estados; prévia de foto só aparece quando a API devolve `ultimas.length > 0`.
- **2.2 Onboarding** (`/admin/new`) — container do wizard ganha `shadow-alta`; preview de identidade ganha `shadow-suave`; tela de resultado (`Result`) ganha `bg-gradient-chao-quente` no CTA de pagamento. Teste: os 5 passos continuam navegáveis, `canAdvance`/validação de data e convidados esperados sem regressão.
- **2.3 Sign-in** (`/admin/sign-in`) — card ganha `shadow-alta`; título em Fraunces 300 no tamanho "delicado" (`--d-inline`/`--d-section` da escala do `DESIGN.md`, confirmar qual cabe no card sem quebrar). Teste: fluxo de magic link (`RequestLink`→e-mail enviado, `Confirm`→sessão) sem regressão — é reestilo puro, os testes existentes (`sign-in-form.test.ts`) continuam valendo como regressão.
- **2.4** Guards/typecheck/lint verdes. PR.

## FASE 3 — Sala de controle do evento + modo "Noivos"

> Ler antes: `event-page-layout.tsx`, `event-controls.tsx`, `live-summary.tsx`, `event-team-panel.tsx`, `load-event-page.ts` (já expõe `role`/`canManageCoupleOnly`).

- **3.1 Decisão de implementação (checkpoint, não código):** confirmar com o mantenedor se o modo "Acompanhar" nasce padrão para `role === "couple"` ou atrás de flag/preferência explícita — a spec (§4) recomenda role-gated por padrão, mas é uma decisão de produto que este plano não fecha sozinho.
- **3.2 `AcompanharView`** (novo componente client) — foto-first: número grande de participação (Fraunces, tamanho de destaque), "chegando agora" com fotos reais maiores (não a grade `size-full object-cover` em quadrados de hoje), atalhos para Álbum/Convidados com contagem ao vivo. Reusa os mesmos endpoints de `LiveSummary`/`GuestFunnel` — sem API nova.
- **3.3 `PainelView`** — o `EventControls` atual, mas com `AdminCard` variant `highlight` agrupando **Controles de risco** (pânico, há-menores, modo endurecido) separado de **Configuração** (música, peças, links, equipe) — reorganização de layout, mesmo conteúdo/mesmas ações.
- **3.4 Seleção de modo** em `event-page-layout.tsx` — `role === "couple"` vê `AcompanharView` com opção de trocar para `PainelView`; `role !== "couple"` vê `PainelView` direto (sem a opção de trocar, ou com ela — decidir na 3.1). Nenhum dado sensível fica visível a mais nem a menos entre os dois modos — é sempre o mesmo `canManageCoupleOnly` decidindo o que renderiza.
- **3.5 Insights e Convidados** (`event-insights.tsx`, `guest-funnel.tsx`) — número principal (H1 participação) em Fraunces grande, substituindo `text-2xl` genérico; `Badge` de `@albora/ui-web` para contagem de fotos por sessão em `guest-display-names.tsx`.
- **3.6 Moderação** (`moderation-page.tsx`, `review-queue.tsx`) — polish de card; **decisão de produto pendente** (spec §7.7, §8): mostrar ou não a mídia sinalizada na fila — confirmar com o mantenedor antes de implementar, não assumir.
- **3.7 e2e** — Playwright: sign-in → dashboard → evento (modo Acompanhar para couple, modo Painel para owner/planner) → alternar modo (se 3.1 decidir que existe alternância) → controles de risco sem regressão de comportamento (pânico ainda pausa o telão). Guards/typecheck/lint verdes. PR.

## FASE 4 — Álbum, Identidade, Missões, Recado

> Ler antes: `host-album.tsx`, `host-export.tsx`, `identity-editor.tsx`, `missions-editor.tsx`, `guestbook-editor.tsx`, `packages/ui-web/src/catalog-frame.tsx` (frames já existentes), `apps/web/app/landing/showcases.tsx` (`Polaroid`/`Frame atmosphere` a reaproveitar).

- **4.1 `PrintedCopyCard`** (novo, `packages/ui-web/src/printed-copy-card.tsx`) — fundo `#FDFBF7` via token novo (ou reaproveitar `--papel` com opacidade, decidir na implementação se precisa de token dedicado ou se `--superficie` claro já resolve), rotação leve entre -7° e +5.5° fixa por posição (nunca aleatória em runtime — regra do `DESIGN.md` §4), sombra dupla, legenda em versalete 8,5px. Teste: renderiza foto + legenda; rotação é determinística pelo índice, não `Math.random()`.
- **4.2 Álbum do admin** (`host-album.tsx`) — grade de `PrintedCopyCard` substitui a grade `minmax(7rem,1fr)` sem rotação de hoje. Ação de ocultar continua idêntica (seleciona → confirma → `PATCH`). `host-export.tsx` ganha `AdminCard` `highlight` quando `estado.fase === "pronto"`. Teste: seleção/ocultação sem regressão; export continua exigindo reauth por e-mail.
- **4.3 Identidade** (`identity-editor.tsx`) — preview ganha `shadow-suave`; avaliar (spec §7.10) se extrai `IdentityWall` de `apps/web/app/landing/interactives.tsx` para `packages/ui-web` e reusa nos dois lados, ou mantém implementações separadas — decisão de implementação, documentar o porquê escolhido no PR.
- **4.4 Missões** (`missions-editor.tsx`) — preview do `MissionBanner` ganha fundo com atmosfera (`Frame atmosphere` da landing) em vez de `bg-superficie` vazio.
- **4.5 Recado** (`guestbook-editor.tsx`) — polish de card, sem mudança de fluxo (gravação de áudio, aceite, agendamento continuam iguais).
- **4.6** e2e: álbum (ocultar foto, exportar), identidade (trocar preset, salvar), missões (reordenar, salvar), recado (salvar e publicar). Guards verdes. PR.

## FASE 5 — Landing: tema opcional + `/admin/vendor/insights`

> Ler antes: `apps/web/app/landing/landing-page.tsx` (já força `background: "light"` na linha 165), `landing-beacon.tsx`, `landing-sticky-cta.tsx`, `landing-cta-link.tsx`, `landing-demo-link.tsx` (não lidos a fundo nesta investigação).

- **5.1 (condicional ao pivô do §3, mesma decisão da Task 1.6)** Alternador de tema na landing — reusar `apps/web/features/admin/lib/theme-preference.ts` (ou extrair um util compartilhado se o padrão for idêntico) com cookie próprio (`albora_tema_landing` ou compartilhado com admin, decidir na implementação: visitante da landing pode nunca logar no admin, então cookies separados são o caminho mais simples). `landing-page.tsx` passa a ler a preferência em vez de forçar `background: "light"` fixo.
- **5.2 Revisão de instrumentação** — ler `landing-beacon.tsx`, `landing-cta-link.tsx`, `landing-demo-link.tsx`, `landing-sticky-cta.tsx` (fora do escopo desta investigação) e confirmar que nenhum evento de analytics carrega PII antes de tocar em qualquer coisa nesses arquivos.
- **5.3 `/admin/vendor/insights`** — herda `AdminCard`/`EditorialTabs` das fases anteriores para não destoar visualmente; sem mudança funcional (o painel de números agregados por evento ainda não existe — fica fora de escopo, é produto de Fase 3 do roadmap geral, não desta rodada de design).
- **5.4** e2e: landing carrega sem JS até o CTA (checar que o spec 013 já garantia isso e continua garantindo); alternador de tema (se implementado) persiste e não quebra `Reveal`/`ScrollDemo`. Guards verdes. PR.

## FASE 6 — Cânone + fechamento

- **6.1** Se o pivô do §3 foi confirmado e implementado: atualizar `DESIGN.md` (remover/ajustar "Não existe toggle de tema em nenhuma superfície" e "❌ Toggle de tema em qualquer superfície" para refletir que agora só a papelaria impressa/telão ficam fixos) e `CLAUDE.md` se necessário — **na mesma leva do pivô do convidado** (Fase 6, Task 6.1 do plano `2026-08-17-convidado-social-moderno.md`), não como uma segunda rodada de mudança de regra.
- **6.2** Se o pivô **não** foi confirmado: nenhuma mudança de cânone é necessária — a correção do chão claro (Fase 1) já estava alinhada com o `DESIGN.md` existente, não é pivô, é bugfix.
- **6.3** `docs/architecture.md` — atualizar se o modo "Noivos vs. Painel" (Fase 3) introduziu uma decisão arquitetural relevante (ex.: um novo conceito de "modo de exibição por papel" que vale documentar como padrão reutilizável); caso contrário, um ADR curto registrando a decisão do §4 (por que modo, não rota separada) é suficiente.
- **6.4** Cobertura conforme a fase do produto (tabela do `CLAUDE.md`); e2e cobrindo dashboard→onboarding→sala de controle→álbum, nos dois modos de papel testados na Fase 3.
- **6.5** `pnpm guards && pnpm typecheck && pnpm lint && pnpm test` verdes; `gh pr view`. Não mergear sem pedido explícito.

---

## Self-review (cobertura do spec)

- Correção do chão claro por padrão no admin (achado §2.3) → Task 1.1. ✓
- Elevação/gradiente adotados do vocabulário já existente (`shadow-suave`/`shadow-alta`/`bg-gradient-chao-quente`) → Tasks 1.2–1.3, Fases 2–4. ✓
- Duplicação de `Switch` corrigida → Task 1.4. ✓
- Nav em pílula preenchida → `EditorialTabs` → Task 1.5. ✓
- Tema claro/escuro tratado como pivô condicional, nunca assumido → Tasks 1.6, 5.1, 6.1–6.2. ✓
- "Noivos vs. admin" → Fase 3 completa, com checkpoint de decisão explícito (3.1) em vez de assumir a resposta. ✓
- Foto-first no álbum (`PrintedCopyCard`) → Fase 4.1–4.2. ✓
- Landing: polish + instrumentação revisada + tema opcional → Fase 5. ✓
- Fornecedor (`/admin/vendor/insights`) → 5.3, mantido fora de escopo funcional. ✓
- Segurança não negociável (isolamento, papel/permissão, PII, tokens, migrations forward-only) → Global Constraints, presente em cada fase. ✓
- Cânone atualizado só se o pivô for confirmado, na mesma leva do convidado → Fase 6. ✓
