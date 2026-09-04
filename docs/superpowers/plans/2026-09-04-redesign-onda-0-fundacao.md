# Redesign Premium — Onda 0: Fundação e Primitivos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir a camada de linguagem de design (tipografia, movimento, elevação) e elevar os primitivos compartilhados `ui-web` ao padrão premium, propagando a todas as superfícies por construção (ADR 0003).

**Architecture:** Todas as superfícies de produção consomem o mesmo resolvedor de tokens e os mesmos primitivos `packages/ui-web`. Adicionamos tokens de tipografia/movimento/elevação à camada semântica (via `packages/tokens` + `apps/web/app/tailwind.css`) e refinamos os primitivos para consumi-los. Nenhum hex hardcodado; tudo deriva das 5 cores-base. Movimento novo respeita `prefers-reduced-motion`. Zero vidro/blur — profundidade por sombra quente e degrau de superfície.

**Tech Stack:** Next.js 15.5, React 19, Tailwind v4 (`@theme inline`), Vitest, TypeScript (`exactOptionalPropertyTypes: true`), pnpm monorepo (Node 22 — `source ~/.nvm/nvm.sh && nvm use 22`).

**Spec:** `docs/superpowers/specs/2026-09-04-redesign-premium-ui-ux-design.md`

## Global Constraints

- **Nenhum hex hardcodado em componente.** Toda cor sai de token semântico (`SemanticScale` / classes Tailwind `bg-acento`, `text-ink` etc.). Guard `tools/guards/tokens.mjs` é bloqueante.
- **Cinco cores-base, resto derivado.** Não adicionar cor à paleta. Neutros são opacidade/`color-mix` sobre papel/noite.
- **Anti-padrões bloqueantes:** glassmorphism/`backdrop-filter: blur`, neon, gradiente roxo, dark mode "tech", fonte script, verde sage, rosa blush, ícone de aliança/pombinha/coração.
- **Uma curva-base de movimento** (`--curva: cubic-bezier(0.2,0,0,1)`) permanece a raiz; variantes de mola são adicionais nomeadas, não substituição.
- **Todo movimento novo respeita `prefers-reduced-motion`** (kill-switch global já existe em `apps/web/app/base.css`).
- **Alvo de toque ≥ 44px** em todo controle interativo. Foco visível (`:focus-visible` já definido em `tailwind.css`). WCAG 2.1 AA.
- **Fraunces é a display face** (`--fonte-titulo`), auto-hospedada, nunca Google Fonts CDN. Delicadeza vem de peso baixo em tamanho grande — nunca Fraunces bold-pesado no display.
- **`exactOptionalPropertyTypes: true`**: `undefined` e ausência de propriedade são diferentes.
- **Componente é `client/` quando interativo** (convenção do repo), primitivos ficam em `packages/ui-web/src`.
- **Guards de isolamento e tokens rodam em todo commit.** Nenhuma mudança de lógica de dados/RLS/sessão nesta onda.
- **Testes de token** rodam com `vitest` normal; nenhum precisa de Postgres nesta onda.

---

### Task 1: Escala tipográfica nomeada

Estabelece papéis de tipo nomeados (display/title/subtitle/body/caption/label) como classes semânticas consumíveis por app e `ui-web`. Hoje só existem `--fonte-titulo`, `--fonte-corpo` e dois trackings; falta uma escala modular.

**Files:**
- Create: `apps/web/app/tipografia.css`
- Modify: `apps/web/app/layout.tsx` (importar `tipografia.css` junto de `tailwind.css`/`base.css`)
- Create: `packages/tokens/src/tipografia.ts` (fonte da verdade dos valores + para teste)
- Modify: `packages/tokens/src/index.ts` (exportar)
- Test: `packages/tokens/src/tipografia.test.ts`

**Interfaces:**
- Produces: `ESCALA_TIPOGRAFICA` (record de papel → `{ tamanho, peso, entrelinha, tracking, fonte }`), com papéis `display | title | subtitle | body | bodyLg | caption | label`. English alias `TYPE_SCALE`.
- Produces: classes CSS `.tipo-display`, `.tipo-title`, `.tipo-subtitle`, `.tipo-body`, `.tipo-body-lg`, `.tipo-caption`, `.tipo-label` (consumíveis em qualquer surface).

Valores (base 16px, Fraunces no display range, corpo no texto):

| Papel | tamanho | peso | entrelinha | tracking | fonte |
|---|---|---|---|---|---|
| display | `clamp(2.5rem, 6vw, 4rem)` | 400 | 1.05 | -0.02em | titulo |
| title | `clamp(1.75rem, 4vw, 2.5rem)` | 400 | 1.1 | -0.015em | titulo |
| subtitle | `1.25rem` | 500 | 1.25 | -0.01em | titulo |
| body-lg | `1.125rem` | 400 | 1.55 | 0 | corpo |
| body | `1rem` | 400 | 1.55 | 0 | corpo |
| caption | `0.875rem` | 400 | 1.45 | 0 | corpo |
| label | `0.75rem` | 500 | 1.2 | 0.05em | corpo |

- [ ] **Step 1: Escrever o teste que falha** — `packages/tokens/src/tipografia.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { ESCALA_TIPOGRAFICA, TYPE_SCALE } from "./tipografia";

describe("escala tipográfica", () => {
  it("cobre os sete papéis", () => {
    expect(Object.keys(ESCALA_TIPOGRAFICA).sort()).toEqual(
      ["body", "bodyLg", "caption", "display", "label", "subtitle", "title"].sort(),
    );
  });

  it("display usa a fonte de título com peso baixo (delicadeza em tamanho grande)", () => {
    expect(ESCALA_TIPOGRAFICA.display.fonte).toBe("titulo");
    expect(ESCALA_TIPOGRAFICA.display.peso).toBeLessThanOrEqual(400);
  });

  it("label abre o tracking; display fecha", () => {
    expect(ESCALA_TIPOGRAFICA.label.tracking).toBe("0.05em");
    expect(ESCALA_TIPOGRAFICA.display.tracking).toBe("-0.02em");
  });

  it("body sai da fonte de corpo", () => {
    expect(ESCALA_TIPOGRAFICA.body.fonte).toBe("corpo");
  });

  it("TYPE_SCALE é alias de ESCALA_TIPOGRAFICA", () => {
    expect(TYPE_SCALE).toBe(ESCALA_TIPOGRAFICA);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/tokens exec vitest run src/tipografia.test.ts`
Expected: FAIL — módulo `./tipografia` não existe.

- [ ] **Step 3: Implementar `packages/tokens/src/tipografia.ts`**

```ts
export type PapelDeTipo =
  | "display" | "title" | "subtitle" | "bodyLg" | "body" | "caption" | "label";

export type EstiloDeTipo = {
  tamanho: string;
  peso: number;
  entrelinha: number;
  tracking: string;
  fonte: "titulo" | "corpo";
};

export const ESCALA_TIPOGRAFICA: Record<PapelDeTipo, EstiloDeTipo> = {
  display:  { tamanho: "clamp(2.5rem, 6vw, 4rem)",    peso: 400, entrelinha: 1.05, tracking: "-0.02em",  fonte: "titulo" },
  title:    { tamanho: "clamp(1.75rem, 4vw, 2.5rem)", peso: 400, entrelinha: 1.1,  tracking: "-0.015em", fonte: "titulo" },
  subtitle: { tamanho: "1.25rem",                     peso: 500, entrelinha: 1.25, tracking: "-0.01em",  fonte: "titulo" },
  bodyLg:   { tamanho: "1.125rem",                    peso: 400, entrelinha: 1.55, tracking: "0",        fonte: "corpo" },
  body:     { tamanho: "1rem",                        peso: 400, entrelinha: 1.55, tracking: "0",        fonte: "corpo" },
  caption:  { tamanho: "0.875rem",                    peso: 400, entrelinha: 1.45, tracking: "0",        fonte: "corpo" },
  label:    { tamanho: "0.75rem",                     peso: 500, entrelinha: 1.2,  tracking: "0.05em",   fonte: "corpo" },
};

/** English alias. */
export const TYPE_SCALE = ESCALA_TIPOGRAFICA;
```

Exportar em `packages/tokens/src/index.ts`: adicionar `export * from "./tipografia";`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @albora/tokens exec vitest run src/tipografia.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Criar `apps/web/app/tipografia.css`** — as classes semânticas, espelhando os valores acima, puxando fonte/tracking dos CSS vars existentes (`--fonte-titulo`, `--fonte-corpo`).

```css
@layer components {
  .tipo-display  { font-family: var(--fonte-titulo); font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 400; line-height: 1.05; letter-spacing: -0.02em; }
  .tipo-title    { font-family: var(--fonte-titulo); font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 400; line-height: 1.1; letter-spacing: -0.015em; }
  .tipo-subtitle { font-family: var(--fonte-titulo); font-size: 1.25rem; font-weight: 500; line-height: 1.25; letter-spacing: -0.01em; }
  .tipo-body-lg  { font-family: var(--fonte-corpo); font-size: 1.125rem; font-weight: 400; line-height: 1.55; }
  .tipo-body     { font-family: var(--fonte-corpo); font-size: 1rem; font-weight: 400; line-height: 1.55; }
  .tipo-caption  { font-family: var(--fonte-corpo); font-size: 0.875rem; font-weight: 400; line-height: 1.45; }
  .tipo-label    { font-family: var(--fonte-corpo); font-size: 0.75rem; font-weight: 500; line-height: 1.2; letter-spacing: 0.05em; }
  .tipo-balance  { text-wrap: balance; }
}
```

Importar em `apps/web/app/layout.tsx` logo após o import de `tailwind.css` (verificar a ordem real dos imports no arquivo; `tipografia.css` vem depois de `tailwind.css` para que `@layer components` resolva).

- [ ] **Step 6: Verificar build e guard de tokens**

Run: `pnpm --filter web exec next build --no-lint 2>&1 | tail -5` (ou `pnpm build` se mais rápido não existir) e `node tools/guards/tokens.mjs`
Expected: build ok; guard de tokens passa (nenhum hex novo em componente — os valores estão em CSS/token, não em JSX).

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/src/tipografia.ts packages/tokens/src/tipografia.test.ts packages/tokens/src/index.ts apps/web/app/tipografia.css apps/web/app/layout.tsx
git commit -m "feat(tokens): add named typographic scale (display→label)"
```

---

### Task 2: Sistema de movimento — molas e durações

Expande o vocabulário de movimento mantendo a curva-base como raiz. Hoje: `--curva`, `--rapido/medio/lento` vêm do pacote de tokens (`marca.ts` → CSS vars via `toVariables`). Adiciona curva de mola (interação), curva de saída (aceleração) e duração instantânea (micro-feedback).

**Files:**
- Modify: `packages/tokens/src/marca.ts` (adicionar `mola`, `saida`, `instantaneo` ao `movimento`)
- Modify: `packages/tokens/src/types.ts` (estender `Motion`)
- Modify: o mapeador `toVariables`/`event-theme.ts` que emite as CSS vars de movimento (localizar onde `--curva`/`--rapido` são gerados)
- Modify: `apps/web/app/tailwind.css` (expor `--ease-*` e helpers de transição)
- Test: `packages/tokens/src/event-theme.test.ts` (estender)

**Interfaces:**
- Consumes: `Motion` type de `types.ts`.
- Produces: `Motion` estendido com `mola: string`, `saida: string`, `instantaneo: string`. CSS vars `--mola`, `--saida`, `--instantaneo` disponíveis em runtime. Utilitários Tailwind `ease-mola`, `ease-saida` e `duration-instantaneo`.

Valores:
- `mola: "cubic-bezier(0.34, 1.56, 0.64, 1)"` (overshoot suave — press/entrada de sheet)
- `saida: "cubic-bezier(0.4, 0, 1, 1)"` (acelera — saída de overlay)
- `instantaneo: "0.15s"` (micro-feedback: hover, press-down)

- [ ] **Step 1: Ler o estado atual** dos arquivos que emitem CSS vars de movimento.

Run: `grep -rn "curva\|rapido\|movimento\|Motion" packages/tokens/src/types.ts packages/tokens/src/marca.ts packages/tokens/src/event-theme.ts`
Anotar exatamente onde `Motion` é definido e onde as vars `--curva`/`--rapido`/`--medio`/`--lento` são geradas (provavelmente um `toVariables` em `event-theme.ts` ou `outputs.ts`).

- [ ] **Step 2: Escrever o teste que falha** — estender `event-theme.test.ts` (ou o teste que cobre a emissão de vars). Asserção de que as novas vars saem no mapa de variáveis.

```ts
it("emite as vars de movimento estendidas", () => {
  const vars = toVariables(/* tokens resolvidos da marca — usar o mesmo helper do teste existente */);
  expect(vars["--mola"]).toBe("cubic-bezier(0.34, 1.56, 0.64, 1)");
  expect(vars["--saida"]).toBe("cubic-bezier(0.4, 0, 1, 1)");
  expect(vars["--instantaneo"]).toBe("0.15s");
});
```

(Ajustar o nome/import de `toVariables` ao que o arquivo realmente exporta; reusar o padrão de setup do teste existente no arquivo.)

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @albora/tokens exec vitest run src/event-theme.test.ts`
Expected: FAIL — vars indefinidas.

- [ ] **Step 4: Implementar**

Em `types.ts`, estender `Motion`:

```ts
export type Motion = {
  curva: string;
  /** Mola — overshoot suave para press e entrada de sheet. */
  mola: string;
  /** Saída — acelera para sumiço de overlay. */
  saida: string;
  instantaneo: string;
  rapido: string;
  medio: string;
  lento: string;
};
```

Em `marca.ts`, no `movimento`:

```ts
movimento: {
  curva: "cubic-bezier(0.2, 0, 0, 1)",
  mola: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  saida: "cubic-bezier(0.4, 0, 1, 1)",
  instantaneo: "0.15s",
  rapido: "0.3s",
  medio: "0.35s",
  lento: "0.5s",
},
```

No mapeador que emite as vars (o mesmo que já emite `--curva`), adicionar `--mola`, `--saida`, `--instantaneo` a partir de `movimento.mola/saida/instantaneo`.

Em `tailwind.css`, dentro de `@theme inline`, adicionar utilitários:

```css
  --ease-mola: var(--mola);
  --ease-saida: var(--saida);
  --transition-duration-instantaneo: var(--instantaneo);
```

- [ ] **Step 5: Rodar e ver passar** + suíte de tokens inteira (nenhuma regressão no `Motion` estendido).

Run: `pnpm --filter @albora/tokens exec vitest run`
Expected: PASS (todos os testes de tokens, incluindo `resolvedor`/`event-theme` que tocam `Motion`).

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/marca.ts packages/tokens/src/types.ts packages/tokens/src/event-theme.ts apps/web/app/tailwind.css
git commit -m "feat(tokens): add spring/exit motion curves and instant duration"
```

---

### Task 3: Hierarquia de elevação semântica

Formaliza `elev-0..elev-3` como classes semânticas nomeadas, mapeando os shadows/superfícies existentes. Dá vocabulário único de profundidade sem vidro. Sombras já existem (`--shadow-suave`, `--shadow-alta`); esta task só nomeia a hierarquia e adiciona o degrau modal com scrim quente.

**Files:**
- Modify: `apps/web/app/tailwind.css` (adicionar classes `.elev-1`, `.elev-2`, `.elev-3` num `@layer components` ao final do arquivo, e o scrim `--color-scrim-modal`)
- Test: nenhum teste unitário (é CSS puro); verificação por build + preview.

**Interfaces:**
- Produces: classes `.elev-0` (chão), `.elev-1` (card levantado), `.elev-2` (sheet flutuante), `.elev-3` (modal). E `--color-scrim-modal` (scrim quente, opacidade sólida — NÃO blur).

- [ ] **Step 1: Adicionar o scrim modal** em `@theme inline` (junto dos outros `color-mix`):

```css
  --color-scrim-modal: color-mix(in srgb, var(--noite) 55%, transparent);
```

- [ ] **Step 2: Adicionar as classes de elevação** ao final de `tailwind.css`:

```css
@layer components {
  .elev-0 { background: var(--bg); box-shadow: none; }
  .elev-1 { background: var(--superficie); box-shadow: var(--shadow-suave); }
  .elev-2 { background: var(--superficie-alta); box-shadow: var(--shadow-alta); }
  .elev-3 { background: var(--superficie-alta); box-shadow: var(--shadow-alta); }
}
```

(O scrim do `.elev-3` é aplicado pelo backdrop do overlay/dialog, não pela classe — a classe estiliza a superfície do modal; o backdrop usa `bg-[var(--color-scrim-modal)]` sem `backdrop-filter`.)

- [ ] **Step 3: Verificar build**

Run: `pnpm --filter web exec next build --no-lint 2>&1 | tail -5`
Expected: build ok, sem erro de CSS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/tailwind.css
git commit -m "feat(tokens): formalize elev-0..3 depth hierarchy (warm scrim, no glass)"
```

---

### Task 4: Botão premium

Refina o primitivo `Button`: hierarquia clara (primário âmbar preenchido / secundário contorno / terciário texto), feedback de mola no press, alvo de toque ≥44px, foco visível. Consome os tokens de movimento da Task 2.

**Files:**
- Modify: `packages/ui-web/src/button.tsx` (ler primeiro para conhecer a API `cva` atual)
- Modify: `packages/ui-web/src/button.test.tsx` (estender)

**Interfaces:**
- Consumes: `--mola`, `--instantaneo` (Task 2); classes semânticas `bg-acento`, `text-sobre-acento`, `border-linha`, `text-ink` etc.
- Produces: `Button` com props `variant?: "primary" | "secondary" | "tertiary"` (default `primary`), `size?: "sm" | "md" | "lg"` (default `md`), mantendo a API existente compatível (não quebrar callers — se hoje há outra prop de variante, preservar e mapear).

Requisitos concretos:
- Todo tamanho tem `min-height` ≥ 44px (`md` = 48px, `lg` = 56px, `sm` = 44px).
- Press: `active:scale-[0.97]` com `transition` na curva de mola e duração instantânea.
- `variant primary`: `bg-acento text-sobre-acento`. `secondary`: `border border-linha text-ink bg-transparent`. `tertiary`: `text-acento-texto bg-transparent`.
- `:focus-visible` herda o outline global; garantir que não é removido.
- Respeita `prefers-reduced-motion` (o kill-switch global já zera a transição; nenhuma animação JS nova).

- [ ] **Step 1: Ler `button.tsx` e `button.test.tsx`** para conhecer a API e o padrão `cva`/`variants.ts` atuais.

Run: `sed -n '1,120p' packages/ui-web/src/button.tsx`

- [ ] **Step 2: Escrever/estender o teste que falha** — asserções testáveis:

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

it("aplica alvo de toque mínimo por tamanho", () => {
  render(<Button size="md">Enviar</Button>);
  const btn = screen.getByRole("button", { name: "Enviar" });
  expect(btn.className).toMatch(/min-h-\[48px\]|min-h-12/);
});

it("primário usa preenchimento de acento com texto legível sobre acento", () => {
  render(<Button variant="primary">Ok</Button>);
  expect(screen.getByRole("button").className).toMatch(/bg-acento/);
  expect(screen.getByRole("button").className).toMatch(/text-sobre-acento/);
});

it("secundário é contorno, terciário é texto", () => {
  const { rerender } = render(<Button variant="secondary">a</Button>);
  expect(screen.getByRole("button").className).toMatch(/border/);
  rerender(<Button variant="tertiary">a</Button>);
  expect(screen.getByRole("button").className).toMatch(/text-acento-texto/);
});
```

(Adaptar os matchers às classes reais escolhidas; o ponto é travar hierarquia, alvo de toque e uso de token — não hex.)

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @albora/ui-web exec vitest run src/button.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implementar** o `cva` com as três variantes, três tamanhos com `min-h`, press de mola. Preservar props/variantes já usadas por callers (mapear as antigas para as novas se necessário; NÃO remover a variante default silenciosamente).

- [ ] **Step 5: Rodar e ver passar** + suíte inteira de `ui-web` (garantir que nenhum caller do Button quebrou nos testes de outros primitivos/screens).

Run: `pnpm --filter @albora/ui-web exec vitest run`
Expected: PASS.

- [ ] **Step 6: Verificação visual** — dev server, abrir `/telas` (renderiza botões em contexto), screenshot antes/depois; confirmar hierarquia e press. Verificar contraste do primário (texto sobre âmbar) — o token `sobre-acento` já é derivado por contraste.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-web/src/button.tsx packages/ui-web/src/button.test.tsx
git commit -m "feat(ui): premium Button — hierarchy, spring press, 44px targets"
```

---

### Task 5: Card, BottomSheet e Dialog — elevação e física

Faz `Card`, `BottomSheet` e `Dialog` consumirem a hierarquia de elevação (Task 3) e ganharem entrada com física (Task 2). Sheet ganha arrastar-para-fechar; Dialog ganha scrim quente (sem blur).

**Files:**
- Modify: `packages/ui-web/src/card.tsx`
- Modify: `packages/ui-web/src/bottom-sheet.tsx` (localizar arquivo real — pode ser `dialog.tsx`/`overlays`)
- Modify: `packages/ui-web/src/dialog.tsx`
- Modify/Create: testes colocalizados correspondentes

**Interfaces:**
- Consumes: `.elev-1/2/3`, `--color-scrim-modal`, `--mola`, `--saida`.
- Produces: `Card` com prop `elevation?: 0 | 1 | 2` (default 1). `BottomSheet`/`Dialog` inalterados na API pública; só o estilo interno muda (backdrop = `bg-[var(--color-scrim-modal)]`, entrada na curva de mola, saída na curva de saída).

Requisitos concretos:
- `Card` default = `.elev-1`; `elevation={2}` = `.elev-2`; `elevation={0}` = `.elev-0`.
- `Dialog`/`BottomSheet` backdrop: opacidade sólida `--color-scrim-modal`, **sem `backdrop-filter`** (verificar que nenhum `blur`/`backdrop` é introduzido — anti-padrão).
- `BottomSheet`: entrada `translateY(100%)→0` na curva de mola; arrastar-para-fechar (threshold ~30% da altura ou velocidade). Se já houver lógica de drag, refinar; se não, adicionar mínima com pointer events, respeitando reduced-motion (sem overshoot quando reduzido).
- Foco preso no dialog (focus trap) preservado se já existir; não remover acessibilidade.

- [ ] **Step 1: Ler os três arquivos** e seus testes para conhecer APIs e localizar o arquivo real do sheet.

Run: `ls packages/ui-web/src | grep -iE "card|sheet|dialog|overlay"` e `sed -n '1,80p'` em cada.

- [ ] **Step 2: Escrever/estender testes que falham** — asserções: `Card` aplica classe de elevação por prop; backdrop do Dialog usa o scrim token e **não** contém `backdrop-blur`/`backdrop-filter`.

```tsx
it("Card mapeia elevation para classe elev-*", () => {
  const { rerender } = render(<Card elevation={1}>x</Card>);
  expect(screen.getByText("x").closest("[class*='elev-']")?.className).toMatch(/elev-1/);
  rerender(<Card elevation={2}>x</Card>);
  expect(screen.getByText("x").closest("[class*='elev-']")?.className).toMatch(/elev-2/);
});

it("Dialog não usa vidro (backdrop-filter)", () => {
  render(<Dialog open>conteúdo</Dialog>);
  const html = document.body.innerHTML;
  expect(html).not.toMatch(/backdrop-blur|backdrop-filter/);
});
```

- [ ] **Step 3: Rodar e ver falhar.** Run: `pnpm --filter @albora/ui-web exec vitest run src/card.test.tsx` (e sheet/dialog).

- [ ] **Step 4: Implementar** as três mudanças. Preservar APIs públicas.

- [ ] **Step 5: Rodar e ver passar** + suíte inteira `ui-web`.

Run: `pnpm --filter @albora/ui-web exec vitest run`

- [ ] **Step 6: Verificação visual** — `/telas`, abrir um bottom-sheet (feed comment sheet, share consent) e um dialog; confirmar entrada com física, scrim quente, drag-to-dismiss; screenshot.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-web/src/card.tsx packages/ui-web/src/bottom-sheet.tsx packages/ui-web/src/dialog.tsx packages/ui-web/src/*.test.tsx
git commit -m "feat(ui): Card elevation + sheet/dialog physics with warm scrim (no glass)"
```

---

### Task 6: Campos de formulário premium

Eleva os primitivos de entrada (`TextField`, `NameField`, `Select`, `ConsentCheckbox`): alvos de toque maiores, foco claro, estados de erro com brasa. Crítico para o fluxo de entrada do convidado (nome + consentimento) e todo o admin.

**Files:**
- Modify: `packages/ui-web/src/` — os arquivos reais de `TextField`, `NameField`, `Select`, `ConsentCheckbox` (localizar; podem estar agrupados em um `forms.tsx` ou separados)
- Modify/Create: testes colocalizados

**Interfaces:**
- Consumes: tokens `bg-superficie`, `border-linha`, `text-ink`, `text-ink-3` (placeholder), `border-critico`/`text-critico` (erro), `--instantaneo`.
- Produces: cada campo com `min-height ≥ 48px`, `:focus-visible` claro (anel de acento), estado de erro (`aria-invalid` + borda/texto brasa), label associada (`htmlFor`/`aria-label`).

Requisitos concretos:
- `min-height: 48px` em input/select; checkbox alvo ≥ 24px com área clicável ≥ 44px.
- Foco: borda `acento` + anel; nunca remover outline sem substituir.
- Erro: `aria-invalid="true"`, borda e texto de ajuda em `critico`.
- Placeholder em `ink-3` (token, não hex).

- [ ] **Step 1: Localizar e ler** os arquivos de formulário.

Run: `grep -rln "TextField\|NameField\|ConsentCheckbox\|export function Select" packages/ui-web/src`

- [ ] **Step 2: Escrever/estender testes que falham** — asserções de acessibilidade e alvo:

```tsx
it("TextField expõe estado de erro acessível", () => {
  render(<TextField label="Email" error="inválido" value="" onChange={() => {}} />);
  const input = screen.getByLabelText("Email");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("inválido").className).toMatch(/critico/);
});

it("input tem alvo de toque ≥ 48px", () => {
  render(<TextField label="Nome" value="" onChange={() => {}} />);
  expect(screen.getByLabelText("Nome").className).toMatch(/min-h-\[48px\]|min-h-12/);
});
```

- [ ] **Step 3: Rodar e ver falhar.**

- [ ] **Step 4: Implementar** os quatro campos. Preservar APIs; adicionar prop `error?: string` onde não existir (opcional, `exactOptionalPropertyTypes` — não passar `undefined` explícito nos callers).

- [ ] **Step 5: Rodar e ver passar** + suíte `ui-web`.

- [ ] **Step 6: Verificação** — abrir `/e/<slug>` entry flow no dev server (ou `/telas` EntryScreen), testar teclado (tab, foco visível) e um estado de erro; screenshot.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-web/src/*field* packages/ui-web/src/*select* packages/ui-web/src/*consent* packages/ui-web/src/*.test.tsx
git commit -m "feat(ui): premium form fields — 48px targets, clear focus, accessible errors"
```

---

### Task 7: Navegação e estados vazios

Refina `TabBar`/`FloatingNav` (estados ativos, indicador com movimento suave) e `EmptyState` (quente, guiando, com ação — nunca tela branca triste).

**Files:**
- Modify: `packages/ui-web/src/tab-bar.tsx`
- Modify: `packages/ui-web/src/floating-nav.tsx`
- Modify: `packages/ui-web/src/` — `EmptyState` (localizar; exportado do `index.ts`)
- Modify/Create: testes colocalizados (`tab-bar.test.tsx`, `floating-nav.test.tsx` já existem)

**Interfaces:**
- Consumes: `--mola`, `--medio`, tokens `text-acento-texto` (ativo), `text-ink-3` (inativo), `bg-superficie`.
- Produces: `TabBar`/`FloatingNav` com indicador de aba ativa que transiciona (transform/opacity na curva média), `aria-current="page"` na aba ativa. `EmptyState` com props `titulo`, `descricao`, `acao?` (ReactNode) e ícone opcional; layout centrado, tipografia da escala (Task 1).

Requisitos concretos:
- Aba ativa: `aria-current="page"`, cor `acento-texto`; inativa `ink-3`.
- Indicador move suave (não salta) — transição na curva média; some sob reduced-motion.
- Alvos de aba ≥ 44px.
- `EmptyState` usa `.tipo-title`/`.tipo-body`, centrado, com espaço generoso e CTA quando `acao` presente.

- [ ] **Step 1: Ler** os três arquivos + testes existentes.

- [ ] **Step 2: Escrever/estender testes que falham:**

```tsx
it("TabBar marca a aba ativa com aria-current", () => {
  render(<TabBar tabs={SHARED_GUEST_TABS} active="feed" onSelect={() => {}} />);
  const ativo = screen.getByRole("tab", { current: "page" });
  expect(ativo).toBeInTheDocument();
});

it("EmptyState mostra ação quando fornecida", () => {
  render(<EmptyState titulo="Sem fotos" descricao="Seja o primeiro" acao={<button>Tirar foto</button>} />);
  expect(screen.getByText("Sem fotos")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tirar foto" })).toBeInTheDocument();
});
```

(Adaptar às props reais de `TabBar`/`EmptyState`; ler primeiro.)

- [ ] **Step 3: Rodar e ver falhar.**

- [ ] **Step 4: Implementar.** Preservar APIs; `EmptyState` — adicionar props que faltarem sem quebrar usos atuais.

- [ ] **Step 5: Rodar e ver passar** + suíte `ui-web` inteira.

- [ ] **Step 6: Verificação** — `/telas` (tab bar em contexto, empty states de feed/álbum); trocar de aba e ver o indicador; screenshot.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-web/src/tab-bar.tsx packages/ui-web/src/floating-nav.tsx packages/ui-web/src/*empty* packages/ui-web/src/*.test.tsx
git commit -m "feat(ui): refined nav active states + guiding empty states"
```

---

### Task 8: Verificação de fundação no catálogo

Valida a onda inteira renderizando `/telas` e `/telas-admin` (todos os estados de tela com tokens e componentes reais) e confirmando propagação sem regressão. Não é código novo — é a prova visual da fundação.

**Files:**
- Nenhum arquivo de produção. Opcional: nota curta em `docs/superpowers/specs/2026-09-04-redesign-premium-ui-ux-design.md` (seção 6) marcando Onda 0 concluída.

- [ ] **Step 1: Subir o dev server.** Run: `preview_start` name do dev server (ou `pnpm --filter web dev`).

- [ ] **Step 2: Abrir `/telas`** — percorrer os ~18 estados de tela do convidado. Confirmar: tipografia da escala nova, botões premium, sheets com física, campos com foco, nav com indicador. Screenshot desktop + mobile.

- [ ] **Step 3: Abrir `/telas-admin`** — idem para as telas de admin. Screenshot.

- [ ] **Step 4: Checar acessibilidade** — `read_console_messages` (sem erros), contraste nas superfícies escuras (o derivador já garante, mas conferir amostras), navegação por teclado no entry flow.

- [ ] **Step 5: Rodar a suíte de testes inteira + guards.**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run && node tools/guards/tokens.mjs && node tools/guards/isolamento.mjs`
Expected: verde; nenhum hex novo; isolamento intacto.

- [ ] **Step 6: Commit** (se houve nota no spec)

```bash
git add docs/superpowers/specs/2026-09-04-redesign-premium-ui-ux-design.md
git commit -m "docs(redesign): mark Onda 0 (foundation) complete"
```

---

## Self-Review (feito na escrita)

- **Cobertura do spec §4 (sistema evoluído):** §4.2 tipografia → T1; §4.3 movimento → T2; §4.4 elevação → T3; §4.5 primitivos → T4 (botão), T5 (card/sheet/dialog), T6 (forms), T7 (nav/empty). §4.1 ritmo de espaçamento → coberto pela escala 4px nativa do Tailwind v4 (documentada no spec; sem token novo necessário) + aplicada nos primitivos T4-T7. Verificação → T8.
- **Placeholders:** valores concretos em toda parte (tipo, movimento, elevação, alvos de toque). Onde o arquivo real precisa ser lido primeiro (T2 emissor de vars, T4-T7 APIs de primitivo), o Step 1 é "ler o arquivo" — não é placeholder, é a leitura necessária para editar com segurança sem quebrar callers.
- **Consistência de tipos:** `ESCALA_TIPOGRAFICA`/`TYPE_SCALE` (T1), `Motion` estendido com `mola/saida/instantaneo` (T2) usados consistentemente em T4-T7. Classes `.elev-1/2/3` (T3) consumidas em T5.
- **Escopo:** Onda 0 é uma unidade testável e entregável sozinha (fundação + primitivos). Ondas 1-3 (telas por superfície) são planos separados que herdam esta fundação.
