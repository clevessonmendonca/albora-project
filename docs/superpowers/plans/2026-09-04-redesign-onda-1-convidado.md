# Redesign Premium — Onda 1: Convidado PWA, tela por tela — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar cada tela da superfície do convidado (PWA, escura, foto-primeiro, H1-crítica) aplicando o sistema Albora Premium da Onda 0 — hierarquia resolvida, espaço generoso, movimento com física, profundidade por elevação quente, estados vazios guiando — sem regressão funcional.

**Architecture:** A Onda 0 entregou tokens (tipografia/movimento/elevação) e primitivos `ui-web` premium que propagam por construção. A Onda 1 é trabalho **por tela**: cada rota do convidado ganha layout, hierarquia, densidade, movimento e estados repensados, consumindo os primitivos e tokens da fundação. Nenhuma lógica de dados/upload/RLS/sessão muda — é experiência.

**Tech Stack:** Next.js 15.5 (App Router, RSC), React 19, Tailwind v4 (`@theme inline`), Vitest, TypeScript (`exactOptionalPropertyTypes: true`), pnpm monorepo (Node 22 — `source ~/.nvm/nvm.sh && nvm use 22`).

**Spec:** `docs/superpowers/specs/2026-09-04-redesign-premium-ui-ux-design.md`

## Global Constraints

- **Nenhum hex hardcodado.** Toda cor/fonte/raio/espaço via token semântico (`SemanticScale` / classes Tailwind / `.tipo-*` / `.elev-*`). Guards `tokens.mjs` (inclui agora anti-`backdrop-blur`), `isolamento.mjs`, `dominio.mjs`, `packs.mjs` — bloqueantes, rodar antes de commitar.
- **Zero glassmorphism.** Sem `backdrop-filter`/`backdrop-blur`. Profundidade por elevação quente (`.elev-1/2/3`) e scrim sólido. O guard reprova.
- **Convidado é escuro por física, sem login, uma mão, luz baixa.** Alvo de toque ≥44px, contraste WCAG AA nas superfícies escuras, operação com uma mão (ação primária ao alcance do polegar).
- **A foto é a interface.** Onde a foto domina (câmera, editor, viewer, cover), a chrome recua. Presença de marca Albora mínima perto do convidado; a identidade do evento assume.
- **Nenhuma string de domínio em componente** (`noiva`, `casamento`). Tudo via pack.
- **Caminho crítico (upload) intocado:** presign → R2 → confirm. Nenhum efeito visual entra no caminho de bytes. EXIF removido no cliente (não mexer).
- **`prefers-reduced-motion` honrado** em todo movimento (kill-switch global cobre CSS; qualquer timer/animação JS nova é gated em `matchMedia`).
- **Uma ação primária por tela.** Hierarquia clara: primária > secundária > terciária.
- **Sem regressão funcional.** A suíte de testes existente (`apps/web`) fica verde. Não remover testes; adicionar asserções de a11y onde fizer sentido. Não inventar snapshots frágeis.
- **`exactOptionalPropertyTypes: true`** — nunca passar `undefined` explícito para prop opcional.
- **EmptyState:** a Onda 0 aumentou `.tipo-title`; ao redesenhar telas com EmptyState (feed/álbum/missões/minhas-fotos/música/perfil), conferir o tamanho do título por olho e ajustar (usar `.tipo-subtitle` em vez de `.tipo-title` se `.tipo-title` ficar grande demais no contexto).

## Método por tela (aplica-se a TODA task de redesign, T1–T13)

Cada task de redesign segue este ciclo (não repetido nos steps de cada task — é o contrato global):
1. **Ler** os arquivos reais da tela (rota + componentes client/server + skeletons + hooks) antes de editar.
2. **Renderizar o estado atual** (build de produção — `cd apps/web && pnpm exec next build && pnpm exec next start -p 3100` — o dev server tem um bug de webpack HMR no browser embutido; produção não). Screenshot "antes".
3. **Redesenhar** aplicando o sistema Albora Premium: hierarquia tipográfica (`.tipo-*`), ritmo de espaçamento generoso (escala 4px do Tailwind), profundidade (`.elev-*`), movimento (mola/saída), primitivos premium (Button/Card/Sheet/campos/nav/EmptyState), uma ação primária clara, estados (loading/empty/erro) intencionais.
4. **Verificar:** suíte `apps/web` verde; guards verdes; a11y (contraste no escuro, teclado, `aria-current`/labels, reduced-motion); browser desktop + mobile (`resize_window` mobile 375px). Screenshot "depois".
5. **Commit** com escopo `feat(<área>):` (ex.: `feat(guest): redesign entry flow`).

Regra de decomposição: se uma tela for pesada demais para uma task (o implementer sente que um reviewer aprovaria uma parte e reprovaria outra), reportar DONE_WITH_CONCERNS descrevendo o corte sugerido; o controller divide.

---

### Task 1: Entrada do convidado (QR → nome → consentimento)

A tela mais importante do produto — o pedágio-zero da primeira foto (decide a H1). `EntryFlow` (nome + primeiro consentimento) na rota `/e/[slug]`.

**Files:**
- Ler/Modify: `apps/web/features/guest/components/client/entry-flow.tsx`
- Ler: `apps/web/app/e/[slug]/page.tsx` (como `EntryFlow` é montado; tema escuro do pack), `apps/web/features/guest/components/client/event-countdown.tsx` (se aparece aqui)
- Primitivos: `NameField`, `ConsentCheckbox`, `PrimaryButton`, `EntryColumn`, `DisplayTitle`, `EventLabel`, `FinePrint` (de `@albora/ui-web`)

**Direção de redesign:**
- Uma coluna, respirando, calorosa. A identidade do evento (capa/monograma) presente mas sem competir. Uma ação primária óbvia (continuar/entrar).
- Campo de nome com tipografia de destaque (`.tipo-title` ou display no input, como já é o padrão da entrada), placeholder claro (`ink-3`), alvo ≥48px (já vem do primitivo T6), nome acessível (ariaLabel).
- Consentimento humano e claro, não jurídico frio — o texto já vem do registro `@albora/core`; foco no layout: checkbox 44px hit-area, link "ler texto completo" legível, versão/data discretas.
- Movimento: entrada suave da coluna (fade/rise na curva-base), foco no campo. Nada que atrase a primeira foto.

**Acceptance:** uma ação primária; nome + consentimento acessíveis (teclado, aria); contraste AA no escuro; sem regressão no fluxo (o teste e2e/entry e a suíte `features/guest` verdes); sem hex; sem vidro.

- [ ] Seguir o Método por tela (T1–T13). Suítes: `pnpm exec vitest run apps/web/features/guest`.
- [ ] Commit: `feat(guest): redesign entry flow (name + consent)`

---

### Task 2: Capa do evento (Cover)

`/e/[slug]/cover` — a tela-herói do evento; a foto/identidade do casal domina. `CoverContent` (server) + `cover-page`/`cover-hero`/`cover-event-info`/`cover-shortcut`/`invite-button`/`moments-section`.

**Files:**
- Ler/Modify: `apps/web/features/cover/components/**` (client `cover-page`, server `cover-content`, `cover-hero`, `cover-event-info`, `cover-shortcut`, `invite-button`, `moment-card`/`moments-section`)
- Primitivos: `EventHero`, `Button`, `Card`, `.tipo-display`/`.tipo-title`

**Direção:** herói respira (imagem de capa em foco, gradiente `veu-capa` já existente, sem corte de rosto), título do evento em Fraunces display, atalhos claros (câmera, feed, álbum) como ações táteis, "momentos" como cards com elevação quente. Uma ação primária: tirar foto. Movimento: revelação suave do herói.

**Acceptance:** herói sem competir com chrome; atalhos ≥44px; ação primária clara; contraste AA; sem regressão (`features/cover` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/cover`.
- [ ] Commit: `feat(cover): redesign event cover hero`

---

### Task 3: Home pós-entrada (dentro do evento)

`/e/[slug]` quando há sessão — `HomeContent`/`home-page`/`home-feed-card`/`story-viewer`/`use-stories`. Espelha o telão antes do gate; ponto de partida do convidado.

**Files:**
- Ler/Modify: `apps/web/features/home/components/**`
- Primitivos: `Card`, `StoryRail`, `TabBar`/`FloatingNav`, `.tipo-*`, `.elev-*`

**Direção:** hierarquia clara — o que está acontecendo agora (stories/feed espelhado) em destaque, ações (câmera, missões) ao alcance. Story rail com movimento suave; cards com elevação. Nav inferior refinada (indicador ativo da T7). Estado antes-do-gate claro (o feed abre por decisão do casal).

**Acceptance:** hierarquia resolvida; nav com aria-current; ação primária (câmera) óbvia; contraste AA; sem regressão (`features/home` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/home`.
- [ ] Commit: `feat(guest): redesign in-event home`

---

### Task 4: Câmera (captura)

`/e/[slug]/photo` — captura. `camera-view`/`camera-step`. A foto é tudo; a chrome recua ao máximo.

**Files:**
- Ler/Modify: `apps/web/features/photo/components/**` — `camera-view`, `camera-step`, `nav-camera-button`/`camera-button`
- Primitivos: `NavCameraButton`, `Button` (mínimo)

**Direção:** viewport de câmera domina; controles mínimos e grandes (disparo central ≥64px, alternâncias discretas). Uma mão. Missão/prompt ativo (quando `?missao=`/`?prompt=`) aparece como banner sutil (`MissionBanner`), não intrusivo. Movimento: feedback tátil no disparo (mola). Sem chrome pesada.

**Acceptance:** disparo grande e alcançável; chrome recuada; missão visível sem competir; contraste AA; caminho de captura/upload intocado; sem regressão (`features/photo` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/photo`.
- [ ] Commit: `feat(photo): redesign camera capture`

---

### Task 5: Editor (LUT, texto, música)

`/e/[slug]/photo` editor — `editor`/`editor-canvas`/`editor-controls` + abas (`ajustes-tab`, `filtros-tab`, `texto-tab`, `painel-musica`, `chip`, `deslizante`, `button-aba`). A tela de ofício; a foto ocupa o palco, controles chamados sob demanda. **Tela pesada** — se ficar grande demais, reportar corte (ex.: shell+filtros numa task, texto+música noutra).

**Files:**
- Ler/Modify: `apps/web/features/photo/components/**` (editor e sub-abas), `editor-step`
- Primitivos: `EditorialTabs`/tabs, `Slider`/`deslizante`, `FilterChip`/`chip`, `Button`, `.tipo-label`

**Direção:** a foto em foco central com `raioMedia`; barra de abas refinada (indicador de aba com movimento, T7 pattern); controles (LUT como chips com preview, ajustes como sliders premium, texto com tipografia do sistema, música como painel) recuam quando não usados. Movimento: transição suave entre abas (mola), aplicação de LUT instantânea. IA generativa nunca toca a mídia (só LUT cliente).

**Acceptance:** foto domina; abas com hierarquia e movimento; controles táteis ≥44px; sem IA generativa; contraste AA; sem regressão (`features/photo` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/photo`.
- [ ] Commit: `feat(photo): redesign editor (LUT, text, music)`

---

### Task 6: Confirmação do 1º upload ("a foto amanhece")

`success-step` + `upload-arc` + `pwa-install-cta` + fila (`global-queue`/`queue-panel`). O pico emocional; e onde o convite ao app instalável aparece (ADR 0008) — nunca antes.

**Files:**
- Ler/Modify: `apps/web/features/photo/components/**` — `success-step`, `upload-arc`, `pwa-install-cta`, `global-queue`, `queue-panel`, `retry-section` (se aplicável)
- Primitivos: `Button`, `Card`, `AnimatedCounter`, `.tipo-display`

**Direção:** o momento — "a foto amanhece", varredura âmbar (movimento já previsto no design; preservar/elevar). Confirmação como momento, não toast. Arco de upload com física (mola). Convite ao app aparece **na confirmação da primeira foto**, calmo, opcional, nunca bloqueante. Fila offline visível e tranquilizadora (retry claro). Movimento respeitando reduced-motion.

**Acceptance:** momento emocional presente; convite ao app só aqui e opcional; fila/retry claros; caminho de upload intocado; contraste AA; sem regressão (`features/photo` verde); sem hex/vidro; reduced-motion ok.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/photo`.
- [ ] Commit: `feat(photo): redesign first-upload confirmation + app invite`

---

### Task 7: Feed (lista)

`/e/[slug]/feed` — `feed-page`/`feed-content`/`post`/`hour-strip`/`feed-filter-panel`/`temporal-filter`/`new-photos-button`/`feed-empty-state`/`gate-opened-overlay`/`mirror-grid`. A lista social.

**Files:**
- Ler/Modify: `apps/web/features/feed/components/**` (lista, post card, hour-strip, filtros, empty, gate-overlay, new-photos)
- Primitivos: `PhotoCard`, `Card`, `FilterChip`, `EmptyState`, `TabBar`/`FloatingNav`, `.tipo-*`

**Direção:** hierarquia do feed — foto em destaque (`raioMedia`, sem corte de rosto), autoria discreta, reações legíveis. Hour-strip como navegação temporal fluida. Filtros como chips premium. `new-photos-button` com movimento sutil. Empty state guiando ("seja o primeiro" + CTA câmera) — conferir tamanho do título (EmptyState). Gate-opened overlay como momento. Densidade calibrada, scroll suave.

**Acceptance:** foto domina o card; hierarquia clara; empty state com CTA e título bem dimensionado; nav aria-current; contraste AA; sem regressão (`features/feed` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/feed`.
- [ ] Commit: `feat(feed): redesign social feed list`

---

### Task 8: Interações do feed (viewer, comentários, reações, denúncia)

Superfícies de interação: `viewer` (mídia fullscreen), `comment-sheet`, `reaction-list-sheet`, `report-sheet`, `photo-interaction`. Usam os sheets premium da Onda 0 (física, drag-to-dismiss, scrim quente).

**Files:**
- Ler/Modify: `apps/web/features/feed/components/**` — `viewer`, `comment-sheet`, `reaction-list-sheet`, `report-sheet`, `photo-interaction`
- Primitivos: `BottomSheet`, `Dialog`, `CommentSheet`, `Button`, `.tipo-*`

**Direção:** viewer fullscreen com a foto dominando, chrome recuada, gestos (swipe/fechar). Comment sheet com física de entrada e drag-to-dismiss (T5), campo de comentário acessível (T6). Reações com microinteração (mola). Denúncia clara e discreta. Movimento respeitando reduced-motion.

**Acceptance:** viewer foto-primeiro; sheets com física e drag; campos acessíveis; reações com feedback; contraste AA; sem regressão (`features/feed` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/feed`.
- [ ] Commit: `feat(feed): redesign feed interactions (viewer, comments, reactions)`

---

### Task 9: Álbum

`/e/[slug]/album` — `album-page`/`album-with-tabs`/`album-timeline`/`album-cover-hero`/`album-filters`/`album-counters`/`album-lightbox`/`lightbox-top-bar`/`lightbox-nav-buttons`/`chapter-time-range`/`album-footer`. Galeria por capítulos.

**Files:**
- Ler/Modify: `apps/web/features/album/components/**`
- Primitivos: `PhotoCard`, `EditorialTabs`, `FilterChip`, `Card`, `.tipo-*`, `.elev-*`

**Direção:** capítulos com hierarquia temporal clara (`chapter-time-range` como cabeçalho editorial), grid de fotos respirando sem corte de rosto, cover-hero do álbum em destaque. Lightbox premium — foto domina, top-bar/nav recuados, transições suaves (elemento compartilhado grid→lightbox). Filtros/contadores legíveis. Movimento na abertura do lightbox (mola).

**Acceptance:** capítulos legíveis; grid sem corte; lightbox foto-primeiro com transição; contraste AA; sem regressão (`features/album` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/album`.
- [ ] Commit: `feat(album): redesign chapter album + lightbox`

---

### Task 10: Missões

`/e/[slug]/missions` — `missions-page`/`missions-content`/`mission-item`/`missions-progress`/`missions-badge`/`camera-button`/`celebration-overlay`/`completed-list`/`free-mode-state`/`mission-completion-toast`. Lista de missões fotográficas.

**Files:**
- Ler/Modify: `apps/web/features/missions/components/**`
- Primitivos: `Card`, `ProgressBar`, `Badge`, `MissionBanner`, `Button`, `EmptyState`, `.tipo-*`

**Direção:** missões como cards táteis com elevação, progresso claro (`ProgressBar` premium), missão completa com celebração (movimento — mola, respeitando reduced-motion). CTA câmera por missão ≥44px. Free-mode e completed-list com estados intencionais. Deadline (se houver, da T19 do MVP) legível. Terminologia "missão" (não "desafio").

**Acceptance:** progresso e estado claros; celebração com movimento; CTA por missão tátil; contraste AA; sem regressão (`features/missions` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/missions`.
- [ ] Commit: `feat(missions): redesign guest missions`

---

### Task 11: Minhas fotos

`/e/[slug]/my-photos` — `my-photos-page`/`my-photos-content`/`recap-card`/`recap-sheet`/`share-consent-sheet`/`colagem-section`/`gallery-item`/`miniatura-minhas`/`recap-section`/`retry-section`/`use-recap`. Uploads do convidado + recap/colagem + retry offline.

**Files:**
- Ler/Modify: `apps/web/features/my-photos/components/**`
- Primitivos: `PhotoCard`, `Card`, `BottomSheet`, `Button`, `EmptyState`, `.tipo-*`

**Direção:** galeria pessoal respirando, recap/colagem como CTA de destaque (card com elevação), share-consent como sheet premium (segundo consentimento, ADR 0009 — claro, opt-in). Retry offline tranquilizador. Empty state guiando. Memórias automáticas opt-in, desligável em um toque (LGPD).

**Acceptance:** galeria + recap claros; share-consent acessível e explícito; retry claro; opt-out fácil; contraste AA; sem regressão (`features/my-photos` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/my-photos`.
- [ ] Commit: `feat(my-photos): redesign personal gallery + recap`

---

### Task 12: Música

`/e/[slug]/music` — `music-page`/`music-content`/`suggestion-form`. Now-playing + pedido de música (link Spotify).

**Files:**
- Ler/Modify: `apps/web/features/music/components/**`
- Primitivos: `Card`, `TextField`, `Button`, `.tipo-*`

**Direção:** now-playing como destaque calmo (capa + faixa em Fraunces), form de sugestão simples e acessível (campo T6, colar link Spotify), estado vazio guiando. Uma ação primária (sugerir). Movimento discreto (pulso da faixa tocando — já existe `mus-pulsar`, respeitar reduced-motion).

**Acceptance:** now-playing legível; form acessível; ação primária clara; contraste AA; sem regressão (`features/music` verde); sem hex/vidro.

- [ ] Método por tela. Suíte: `pnpm exec vitest run apps/web/features/music`.
- [ ] Commit: `feat(music): redesign music now-playing + request`

---

### Task 13: Perfil do convidado + estados/chrome compartilhados

Perfil `/e/[slug]/g/[autorId]` (`author-profile-page`/`profile-header`/`profile-stats`/`photo-grid`) **e** os estados/chrome compartilhados: `event-notice` (fechado/rascunho/encerrado/não-começou), `no-session`, `offline-banner`, `scan-page`/`rescue-scanner`, `confessional` list, `pair`/`app-open-cta`.

**Files:**
- Ler/Modify: `apps/web/features/guest-profile/components/**`; `apps/web/features/guest/components/client/{event-notice,no-session,offline-banner,scan-page,rescue-scanner,host-message-card}.tsx`; `apps/web/app/e/[slug]/confessional/**`; `apps/web/features/pairing/**` (guest side: `pair-page`, `app-open-cta`)
- Primitivos: `Card`, `EmptyState`, `Avatar`, `Button`, `ErrorMessage`, `GateNotice`, `.tipo-*`

**Direção:** perfil com header caloroso (avatar/iniciais, stats legíveis, grid sem corte). Estados de evento (`event-notice`) — não telas mortas: cada um (fechado/rascunho/encerrado/não-começou) com mensagem clara, calorosa e, quando cabível, uma saída (escanear de novo — nunca "tela sem saída", ver memória do produto). `no-session` guia ao scan. Offline-banner tranquilizador. Confessional list como prompts táteis. Pair (4 dígitos) claro. **Nenhuma tela de "escaneie" sem dar como escanear.**

**Acceptance:** perfil legível; todo estado de evento com mensagem clara e saída quando aplicável; scan sempre acessível onde pedido; contraste AA; sem regressão (`features/guest-profile`, `features/guest`, `features/pairing` verdes); sem hex/vidro.

- [ ] Método por tela. Suítes: `pnpm exec vitest run apps/web/features/guest-profile apps/web/features/guest apps/web/features/pairing`.
- [ ] Commit: `feat(guest): redesign profile + event-state screens + pairing`

---

### Task 14: Verificação da Onda 1 (fluxo do convidado completo)

Prova visual e funcional da superfície do convidado inteira. Não é código de produção novo.

**Files:** Nenhum de produção. Opcional: nota no spec §5.1 marcando Onda 1 concluída.

- [ ] **Build de produção** (`cd apps/web && pnpm exec next build && pnpm exec next start -p 3100`) — o dev server tem bug de webpack HMR no browser embutido.
- [ ] **Percorrer `/telas`** (showcase de todos os ~18 estados do convidado) desktop + mobile (375px). Confirmar: hierarquia resolvida, foto dominando onde deve, movimento com física, estados vazios guiando, nav com indicador, nenhum vidro. Screenshots antes/depois representativos.
- [ ] **Percorrer o fluxo real** num evento semeado se possível (`/e/<slug>` → entrada → câmera → confirmação → feed → álbum → missões), ou os estados no `/telas`.
- [ ] **A11y:** `read_console_messages` (sem erros), contraste amostral no escuro, navegação por teclado na entrada, reduced-motion.
- [ ] **Suíte inteira + guards:** `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web && node tools/guards/tokens.mjs && node tools/guards/isolamento.mjs && node tools/guards/dominio.mjs && node tools/guards/packs.mjs`. Verde; sem hex/vidro; isolamento intacto.
- [ ] Commit (se houve nota no spec): `docs(redesign): mark Onda 1 (convidado) complete`

---

## Self-Review (feito na escrita)

- **Cobertura do spec §5.1 (convidado):** entrada→T1, cover→T2, home→T3, câmera→T4, editor→T5, confirmação→T6, feed→T7, interações→T8, álbum→T9, missões→T10, minhas-fotos→T11, música→T12, perfil+estados+pairing→T13, verificação→T14. Todas as ~13 telas do inventário do convidado têm task nomeada; câmera/editor/confirmação separados (tela pesada dividida); feed dividido em lista (T7) e interações (T8); estados/chrome agrupados com perfil (T13) por serem menores.
- **Decomposição inteligente (regra do spec):** telas pesadas divididas (photo → T4/T5/T6; feed → T7/T8); telas pequenas agrupadas (perfil + estados + pairing → T13); nenhuma tela fica sem task.
- **Placeholders:** direção concreta por tela (o quê domina, hierarquia, movimento, primitivos, estados), não CSS linha-a-linha — correto para trabalho visual iterativo onde o implementer lê o arquivo real e renderiza antes de mudar. Verificação e a11y concretas por task.
- **Tipos/consistência:** consome os primitivos e classes da Onda 0 (`.tipo-*`, `.elev-*`, mola/saída, Button/Card/Sheet/campos/nav/EmptyState) — já entregues e aprovados.
- **Escopo:** Onda 1 é entregável sozinha (superfície do convidado inteira, sem regressão). Ondas 2 (admin) e 3 (telão+landing) são planos separados.
