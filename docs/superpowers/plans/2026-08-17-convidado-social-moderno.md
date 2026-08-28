# Convidado Social Moderno — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkbox (`- [ ]`).
>
> **Spec de origem:** [`docs/superpowers/specs/2026-08-17-convidado-social-moderno-design.md`](../specs/2026-08-17-convidado-social-moderno-design.md)

**Goal:** Reescrever a superfície do convidado (`/e/[slug]/*`) numa linguagem foto-first moderna (serifada Fraunces, degradê, cards, nav flutuante, tema claro/escuro) e torná-la um app social (stories, feed infinito, curtidas com contagem, comentários, música colaborativa, composer com texto+música, compartilhamento).

**Architecture:** Next.js App Router + monorepo pnpm. Tokens resolvidos em runtime (`@albora/tokens`) viram CSS custom properties aplicadas no layout do convidado; o tema (claro/escuro) é só o campo `background` re-derivando a escala. Componentes vivem em `@albora/ui-web`; telas em `apps/web/features/catalog/components/guest/`; dados/RLS em `@albora/db`. Social novo entra como tabelas escopadas por `event_id` com RLS forçado; nada no caminho crítico de upload.

**Tech Stack:** TypeScript, React 19 / Next.js (App Router), pnpm workspaces, Vitest, Playwright (e2e), Postgres + RLS, Tailwind (classes utilitárias com tokens semânticos `bg`, `ink`, `acento`, `linha`).

## Global Constraints

- **Node 22** (`.nvmrc`). Rodar sempre com `nvm use 22`.
- **Zero hex literal em componente.** Cor/fonte/raio/espaço saem de token semântico (`--bg`, `--ink`, `--acento`, `--raio`…). Guard `tokens` é bloqueante.
- **Isolamento por evento não negociável.** Toda tabela com dado de evento: `event_id` UUID NOT NULL FK, RLS FORÇADO com política `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`. Sempre `SET LOCAL`, `pg_advisory_xact_lock`. Guard `isolamento` bloqueante.
- **Chaves de storage derivadas no servidor** (`events/{event_id}/...`). Cliente nunca informa a chave.
- **Caminho crítico de upload = só object storage + Postgres.** Like/comentário/moderação/música **degradam, nunca falham** o upload.
- **EXIF removido no cliente antes do PUT.** **Nunca logar PII crua** (nome/telefone/e-mail mascarados).
- **IA generativa nunca toca a mídia** (ADR 0007). Filtros são LUT no cliente.
- **Migrations forward-only** em produção.
- **Dependência `pack → core`**, nunca o contrário. Sem string de domínio no núcleo. Guards `dominio`/`packs` bloqueantes.
- **Cobertura ≥90% no pipeline de upload**, ≥60% global.
- **Commits Conventional Commits** com escopo (`feat(guest):`, `feat(db):`, `docs(adr):`).
- **CLI de review: `gh`.** MR de feature vai pra `stable`. Nunca merge sem pedido explícito.
- **Verificar todo artefato declarado** (`git status`, `pnpm guards`, `gh pr view`).

## Como este plano está estruturado

O redesign são **6 fases**. Este documento entrega a **Fase 1 pronta pra executar** (passos bite-sized). As Fases 2–6 vêm como **lista de tarefas com arquivos, entregável e intenção de teste** — cada uma é expandida para passos bite-sized **just-in-time, lendo o código daquela área**, imediatamente antes de executá-la (as telas de câmera/álbum/feed/etc. precisam ser lidas antes de escrever teste de linha, senão o passo vira placeholder — o que a skill proíbe).

**Ordem obrigatória:** 1 → 2 → 3 → 4 → 5 → 6. Cada fase entrega software funcionando e testável.

---

## FASE 1 — Fundação: tema claro/escuro + componentes base

Meta: o convidado pode escolher claro/escuro (default = sistema), a escolha persiste sem flash, e o kit visual novo (nav flutuante, story, foto-herói, card de foto, sheet de comentário) existe e está testado — antes de qualquer tela nova consumir.

### Task 1.1: `eventVars` aceita override de background

**Files:**
- Modify: `apps/web/features/guest/lib/event-vars.ts`
- Test: `apps/web/features/guest/lib/event-vars.test.ts` (criar)

**Interfaces:**
- Produces: `eventVars(event: EventoPublico, background?: "light" | "dark"): CSSProperties` — quando `background` é passado, sobrepõe o fundo resolvido; quando ausente, mantém o comportamento atual (fundo do evento/pack/marca).

- [ ] **Step 1: Teste que falha** — em `event-vars.test.ts`, um evento cujo token resolve `--bg` escuro, chamado com `eventVars(ev, "light")`, produz `--bg` claro (papel) e `--ink` escuro; chamado sem argumento, mantém o `--bg` escuro. Assert nos valores de `--bg`/`--ink` (comparar contra `toVariables(resolveTokens({..., evento:{background:'light'}}))`).
- [ ] **Step 2: Rodar e ver falhar** — `nvm use 22 && npx vitest run apps/web/features/guest/lib/event-vars.test.ts` → FAIL (assinatura não aceita 2º arg).
- [ ] **Step 3: Implementar** — adicionar 2º parâmetro opcional `background`; quando presente, injetar uma camada `evento`/override com `{ background }` na cadeia de `resolveTokens` (sobrepondo o do evento). Reusar `normalizeBackground` de `@albora/tokens` se precisar.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(guest): eventVars aceita override de tema (claro/escuro)`.

### Task 1.2: Resolver a preferência de tema (sistema + escolha) sem flash

**Files:**
- Create: `apps/web/features/guest/lib/theme-preference.ts` (server: lê cookie `albora_tema`; retorna `"light" | "dark" | null`)
- Create: `apps/web/features/guest/components/client/theme-controller.tsx` (client: aplica preferência, escuta `prefers-color-scheme`, grava cookie, expõe toggle)
- Modify: `apps/web/app/e/[slug]/layout.tsx` (passar background resolvido para `eventVars`; injetar script anti-flash)
- Test: `apps/web/features/guest/lib/theme-preference.test.ts`

**Interfaces:**
- Consumes: `eventVars(event, background?)` (Task 1.1).
- Produces: `readThemePreference(cookies): "light" | "dark" | null`; `<ThemeController initial={...}/>` com `toggleTheme()`; cookie `albora_tema`.

- [ ] **Step 1: Teste que falha** — `readThemePreference` retorna `"light"` quando o cookie `albora_tema=light`, `"dark"` quando `=dark`, `null` quando ausente/valor inválido (validação contra conjunto fechado).
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `readThemePreference` (validação conjunto fechado).
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Implementar `ThemeController`** — na 1ª pintura sem cookie, segue `matchMedia('(prefers-color-scheme: dark)')`; ao alternar, grava cookie e atualiza o `background` do container. Anti-flash: no `layout.tsx`, se há cookie, resolve server-side; se não, script inline mínimo aplica a classe do sistema antes da hidratação.
- [ ] **Step 6: Ligar no layout** — `layout.tsx` lê a preferência e passa para `eventVars(evento, pref ?? undefined)`; quando `null`, o container recebe a classe que o script inline define.
- [ ] **Step 7: Verificação manual** — `pnpm dev`, abrir `/e/<slug>` com SO no claro e no escuro; alternar; recarregar; sem flash. (Documentar no PR; e2e cobre na Fase 2.)
- [ ] **Step 8: Commit** — `feat(guest): tema claro/escuro com default do sistema e persistência`.

### Task 1.3: `FloatingNav` — barra de navegação flutuante

**Files:**
- Create: `packages/ui-web/src/floating-nav.tsx`
- Modify: `packages/ui-web/src/index.ts` (export)
- Modify: `packages/ui-web/src/icons.tsx` (garantir ícones `HomeIcon`, `StarIcon`/reusar `Star`)
- Test: `packages/ui-web/src/floating-nav.test.tsx`

**Interfaces:**
- Produces: `FloatingNav({ active, base }: { active: "inicio"|"missoes"|"album"|"minhas"; base: string })` — pílula flutuante, 5 slots (`Início · Missões · 📷 · Álbum · Minhas`), câmera central âmbar elevada linkando `${base}/photo`; item ativo em `--acento`, demais em `--ink-3`. Zero hex; usa `bg-superficie-alta`, `border-linha`, `text-acento`.

- [ ] **Step 1: Teste que falha** — renderiza `FloatingNav` com `active="inicio"`; assert: 5 links com hrefs corretos (`${base}`, `${base}/missions`, `${base}/photo`, `${base}/album`, `${base}/my-photos`), o item ativo tem classe/atributo de ativo, e o botão de câmera tem `aria-label`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** com tokens semânticos (sem hex), alvo ≥54px, `env(safe-area-inset-bottom)`.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(ui-web): FloatingNav flutuante com câmera central`.

### Task 1.4: `StoryRail` — trilha de stories (squircle)

**Files:**
- Create: `packages/ui-web/src/story-rail.tsx`
- Modify: `packages/ui-web/src/index.ts`
- Test: `packages/ui-web/src/story-rail.test.tsx`

**Interfaces:**
- Produces: `StoryRail({ items, onAdd }: { items: StoryItem[]; onAdd?: () => void })`; `type StoryItem = { id: string; nome: string; capaUrl?: string; novo?: boolean }`. Primeiro item é "Você +". Anel `--acento` quando `novo`.

- [ ] **Step 1: Teste que falha** — dado 3 items, renderiza 3 + o "Você"; item `novo:true` tem o anel de destaque; `onAdd` é chamado ao clicar em "Você".
- [ ] **Step 2–4:** falhar → implementar (squircle `--raio` ~18px, scroll-x, sem hex) → passar.
- [ ] **Step 5: Commit** — `feat(ui-web): StoryRail com anel de novidade`.

### Task 1.5: `EventHero` — foto-herói com degradê e nome serifado

**Files:**
- Create: `packages/ui-web/src/event-hero.tsx`
- Modify: `packages/ui-web/src/index.ts`
- Test: `packages/ui-web/src/event-hero.test.tsx`

**Interfaces:**
- Produces: `EventHero({ fotoUrl, overline, titulo, data, onBack, actions }: {...})` — imagem full-bleed, degradê para `--bg`, versalete `overline`, `titulo` em `--fonte-titulo` (serifada) grande e centralizado, `data` secundária.

- [ ] **Step 1: Teste que falha** — renderiza título e data; botão voltar chama `onBack`; o degradê usa `--bg` (não cor fixa) — assert que o container não contém hex literal (regex no className/style) e que o título usa a var de fonte de título.
- [ ] **Step 2–4:** falhar → implementar → passar.
- [ ] **Step 5: Commit** — `feat(ui-web): EventHero foto-herói em degradê`.

### Task 1.6: `PhotoCard` — card de foto do feed com ações sociais

**Files:**
- Create: `packages/ui-web/src/photo-card.tsx`
- Modify: `packages/ui-web/src/index.ts`
- Test: `packages/ui-web/src/photo-card.test.tsx`

**Interfaces:**
- Produces: `PhotoCard({ autor, quando, fotoUrl, curtidas, curtido, comentarios, onCurtir, onComentar, onCompartilhar, onSalvar }: {...})` — header (avatar + nome serifado + tempo), foto canto-grande, barra de ações com **contagem de curtidas** e **contagem de comentários** visíveis.

- [ ] **Step 1: Teste que falha** — mostra `curtidas` e `comentarios` como número; `onCurtir` é chamado ao tocar no coração; estado `curtido` reflete no ícone (aria-pressed).
- [ ] **Step 2–4:** falhar → implementar (tokens, alvo ≥54px) → passar.
- [ ] **Step 5: Commit** — `feat(ui-web): PhotoCard com curtidas e comentários visíveis`.

### Task 1.7: `CommentSheet` — bottom sheet de comentários

**Files:**
- Create: `packages/ui-web/src/comment-sheet.tsx` (reusar `BottomSheet` do `guest-shell`)
- Modify: `packages/ui-web/src/index.ts`
- Test: `packages/ui-web/src/comment-sheet.test.tsx`

**Interfaces:**
- Produces: `CommentSheet({ aberto, comentarios, onEnviar, onFechar }: {...})`; `type Comentario = { id: string; autor: string; texto: string; quando: string }`. Campo de texto valida vazio inline (mensagem de erro, não envia).

- [ ] **Step 1: Teste que falha** — lista comentários; enviar com campo vazio mostra erro e **não** chama `onEnviar`; enviar com texto chama `onEnviar(texto)` e limpa.
- [ ] **Step 2–4:** falhar → implementar → passar.
- [ ] **Step 5: Commit** — `feat(ui-web): CommentSheet com validação de entrada`.

### Task 1.8: Toggle de tema visível no shell do convidado

**Files:**
- Modify: `apps/web/features/guest/components/client/theme-controller.tsx` (expor botão sol/lua)
- Modify: onde fica o header/menu do convidado (`GuestHeader` em `guest-shell` ou o "…"/sparkles do EventHero) para acionar `toggleTheme`
- Test: cobrir em `theme-controller` (client) com um teste de interação

- [ ] **Step 1: Teste que falha** — clicar no toggle alterna o cookie/estado de `light`↔`dark` e chama a troca de background.
- [ ] **Step 2–4:** falhar → implementar → passar.
- [ ] **Step 5: Commit** — `feat(guest): botão de tema (sol/lua) no shell`.

### Task 1.9: Guards + typecheck + lint verdes; abrir PR da fundação

- [ ] **Step 1:** `nvm use 22 && pnpm guards` → 7/7 verdes (isolamento, tokens, dominio, packs, sessao, features, api-routes).
- [ ] **Step 2:** `pnpm typecheck && pnpm lint` → limpos.
- [ ] **Step 3:** `pnpm test` → verde (novos componentes cobertos).
- [ ] **Step 4:** `git ls-remote origin <branch>` confirma push; `gh pr create` para `stable` com resumo da fundação. **Não** mergear.

---

## FASE 2 — Home + Perfil do evento

> Expandir para bite-sized lendo antes: `apps/web/app/e/[slug]/page.tsx`, `cover-screen.tsx`, `feed-screen.tsx`, `resolve-open-event.ts`, `guest-session.ts`.

- **2.1 Home social** — nova `/e/[slug]` (com sessão): `StoryRail` + feed de `PhotoCard` com **scroll infinito** (paginação por cursor, dados na Fase 4 chegam; aqui usar fonte existente/mocada atrás de interface `carregarFeed(cursor)`), `FloatingNav active="inicio"`. Header com nome do casal (serifada) → link pro Perfil. Estados: vazio ("Ainda não tem foto. Seja o primeiro."), offline (banner), skeleton. Teste: feed renderiza cards; scroll dispara `carregarFeed`; toque no nome navega pro perfil.
- **2.2 Perfil do evento** — repaginar `cover-screen.tsx` com `EventHero` + cards de atalho com **número ao vivo** (álbum/missões/convidados) + coverflow de momentos + atalhos música/compartilhar. Teste: cards mostram contagens; coverflow destaca o central.
- **2.3 Ligação nav** — `FloatingNav` em todas as telas da Fase 2; `TabBar` antigo aposentado no fluxo do convidado (manter só onde o catálogo usa). Teste: nav ativa correta por rota.
- **2.4 e2e** — Playwright: QR→entrada→home→perfil→home; tema claro/escuro persiste. Guards/typecheck/lint verdes. PR.

## FASE 3 — Câmera, filtros e envio

> Ler antes: `camera-screen.tsx`, `apps/web/features/photo/*`, `global-queue.tsx`, `packages/core/src/redimensionar.ts`, LUT existente.

- **3.1 Captura foto-first** repaginada (câmera nativa; sem preview ao vivo com filtro).
- **3.2 Tira de filtros** mostrando a **foto real** em cada preset (LUT no cliente, ADR 0007); filtro recomendado do casal em 1º/selo; ajustes Luz/Calor/Contraste/Vinheta.
- **3.3 Composer** (§5.12 do spec): **texto/legenda** (overlay reposicionável + legenda) e **música** (sticker do catálogo da playlist). Escolha story vs post.
- **3.4 Envio otimista + fila offline** + confirmação "a foto amanhece"; EXIF removido no cliente; presign server-derived. Cobertura **≥90%** no pipeline de upload. Teste de carga (150 uploads/20min) antes do 1º evento.
- **3.5 e2e** captura→filtro→composer→envio→confirmação. Guards verdes. PR.

## FASE 4 — Álbum, detalhe e social (dados)

> Ler antes: `album-screen.tsx`, `photo-detail-screen.tsx`, `comment-screen.tsx`, `feed-screen.tsx`, `packages/db/*` (migrations, RLS, finders).

- **4.1 Migrations forward-only** (RLS forçado, `event_id`): `photo_reaction`, `photo_comment`, `story`, `post`/campos `caption`+`music_track_id`. **Teste de isolamento contra Postgres real** (tenant A não lê B). 
- **4.2 API/finders** curtir (idempotente por convidado), comentar (validação+moderação, escopado), feed paginado por cursor. Degradam — falha não derruba upload/feed.
- **4.3 Álbum imersivo** (grid herói + momentos + scroll infinito + chips de filtro).
- **4.4 Detalhe de foto** tela cheia + `CommentSheet` + curtidas com contagem + salvar + compartilhar.
- **4.5 Feed real** liga a Home (2.1) aos dados; contagem de curtidas visível.
- **4.6** e2e curtir/comentar; moderação; guards de isolamento verdes. PR.

## FASE 5 — Missões, Música, Minhas, Entrada, Confessionário, Compartilhar

> Ler antes cada `*-screen.tsx` correspondente.

- **5.1 Missões** — lista limpa, **numeral romano**, progresso em filete, CTA→câmera com missão pré-selecionada.
- **5.2 Música** — playlist colaborativa (pedir/adicionar/curtir pedido/fila), escopada ao evento; alimenta o sticker de música do composer.
- **5.3 Minhas fotos** — perfil do convidado: avatar, nome serifado, grid, fila subindo, suas reações/comentários, compartilhar.
- **5.4 Entrada/QR + consentimento** — nome em serifada grande (a "assinatura"), consentimento versionado/datado; estados de QR com voz humana.
- **5.5 Confessionário** — repaginar na vibe.
- **5.6 Compartilhar** — ação por foto (WhatsApp/IG/sistema) + "chamar convidados" (link/QR, sem PII em querystring). PR.

## FASE 6 — Cânone + fechamento

- **6.1** Atualizar `CLAUDE.md` (remover/ajustar as 3 regras pivotadas: curtida com contagem, comentário, scroll infinito; e o "sem toggle de tema"), `DESIGN.md` (nova linguagem foto-first, tema claro/escuro, componentes) — mantendo intactas as regras de **segurança/isolamento**.
- **6.2** ADR novo registrando o pivô social + o toggle de tema; atualizar/superseder ADR 0009. `docs/architecture.md` na mesma MR.
- **6.3** Cobertura global ≥80% (pós-H1) ou ≥60% (MVP) conforme fase do produto; e2e profundo; budget de bundle na rota do convidado.
- **6.4** `pnpm guards && pnpm typecheck && pnpm lint && pnpm test` verdes; `gh pr view`. Não mergear sem pedido.

---

## Self-review (cobertura do spec)

- Tema claro/escuro + default sistema → Tasks 1.1, 1.2, 1.8. ✓
- Nav flutuante → 1.3. ✓
- Stories → 1.4 + 2.1. ✓
- Home (feed infinito) → 1.6 + 2.1 + 4.5. ✓
- Perfil do evento → 1.5 + 2.2. ✓
- Câmera/filtros/composer(texto+música) → Fase 3. ✓
- Álbum/detalhe/curtida(contagem)/comentário → 1.6/1.7 + Fase 4. ✓
- Música colaborativa → 5.2 (+ sticker em 3.3). ✓
- Minhas/Entrada/Confessional/Compartilhar → Fase 5. ✓
- Modelo de dados social + isolamento → 4.1/4.2. ✓
- Atualização de cânone + ADR → Fase 6. ✓
- Segurança não negociável (isolamento, storage, caminho crítico, EXIF, PII, LUT) → Global Constraints, presente em cada fase. ✓
