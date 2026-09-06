# Landing Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refazer a landing do Albora em código, seção por seção, no visual do mock aprovado, removendo todo o código morto da landing antiga.

**Architecture:** Server Components por padrão sob `apps/web/app/landing/sections/`, um client component só para a seção de scroll (`perspectivas.tsx`). Copy vem dos packs; cores/tempo/raio via tokens Tailwind; imagens de `public/landing/gen/` por `next/image`. `landing-page.tsx` compõe na ordem final e injeta o sticky CTA.

**Tech Stack:** Next.js 15 (App Router) · React 19 · Tailwind v4 (tokens semânticos) · `@albora/tokens` · `@albora/packs` · Playwright (e2e). Node 22 + pnpm 10 (`corepack pnpm --filter @albora/web ...`).

**Spec:** `docs/superpowers/specs/2026-09-06-landing-rebuild-implementation.md` (e o design em `2026-09-06-landing-redesign-design.md`). Referência visual: mock aprovado (artifact) + fonte local do mock final.

## Global Constraints

- **Server Component por padrão.** `"use client"` só em `perspectivas.tsx` (e nos utilitários client já existentes: `landing-cta-link`, `landing-sticky-cta`, `landing-beacon`, `landing-demo-link`, `animated-brand`).
- **Zero hex hardcodado em componente.** Só classes-token Tailwind (`text-ink`, `text-ink-2`, `text-ink-3`, `text-acento-texto`, `bg-bg`, `bg-superficie`, `bg-superficie-alta`, `border-linha`, `border-ink-borda-forte`) ou `var(--…)`. Guard de tokens é bloqueante.
- **Zero string de domínio em componente** (`casamento`, `noivos`, `noiva`): resolve via pack. Guard de domínio é bloqueante.
- **Filete, não caixa** · elevação por cor, não sombra · sem anti-padrões (glass, neon, roxo, script, coração/aliança/pombinha).
- **Imagens:** `next/image`; `priority` só no hero; `loading="lazy"` no resto; `alt` descritivo; `sizes` por slot. Nenhuma foto de convidado real (as de `gen/` são IA — ok).
- **Primitivos:** `import { Section, Heading, Accent, Label, Frame, pillClasses, lightPillClasses } from "../pieces"`. CTA: `<LandingCtaLink href={HREF_CRIAR_GRATIS} packHint={pack.id} className={pillClasses}>`.
- **Verificação por task:** `corepack pnpm --filter @albora/web run typecheck` verde + render no dev (`http://localhost:3001`) sem erro de console + check visual. Commit ao fim.
- **Toolchain:** `export PATH="/Users/clevesson-mendonca/.nvm/versions/node/v22.21.1/bin:$PATH"` antes de pnpm.

---

## File Structure

- `sections/hero.tsx` — ✅ feito (server).
- `sections/prova.tsx` — depoimento + selos (server).
- `sections/como-funciona.tsx` — 3 passos (server).
- `sections/perspectivas.tsx` — **client**, scroll scrubbed.
- `sections/telao.tsx` — faixa escura + foto 16:9 (server).
- `sections/durante-a-festa.tsx` — colagem + copy (server).
- `sections/depois.tsx` — strip álbum + livro (server).
- `sections/objecoes.tsx` — accordion `<details>` (server).
- `sections/preco.tsx` — 3 planos (server).
- `sections/faq.tsx` — accordion curto (server).
- `sections/fecho.tsx` — faixa escura + assinatura + CTA (server).
- `sections/index.ts` — barrel só com os 11.
- `landing-page.tsx` — composição na ordem final + sticky.
- `landing-data.ts` — HREFs/layout; limpar exports mortos (Task de remoção).
- `packages/packs/src/{casamento,quinze-anos,pre-casamento}.ts` + `tipos.ts` — copy + `LANDING_VOCABULARY_KEYS`.

Ordem no `landing-page.tsx`: Hero → Prova → ComoFunciona → Perspectivas → Telao → DuranteAFesta → Depois → Objecoes → Preco → Faq → Fecho → `<LandingStickyCta>`.

Imagens (de `public/landing/gen/`, referência por `/landing/gen/NN-nome.png`):
`01-hero-festa` (noite dança) · `02-perspectivas-casamento` · `03-telao-festa` (telão em contexto, tem a marca) · `04-convidada-usando-albora` · `05-album-livro-produto` · `06-casal-revendo-album` · `07-pista-de-danca` · `08-telao-com-casal` · `09-amigos-na-mesa` · `10-dia-jardim` (hero).

---

### Task 1: Prova

**Files:** Create `apps/web/app/landing/sections/prova.tsx` · Modify `sections/index.ts`, `landing-page.tsx`

**Interfaces:**
- Produces: `export function ProvaSection({ t }: { t: (k: string) => string })`
- Consumes: `Section`, `Label` de `../pieces`.

- [ ] **Step 1: Componente** — `<Section reveal>` com grid 2 col (`lg:grid-cols-[1.35fr_1fr]`, `gap`, `items-center`), fundo `bg-superficie` via className na Section (ou wrapper). Coluna A: `<blockquote>` com `tipo-display font-light` clamp ~ `clamp(1.5rem,3vw,2.375rem)`, aspas curvas, uma cláusula em `<Accent>`; `<cite>` `text-ink-3 text-sm` "— depoimento ilustrativo" (copy real vem do pack quando existir; por ora literal genérico **sem** termo de domínio — usar `t("landing.prova.citacao")`/`t("landing.prova.autor")`, adicionar chaves no Task 12). Coluna B: 4 selos `flex flex-col gap-3`, cada `<div>` com `<span className="text-acento-texto font-bold">✓</span>` + texto `text-ink-2`: "Sem app e sem cadastro pro convidado", "Fotos em resolução original, e o álbum é seu", "Localização e dados do aparelho apagados antes de subir", "Feito no Brasil".
- [ ] **Step 2: Barrel + compose** — `export { ProvaSection } from "./prova";`; em `landing-page.tsx` inserir `<ProvaSection t={t} />` após `<HeroSection>`.
- [ ] **Step 3: Typecheck** — `corepack pnpm --filter @albora/web run typecheck` → PASS.
- [ ] **Step 4: Dev render** — recarregar `http://localhost:3001`, conferir prova renderiza, sem erro de console (ignorar o 500 de analytics — degrada).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(landing): seção Prova"`

### Task 2: Como funciona

**Files:** Create `sections/como-funciona.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `export function ComoFuncionaSection()` (copy fixa, sem domínio → sem `t`).

- [ ] **Step 1: Componente** — `<Section id="como" reveal>`: `<Label>Como funciona</Label>` + `<Heading size="clamp(1.75rem,3.6vw,2.5rem)">Três toques até a primeira foto. <Accent>Zero instalação.</Accent></Heading>`. Abaixo, grid 3 (`grid-cols-3` desktop, `1fr` mobile) com filete entre passos (`border-l border-linha`, primeiro sem borda). Cada passo: `<div className="tipo-display text-acento-texto">01</div>`, `<h3 className="tipo-display font-normal">O QR na mesa</h3>`, `<p className="text-ink-2">…</p>`. Textos: 01 "O QR na mesa / Cada mesa tem um código. O convidado aponta a câmera e já está dentro — nada pra instalar, nada pra logar." · 02 "A foto, na hora / Ele fotografa, a foto sobe. Aparece no telão e no feed enquanto a festa ainda acontece." · 03 "O álbum, no dia seguinte / Tudo organizado por momento. Seu, pra sempre — e vira livro impresso, se você quiser."
- [ ] **Step 2: Barrel + compose** — inserir `<ComoFuncionaSection />` após Prova.
- [ ] **Step 3: Typecheck** → PASS.
- [ ] **Step 4: Dev render** — 3 passos, filete entre eles, responsivo (empilha no mobile).
- [ ] **Step 5: Commit** — `feat(landing): seção Como funciona`

### Task 3: Telão

**Files:** Create `sections/telao.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `export function TelaoSection({ pack }: { pack: Pack })` (usa dark tokens como o hero antigo fazia).

- [ ] **Step 1: Componente** — `<section id="telao">` fundo escuro: aplicar `style={toVariables(resolveTokens({marca:ALBORA_BRAND,pack:{...pack.tokens,background:"dark"}}))}` num wrapper e classes `bg-bg text-ink` (que no dark viram noite/papel). Dentro do `WIDTH`+padding: `<Label>` (âmbar claro), `<Heading>` "A festa inteira na parede — <Accent>sem cortar nenhum rosto.</Accent>", `<p className="text-ink-2 max-w-[46ch]">` "Três de cada quatro fotos de festa são verticais. Onze enquadramentos que cabem a foto em pé sem decepar cabeça. Nenhum concorrente mostra isto — porque nenhum faz." Depois um bloco `relative aspect-video overflow-hidden border border-ink-borda` com `<Image src="/landing/gen/03-telao-festa.png" alt="Telão do Albora exibindo uma foto ao vivo num salão de festa" fill sizes="(max-width:760px) 92vw, 1100px" className="object-cover"/>`. Caption `text-ink-3 text-sm` "O telão ao vivo no salão · 11 modelos de enquadramento, foto em pé sem corte".
- [ ] **Step 2: Barrel + compose** — inserir `<TelaoSection pack={pack} />` após Perspectivas (Task 10) — por ora colocar após ComoFunciona; reordenar quando Perspectivas existir.
- [ ] **Step 3: Typecheck** → PASS.
- [ ] **Step 4: Dev render** — faixa escura, foto do telão nítida, contraste ok (âmbar só em acento).
- [ ] **Step 5: Commit** — `feat(landing): seção Telão`

### Task 4: Durante a festa

**Files:** Create `sections/durante-a-festa.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `export function DuranteAFestaSection()`.

- [ ] **Step 1: Componente** — `<Section reveal>` grid 2 col. Texto: `<Label>Durante a festa</Label>` + `<Heading>Sua festa continua <Accent>acontecendo no Albora.</Accent></Heading>` + `<p className="text-ink-2 max-w-[34ch]">O feed enche em tempo real, as missões dão o que fotografar, as reações aparecem na hora e cada convidado sai com a própria galeria. Não é uma lista de recursos — é a festa, viva, na palma da mão.</p>`. Colagem: grid 2 col, `grid-auto-rows` ~120px, 5 `Frame`-like com `next/image` (`07,09,04,01,06`), dois com `row-span-2`. Cada foto num `relative overflow-hidden border border-linha` com `<Image fill className="object-cover" loading="lazy" sizes="…">` + `alt`.
- [ ] **Step 2: Barrel + compose** — inserir após Telão.
- [ ] **Step 3: Typecheck** → PASS.
- [ ] **Step 4: Dev render** — colagem sem buracos, fotos cobrindo, responsivo (1 col mobile).
- [ ] **Step 5: Commit** — `feat(landing): seção Durante a festa`

### Task 5: Depois

**Files:** Create `sections/depois.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `export function DepoisSection()`.

- [ ] **Step 1: Componente** — `<Section reveal>` grid 2 col (foto à esquerda, texto à direita). Strip: grid 6 col de mini-frames verticais (`aspect-[9/16]`) com `next/image` (`05,06,02,08,09,07`). Texto: `<Label>Depois</Label>` + `<Heading>No dia seguinte, <Accent>já está tudo organizado.</Accent></Heading>` + `<p className="text-ink-2 max-w-[34ch]">As fotos entram por momento, em resolução original. Seu, pra sempre — e vira um livro impresso, se você quiser guardar na estante.</p>`.
- [ ] **Step 2: Barrel + compose** — inserir após Durante.
- [ ] **Step 3: Typecheck** → PASS.
- [ ] **Step 4: Dev render** — strip alinhado, texto legível.
- [ ] **Step 5: Commit** — `feat(landing): seção Depois`

### Task 6: Objeções

**Files:** Create `sections/objecoes.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `export function ObjecoesSection()`. Reusa a lista de perguntas — mover `QUESTIONS` de `landing-data.ts` (existe) OU definir array local `OBJ` tipado.

- [ ] **Step 1: Componente** — `<Section reveal>`: `<Label>A objeção de todo mundo</Label>` + `<p className="tipo-display font-light">Seus convidados <Accent>não baixam nada.</Accent></p>`. Accordion nativo: mapear array `{q,a}` para `<details>` (`border-b border-linha`, `summary` flex com `<span className="text-acento-texto">+</span>` girando 45° em `[open]`, `p` `text-ink-2`). Itens: idade ("Meus convidados mais velhos vão conseguir?"), LGPD, internet ruim, moderação/telão, posse — textos do mock/`QUESTIONS`.
- [ ] **Step 2: Barrel + compose** — inserir após Depois.
- [ ] **Step 3: Typecheck** → PASS.
- [ ] **Step 4: Dev render** — abrir/fechar `<details>` (teclado + clique), sinal +/× vira.
- [ ] **Step 5: Commit** — `feat(landing): seção Objeções`

### Task 7: Preço

**Files:** Create `sections/preco.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `export function PrecoSection({ pack }: { pack: Pack })` (CTAs usam `pack.id` no `packHint`; nome do plano completo via `t("landing.plano.completo")` se mantido, senão literal "Celebração").

- [ ] **Step 1: Componente** — `<Section id="preco" reveal>` fundo `bg-superficie`: `<Label>Preço</Label>` + `<Heading>Comece grátis. <Accent>Pague uma vez, só se quiser tudo.</Accent></Heading>`. Grid 3 planos (`1fr` mobile). Card: `border border-ink-borda-forte rounded-token p-…`, o do meio com destaque (`ring`/`border` mais forte via `border-ink`). Grátis (R$ 0), Celebração ("pague uma vez / por evento", CTA primário → `HREF_CRIAR_COMPLETO`), Livro ("opcional"). Listas com `—` em `text-acento-texto`. **Sem número inventado.**
- [ ] **Step 2: Barrel + compose** — inserir após Objeções.
- [ ] **Step 3: Typecheck** → PASS.
- [ ] **Step 4: Dev render** — 3 cards, destaque do meio, CTAs corretos (hover no href).
- [ ] **Step 5: Commit** — `feat(landing): seção Preço`

### Task 8: FAQ + Fecho

**Files:** Create `sections/faq.tsx`, `sections/fecho.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `FaqSection()` e `FechoSection({ pack })`.

- [ ] **Step 1: FAQ** — `<Section reveal>` grid `.8fr 1.2fr`: título "O que ainda trava a decisão." + accordion `<details>` (3 itens: tempo de montar, precisa de telão, serve pra 15 anos/aniversário/corporativo).
- [ ] **Step 2: Fecho** — `<section>` dark (mesmo padrão do Telão), centralizado: `<Heading>Todos os momentos. Um só lugar.</Heading>` + `<p className="sig">Tiradas por quem viveu. Guardadas pra sempre.</p>` (Fraunces itálico âmbar-claro) + `<LandingCtaLink className={lightPillClasses}>Criar meu evento</LandingCtaLink>` + rodapé fino "Feito no Brasil · O convidado nunca digita senha, nunca recebe e-mail".
- [ ] **Step 3: Barrel + compose** — inserir FAQ e Fecho no fim (antes do sticky).
- [ ] **Step 4: Typecheck** → PASS.
- [ ] **Step 5: Dev render + Commit** — `feat(landing): seções FAQ e Fecho`

### Task 9: Perspectivas (client)

**Files:** Create `sections/perspectivas.tsx` · Modify `index.ts`, `landing-page.tsx`

**Interfaces:** Produces `export function PerspectivasSection()` — `"use client"`.

- [ ] **Step 1: Estrutura** — trilho `relative h-[460vh] max-[760px]:h-[320vh]` + pin `sticky top-0 h-screen overflow-hidden`. Dentro: `<div>` palco (tiles injetadas), moldura do telão (`absolute` 16:9, `opacity:0` inicial), 4 captions (`absolute` centradas) com scrim de papel (radial) e `text-shadow` de papel pra legibilidade. Fallback `prefers-reduced-motion`: bloco estático (grid de fotos + os 3 textos), escondendo o trilho.
- [ ] **Step 2: Lógica** — `useEffect`: montar N tiles (14 desktop / 6 mobile), coreografia tipada (cenas com breakpoints nomeados), `progress` por `getBoundingClientRect` em `requestAnimationFrame` só enquanto há scroll recente; aplicar `transform`/`opacity`; hero-tile converge pro slot do telão. `cleanup`: `removeEventListener('scroll')` + `cancelAnimationFrame`. Imagens de `gen/` por `object-cover`. Portar do mock final (já validado) — sem HUD.
- [ ] **Step 3: Reduced-motion** — checar `matchMedia('(prefers-reduced-motion: reduce)')`: se true, não anexar scroll/rAF; renderizar o fallback estático.
- [ ] **Step 4: Compose + reorder** — inserir `<PerspectivasSection />` entre ComoFunciona e Telao (ordem final).
- [ ] **Step 5: Typecheck** → PASS.
- [ ] **Step 6: Dev verify** — scroll lento e rápido (reversível, sem estado quebrado), converge no telão; mobile (viewport 375) com menos tiles; ligar reduced-motion → composição estática; conferir ~60fps (sem travar). Sem erro de console.
- [ ] **Step 7: Commit** — `feat(landing): seção Perspectivas (scroll)`

### Task 10: Copy nas packs + vocabulário

**Files:** Modify `packages/packs/src/{casamento,quinze-anos,pre-casamento}.ts`, `packages/packs/src/tipos.ts`

**Interfaces:** Consumes as chaves que as seções acima usam (`t("landing.…")`).

- [ ] **Step 1: Chaves novas** — adicionar em `LANDING_VOCABULARY_KEYS` só o que as seções novas consomem (ex.: `landing.prova.citacao`, `landing.prova.autor` se usados). Preencher nas 3 packs (casamento já tem hero atualizado; replicar tom pro `quinze-anos` e `pre-casamento`).
- [ ] **Step 2: Typecheck + guard** — `corepack pnpm --filter @albora/web run typecheck` + `pnpm guards` (ou o script de guard do repo) → PASS; `landingProblems` não acusa chave faltando.
- [ ] **Step 3: Dev render `/` e `/15-anos`** — as duas rotas com a copy do respectivo pack.
- [ ] **Step 4: Commit** — `feat(packs): copy da landing nova nas 3 packs`

### Task 11: Remoção do código morto

**Files:** Delete seções antigas + suporte órfão; Modify `interactives.tsx`, `landing-data.ts`, packs + `tipos.ts`, `public/landing/`

- [ ] **Step 1: Grep-verify** — para cada candidato, `grep -rn "NomeDoSimbolo\|nome-do-arquivo" apps packages` e confirmar que só a landing antiga usava. Candidatos: `no-app, scroll-demo, experience, moments, missions-section, album-chapters, identity, book, included, photo-corridor, chores-eliminated, antes-da-festa, veteran` (sections), `first-photo-demo, landing-veteran-cta, hero-stage` (suporte), exports mortos de `landing-data` (`STEPS/NUMBERS/SURFACES/FACTS/QUESTIONS` — manter os que Task 2/6 usarem), símbolos órfãos de `interactives.tsx` (`IdentityWall/ScrollDemo/…`; manter `Reveal` se as seções novas usarem `reveal`), chaves de vocabulário órfãs + suas entradas em `LANDING_VOCABULARY_KEYS`, `public/landing/hero.webp` se não referenciado.
- [ ] **Step 2: Deletar** — remover arquivos/símbolos confirmados; atualizar `sections/index.ts` pra só os 11.
- [ ] **Step 3: Typecheck + lint + guards** → PASS (nada quebrado por import morto).
- [ ] **Step 4: Dev render** — `/` e `/15-anos` intactas; `grep` de resíduo limpo.
- [ ] **Step 5: Commit** — `refactor(landing): remove seções e suporte da landing antiga`

### Task 12: Gates finais

**Files:** e2e specs em `apps/web/e2e/specs/`

- [ ] **Step 1: Atualizar e2e** — ajustar seletores que apontavam pras seções removidas; asserções: CTA "Criar meu evento" navega/beacon pra `/admin/new?plano=free`, âncora `#telao` existe, seção de perspectivas presente.
- [ ] **Step 2: Rodar** — `corepack pnpm --filter @albora/web run typecheck && ... lint`; e2e local (chromium) `corepack pnpm --filter @albora/web test:e2e` (smoke) → PASS.
- [ ] **Step 3: Build** — `corepack pnpm --filter @albora/web build` → PASS; conferir budget de bundle não regrediu.
- [ ] **Step 4: Screenshots** — desktop + mobile (375) da landing inteira pra aprovação.
- [ ] **Step 5: Commit + push** — `git push origin feat/landing-redesign`; abrir/atualizar MR pra `stable` (sem merge sem pedido).

---

## Self-Review

- **Cobertura do spec:** cada seção (§1) → uma task (1–9); reutilização (§2) → Global Constraints; novos componentes (§3) → tasks 1–9; remoção (§4) → task 11; perspectivas (§5) → task 9; copy/packs (§6) → task 10; imagens (§7) → Global + cada task; qualidade (§8) → Global + task 12; sequência (§9) → ordem das tasks; aceite (§10) → task 12. Hero (§1.1) já feito (fora do plano, commit `6874bc57`).
- **Placeholders:** cada task traz copy real, imagem específica e estrutura/classes concretas; a verificação é typecheck+render (UI apresentacional), com e2e/comportamento nas tasks 9 e 12.
- **Consistência de tipos:** seções server recebem `t`/`pack` conforme precisam de copy/dark-tokens; nomes de export (`XSection`) consistentes com o barrel e o `landing-page.tsx`.
