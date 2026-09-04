# Redesign Premium — Onda 2: Admin (anfitrião), tela por tela — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Redesenhar cada tela do admin dos noivos (superfície clara, informação-densa) aplicando o sistema Albora Premium — clareza de página de produto Apple num dashboard: resumo antes de detalhe, agrupamento escaneável, whitespace generoso, uma ação primária por tela — sem regressão funcional.

**Architecture:** O admin consome os mesmos tokens (derivados por background — o admin roda em `light`) e os primitivos `ui-web` premium da Onda 0. O shell (`AdminShell`/`EventPageLayout`) é compartilhado por quase todas as telas admin — redesenhá-lo primeiro propaga a todas. Depois, tela por tela. Presentation-only: nenhuma lógica de dados/RLS/auth/billing muda.

**Tech Stack:** Next.js 15.5 (App Router, RSC), React 19, Tailwind v4 (`@theme inline`), Vitest, TypeScript (`exactOptionalPropertyTypes: true`), pnpm monorepo (Node 22 — `source ~/.nvm/nvm.sh && nvm use 22`).

**Spec:** `docs/superpowers/specs/2026-09-04-redesign-premium-ui-ux-design.md`

## Global Constraints

- **Nenhum hex hardcodado.** Toda cor/fonte/raio/espaço via token semântico (`SemanticScale` / classes Tailwind / `.tipo-*` / `.elev-*`). Guards `tokens.mjs` (hex + `backdrop-blur`), `isolamento.mjs`, `dominio.mjs`, `packs.mjs` — bloqueantes, rodar antes de commitar.
- **Zero glassmorphism** (`backdrop-filter`/`backdrop-blur`). Profundidade por elevação quente/scrim.
- **Admin é LIGHT mode.** Os tokens derivam por background; os primitivos da Onda 0 funcionam em claro (contraste re-derivado). WCAG AA no claro. Verificar contraste onde o acento aparece sobre papel.
- **Clareza de dashboard:** resumo antes de detalhe; agrupamento em cards escaneáveis; whitespace generoso; uma ação primária óbvia por tela; densidade calibrada (não é o convidado foto-primeiro — aqui é informação legível).
- **Dado exibido com cuidado de tipografia:** insights/funnel com hierarquia, `font-variant-numeric: tabular-nums` em colunas de números, sparklines/medidores quando fizer sentido — nunca tabela crua sem hierarquia. Cor semântica (bom/alerta/crítico) é separada do acento.
- **Isolamento entre eventos intocado:** nenhuma query, RLS, `SET LOCAL` ou lógica de agregação (vendor `BYPASSRLS`) muda. Presentation-only.
- **Nenhuma string de domínio em componente** (`noiva`/`casamento`) — via pack.
- **Nunca logar PII crua** (nome/telefone/email de convidado). O redesign não introduz log; se tocar exibição de dado de convidado, respeitar o que já existe (funnel é agregado, sem lista nominal).
- Alvos de toque/click ≥44px em controles; foco visível; `prefers-reduced-motion` honrado (base curve para reveals, mola para interação).
- **Sem regressão funcional:** suíte `apps/web` verde por task. Se tocar primitivo `ui-web` compartilhado, justificar + rodar suíte inteira do pacote. `exactOptionalPropertyTypes: true`.
- **Convenção:** componentes admin em `features/admin/components/{client,server}/`. Shell em `features/admin/components/server/`.

## Método por tela (aplica-se a toda task de redesign)
1. **Ler** os arquivos reais (rota + componentes client/server + skeletons) antes de editar.
2. **Redesenhar** aplicando o sistema: hierarquia (`.tipo-*`), espaço generoso, profundidade (`.elev-*`), movimento (mola/base), primitivos premium, resumo-antes-de-detalhe, uma ação primária.
3. **Verificar (código, sem build por task):** suíte da área verde; guards verdes; `tsc` limpo; a11y por asserção (labels, `aria-current`, `role`, alvos ≥44px, contraste no claro). **NÃO rodar `next build`/`next start` por task** (trava — aprendido na Onda 1). Verificação visual real consolidada na Task final, com sessão de host mintada (rota admin renderiza autenticada).
4. **Commit** `feat(admin): ...`.

Decomposição inteligente: tela pesada vira várias tarefas; estado/tela faltando (empty/erro/loading) vira tarefa; tela simples fica uma tarefa. Se pesada demais, reportar DONE_WITH_CONCERNS com corte sugerido.

---

### Task 1: Shell do admin (AdminShell + EventPageLayout + nav)

O chrome compartilhado por quase toda tela admin — redesenhá-lo propaga a todas. Nav lateral/superior, cabeçalho de seção, tabs por-evento.

**Files:**
- Ler/Modify: `apps/web/features/admin/components/server/admin-shell.tsx` (shell/vars/`adminClasses`), `event-page-layout.tsx` (tabs + título de seção), `event-nav.tsx` (grupos de nav)
- Primitivos: `.tipo-*`, `.elev-*`, `Button`, `TabBar`-idioma, tokens light

**Direção:** navegação clara e calma (grupos legíveis, aba ativa com `aria-current` e indicador suave), cabeçalho de seção com `.tipo-title`, área de conteúdo respirando (padding generoso), uma coluna de conteúdo com largura de leitura confortável. Densidade baixa. Movimento sutil (transição de aba na curva média).

**Acceptance:** shell propaga a todas as telas admin sem quebrar; nav com aria-current; hierarquia de cabeçalho; contraste AA no claro; sem regressão (`features/admin` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/admin`.
- [ ] Commit: `feat(admin): redesign admin shell + event nav`

---

### Task 2: Login (sign-in)

`/admin/sign-in` — `SignInForm` (magic-link), sem chrome do shell.

**Files:** Ler/Modify: `apps/web/features/admin/components/client/sign-in-form.tsx` (+ a página). Primitivos: `Card`, `TextField`, `PrimaryButton`, `.tipo-*`.

**Direção:** uma coluna calorosa e simples, campo de email acessível (48px, foco), uma ação primária ("enviar link"), estado de "link enviado" claro. Marca Albora presente (é a porta do anfitrião, não do convidado).

**Acceptance:** campo acessível; ação primária; estado enviado claro; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/admin`.
- [ ] Commit: `feat(admin): redesign sign-in`

---

### Task 3: Lista de eventos + estados

`/admin` — lista de eventos do anfitrião, empty state "criar primeiro evento", banner de upsell de pack, CTA do portal de fornecedor.

**Files:** Ler/Modify: `apps/web/app/admin/page.tsx` + os componentes que ela renderiza (cards de evento, empty, upsell). Primitivos: `Card`, `EmptyState`, `Button`, `.tipo-*`, `.elev-*`.

**Direção:** eventos como cards escaneáveis (nome, data, status com chip semântico), empty state guiando ("crie seu primeiro evento" + CTA), upsell discreto (não intrusivo). Uma ação primária (novo evento). Hierarquia clara.

**Acceptance:** cards legíveis com status; empty guiando com CTA e título bem dimensionado; ação primária; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign event list + empty states`

---

### Task 4: Wizard de criar evento

`/admin/new` — `CreateEventWizard`, multi-passo (nome/timezone → identidade → missões → modelos de telão → pieces/QR). **Tela pesada** — se ficar grande, reportar corte por passo.

**Files:** Ler/Modify: `apps/web/features/admin/components/client/create-event-wizard.tsx` + `wizard-field` e componentes de passo. Primitivos: `Card`, `TextField`, `Select`, `Button`, `ProgressBar`, `.tipo-*`.

**Direção:** onboarding calmo, um passo por vez, progresso claro (indicador de passos), um foco por tela, navegação avançar/voltar óbvia (≥44px), campos acessíveis. Não sobrecarregar o passo.

**Acceptance:** progresso claro; um foco por passo; campos acessíveis; navegação clara; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign create-event wizard`

---

### Task 5: Home do evento (dashboard + controles)

`/admin/e/[eventId]` — resumo ao vivo, checklist pré-evento, controles de gate/moderação/interação, painel de time. O dashboard central.

**Files:** Ler/Modify: `apps/web/features/admin/components/client/{event-controls,live-summary,pre-event-promo,event-team-panel,couple-follow-mode,refresh-control}.tsx` + a página. Primitivos: `Card`, `Switch`, `Badge`, `Button`, `.tipo-*`, `.elev-*`.

**Direção:** **resumo ao vivo primeiro** (números-chave com hierarquia, tabular-nums), depois controles agrupados em cards legíveis (gate/moderação/interação como toggles claros com rótulo e estado), checklist pré-evento como progresso guiado, time discreto. Uma ação primária por bloco. Cor semântica para estados (aberto/fechado/pendente), separada do acento.

**Acceptance:** resumo antes de detalhe; controles agrupados e legíveis; toggles com estado claro; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign event home dashboard + controls`

---

### Task 6: Editor de identidade (tokens + preview + capa)

`/admin/e/[eventId]/identity` — `IdentityEditor` (editor de tokens de marca) + `CoverImageEditor` (upload de capa) com preview ao vivo. **Tela pesada** — o preview ao vivo é o coração; se grande, cortar editor vs preview vs upload.

**Files:** Ler/Modify: `apps/web/features/admin/components/client/{identity-editor,cover-image-editor}.tsx`. Primitivos: `Card`, `TextField`, `Button`, seletores de cor existentes, `.tipo-*`.

**Direção:** editor e preview lado a lado (o casal vê a marca deles assumir em tempo real); campos de cor/fonte acessíveis; upload de capa claro (drag/estado). O preview usa o resolvedor de tokens real (já existe). Uma ação primária (salvar). Não hardcodar cor — os inputs manipulam tokens.

**Acceptance:** editor + preview ao vivo; campos acessíveis; upload claro; preview reflete tokens; contraste AA; sem regressão; sem hex/vidro (o input de cor é valor de dado, não hex de componente).

- [ ] Método por tela. Commit: `feat(admin): redesign identity editor + live preview`

---

### Task 7: Insights (métricas/KPIs)

`/admin/e/[eventId]/insights` — `EventInsights` (métricas, funnel, canais, missões, fotos por hora + export CSV).

**Files:** Ler/Modify: `apps/web/features/admin/components/client/event-insights.tsx`. Primitivos: `Card`, `.tipo-*`, tabular-nums.

**Direção:** **dado com cuidado de tipografia** — KPIs em cards com hierarquia (valor grande, rótulo pequeno), funnel com degraus visuais claros, ranking de missões legível, distribuição por hora como mini-gráfico (barra/sparkline com fill de acento, grid discreta, endpoint destacado) em vez de tabela crua. `tabular-nums` nos números. Botão de export CSV claro. Cor semântica separada do acento.

**Acceptance:** KPIs com hierarquia; funnel/gráficos legíveis; tabular-nums; export claro; contraste AA; sem regressão; sem hex/vidro. **LGPD:** sem nome/thumb de convidado (o CSV já exclui — não regredir).

- [ ] Método por tela. Commit: `feat(admin): redesign event insights`

---

### Task 8: Convidados (funnel)

`/admin/e/[eventId]/guests` — `GuestFunnel` (funil de participação, agregado, sem lista nominal).

**Files:** Ler/Modify: `apps/web/features/admin/components/client/{guest-funnel,guest-display-names}.tsx`. Primitivos: `Card`, `.tipo-*`, tabular-nums.

**Direção:** funil de participação com degraus visuais claros (quantos escanearam → nomearam → fotografaram), agregado. Números com hierarquia e tabular-nums. **Sem lista nominal de convidado** (privacidade — é agregado por design; não introduzir PII). Empty state guiando.

**Acceptance:** funil legível; agregado sem PII; tabular-nums; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign guest participation funnel`

---

### Task 9: Moderação

`/admin/e/[eventId]/moderation` — `ModerationPage` + `review-queue` + `comment-moderation` + contagem.

**Files:** Ler/Modify: `apps/web/features/admin/components/client/{moderation-page,review-queue,comment-moderation,moderation-count-context}.tsx`. Primitivos: `Card`, `Button`, `Badge`, `.elev-*`, foto-frame (`rounded-media`, `object-top`).

**Direção:** fila de revisão foto-primeiro (mídia legível, sem corte de rosto), ações claras (aprovar/ocultar/remover) com alvos ≥44px e cor semântica (crítico para remover), contagem visível. Comentários denunciados legíveis. Uma ação por item. Sem regredir a lógica de moderação (presentation-only).

**Acceptance:** fila legível, foto sem corte; ações claras com cor semântica; alvos ≥44px; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign moderation queue`

---

### Task 10: Álbum do anfitrião + export

`/admin/e/[eventId]/album` — `HostAlbum` + `host-export`/`host-drive-export`.

**Files:** Ler/Modify: `apps/web/features/admin/components/client/{host-album,host-export,host-drive-export}.tsx`. Primitivos: `Card`, grade de foto (padrão álbum), `Button`, `.tipo-*`.

**Direção:** grade de fotos do evento (padrão álbum: `grid-cols`, `rounded-media`, `object-top`, sem corte), export para nuvem do casal como CTA claro (estado do export legível). Uma ação primária. Empty state guiando.

**Acceptance:** grade sem corte; export claro; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign host album + export`

---

### Task 11: Missões (editor)

`/admin/e/[eventId]/missions` — `MissionsEditorLoader` (toggle/ordenar missões + custom com deadline).

**Files:** Ler/Modify: `apps/web/features/admin/components/client/missions-editor.tsx` (+ server loader). Primitivos: `Card`, `Switch`, `TextField`, `Button`, `.tipo-*`.

**Direção:** missões do catálogo do pack como itens togláveis claros (switch + rótulo), missões custom com campos acessíveis (título/emoji/deadline), reordenar tátil (≥44px). Uma ação primária (salvar). Terminologia "missão". Não regredir a lógica de custom missions/deadline.

**Acceptance:** toggles/campos claros; reordenar ≥44px; contraste AA; sem regressão; sem hex/vidro; terminologia "missão".

- [ ] Método por tela. Commit: `feat(admin): redesign missions editor`

---

### Task 12: Guestbook (recado + áudio)

`/admin/e/[eventId]/guestbook` — `GuestbookEditor` + `guestbook-audio-field`.

**Files:** Ler/Modify: `apps/web/features/admin/components/client/{guestbook-editor,guestbook-audio-field}.tsx`. Primitivos: `Card`, `TextField`/textarea, `Button`, `.tipo-*`.

**Direção:** editor de recado do anfitrião com campo de texto acessível e campo de áudio claro (gravar/estado, alvo ≥44px), preview do que o convidado verá. Uma ação primária (salvar). Não regredir a lógica de upload de áudio.

**Acceptance:** campos acessíveis; áudio claro; preview; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign guestbook editor`

---

### Task 13: Consentimento + Pieces/QR + Billing (batch de telas menores)

Três telas menores agrupadas: consent dashboard, pieces/QR, billing. Cada uma é leve; batch numa task com diff coeso.

**Files:**
- `apps/web/features/admin/components/client/consent-versions.tsx` (dashboard de versões de consentimento — só leitura, agregado)
- `apps/web/features/admin/components/client/{event-pieces,qr-code-print,qr-proof-sheet}.tsx` (pieces + QR + folha de impressão)
- `apps/web/features/admin/components/client/billing-history.tsx` (histórico de pagamento)
- `apps/web/features/admin/components/client/event-music.tsx` se leve (config de música do evento)
- Primitivos: `Card`, `.tipo-*`, tabular-nums, `Button`.

**Direção:** cada uma — cards legíveis, hierarquia, uma ação primária. Consent: versões com contagem agregada (sem PII), texto legível. Pieces/QR: QR e folha de impressão claros, download óbvio (reusa o download da MVP). Billing: histórico com tabular-nums, status com chip semântico. Música: config simples.

**Acceptance:** cada tela legível com hierarquia; sem PII no consent; downloads claros; billing tabular-nums; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign consent, pieces/QR, billing, music`

---

### Task 14: Vendor (fornecedor — 3 telas)

`/admin/vendor/new` (criar), `/admin/vendor/[vendorId]/settings` (nome/slug + brand), `/admin/vendor/insights` (cross-event agregado).

**Files:** Ler/Modify: `apps/web/features/admin/components/client/{vendor-form,vendor-branding}.tsx` + as páginas vendor; `vendor-portal` insights se admin-side. Primitivos: `Card`, `TextField`, `Button`, `.tipo-*`.

**Direção:** form de vendor acessível (nome/slug com auto-slug), editor de brand tokens do fornecedor (preview), insights cross-event agregado com hierarquia e tabular-nums (caminho de agregação auditado — NÃO tocar a lógica `BYPASSRLS`/audit). Uma ação primária por tela.

**Acceptance:** forms acessíveis; brand editor com preview; insights agregado legível; agregação/audit intocada; contraste AA; sem regressão; sem hex/vidro.

- [ ] Método por tela. Commit: `feat(admin): redesign vendor portal screens`

---

### Task 15: Verificação da Onda 2 (admin) — com sessão de host real

Prova visual e funcional do admin inteiro. Usa a receita de renderização (sessão de host mintada) para screenshotar rotas admin REAIS.

**Files:** Nenhum de produção. Opcional: nota no spec §5.2.

- [ ] **Build de produção** (`(cd apps/web && pnpm exec next build)`) + `next start -p 3100`.
- [ ] **Sessão de host** via a receita de renderização (`apps/web/scripts/dev-render-recipe.mjs` ou equivalente) — cookie de host + eventId.
- [ ] **Percorrer rotas admin reais** (`/admin`, `/admin/e/<id>`, `/identity`, `/insights`, `/guests`, `/moderation`, `/missions`, etc.) desktop, com o cookie. Screenshots. Confirmar: hierarquia resumo-antes-de-detalhe, cards escaneáveis, tabular-nums nos dados, contraste no claro, nav com indicador, nenhum vidro, zero erro de console.
- [ ] **A11y:** `read_console_messages`, contraste amostral no claro, teclado.
- [ ] **Suíte inteira + guards:** `pnpm exec vitest run apps/web && node tools/guards/tokens.mjs && node tools/guards/isolamento.mjs && node tools/guards/dominio.mjs && node tools/guards/packs.mjs`. Verde.
- [ ] Commit (se nota no spec): `docs(redesign): mark Onda 2 (admin) complete`

---

## Self-Review (feito na escrita)

- **Cobertura do spec §5.2 (admin):** shell→T1, login→T2, lista→T3, wizard→T4, home/controles→T5, identidade→T6, insights→T7, guests→T8, moderação→T9, álbum→T10, missões→T11, guestbook→T12, consent+pieces/QR+billing+música→T13, vendor(3)→T14, verificação→T15. Todas as ~18 telas admin do inventário têm task; pesadas (wizard, identidade) sinalizadas para corte; menores agrupadas (T13, T14).
- **Decomposição inteligente:** shell primeiro (propaga); pesadas com corte previsto; menores em batch coeso; nenhuma tela sem task.
- **Placeholders:** direção concreta por tela (o quê domina, hierarquia, primitivos, dado-como-tipografia), não CSS linha-a-linha — correto para redesign visual iterativo. Verificação com sessão de host real (a receita de renderização resolve a lacuna de screenshot da Onda 1).
- **Escopo:** Onda 2 é entregável sozinha (admin inteiro, sem regressão). Onda 3 (telão + landing) é plano separado.
