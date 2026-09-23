# Onda 0B-1 — Botão único (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Matar o segundo sistema de botão do produto, de modo que mudar o botão do Álbora seja mudar um arquivo.

**Architecture:** O painel tem dois sistemas de botão: o `Button` do design system e o mapa `adminClasses` de strings Tailwind cruas em `admin-shell.tsx:87-99`, usado por **26 arquivos** — incluindo o console `/ops` e o portal do fornecedor, não só o painel do anfitrião. O obstáculo que criou o segundo sistema é real: `Button` é sempre `<button>` e não aceita `asChild`, e a maioria dos usos de `primaryButton` está em `<Link>` do Next. A saída não é um componente novo, é expor o `cva` que o `Button` já usa por dentro: `<Link className={buttonClasses({ variant: "primary" })}>` passa a render­izar exatamente as mesmas classes que `<Button variant="primary">`, por construção.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Tailwind v4, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§8), commit `8868ba42`.

## Global Constraints

- Nenhum hex hardcodado; cor sai de classe semântica de token.
- Nenhuma string de domínio em componente.
- `import React from "react"` só em arquivo de `apps/web` com JSX.
- Alvo de toque mínimo 44px — o `size="sm"` do `Button` já dá `min-h-11`; os `*Sm` do `adminClasses` **não davam** (`py-[0.45rem]`). Migrar corrige isso.
- Por padrão, **nenhum comentário**.
- Commits em Conventional Commits com escopo.
- Nunca fazer merge sem pedido explícito.

## O mapeamento não é 1:1, e isso é o ponto

| Chave de `adminClasses` | Usos | Vira | Muda alguma coisa? |
|---|---|---|---|
| `primaryButton` | 21 | `variant="primary" size="md"` | Ganha `shadow-suave` do design system |
| `primaryButtonSm` | 9 | `variant="primary" size="sm"` | Ganha altura mínima de 44px |
| `secondaryButton` | 16 | `variant="secondary"` | **Perde `bg-superficie-alta`**: o secundário do design system é transparente com contorno |
| `dangerButtonSm` | 8 | `variant="danger" size="sm"` | Precisa de variante nova — o design system não tem destrutivo |
| `dangerButton` | **0** | — | Código morto. Some sem substituto |
| `listLink` | 2 | — | Não é botão: é linha de lista. Vira export próprio, `listLinkClasses` |

A perda de `bg-superficie-alta` no secundário é mudança visível e **desejada**: o botão do produto passa a ser um só, e quem manda é o design system. Se depois ficar fraco demais sobre fundo claro, conserta-se no `Button`, uma vez, para o produto inteiro — que é exatamente o ganho desta onda.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `packages/ui-web/src/button.tsx` *(modificar)* | Variante `danger`; exporta o `cva` como `buttonClasses`. |
| `packages/ui-web/src/button.test.tsx` *(modificar)* | Cobre a variante nova e a igualdade entre componente e classes. |
| `packages/ui-web/src/index.ts` *(modificar)* | Exporta `buttonClasses`. |
| `apps/web/features/admin/components/server/admin-shell.tsx` *(modificar)* | `adminClasses` morre; sobra `listLinkClasses`. |
| 25 arquivos consumidores *(modificar)* | Passam a usar `Button` ou `buttonClasses`. |

---

### Task 1: O design system ganha o que faltava

**Files:**
- Modify: `packages/ui-web/src/button.tsx:7-27` (cva), `:29-42` (props e export)
- Test: `packages/ui-web/src/button.test.tsx`
- Modify: `packages/ui-web/src/index.ts`

**Interfaces:**
- Produces: `buttonClasses({ variant?, size?, width?, className? }): string` e a variante `danger` em `Button`. As tasks 2 e 3 consomem.

- [ ] **Step 1: Escrever o teste que falha**

Em `packages/ui-web/src/button.test.tsx`, acrescente ao import `buttonClasses` e some ao `describe("Button", ...)`:

```tsx
  it("destrutivo se anuncia como destrutivo, não como acento", () => {
    render(<Button variant="danger">Encerrar evento</Button>);
    const btn = screen.getByRole("button", { name: "Encerrar evento" });

    expect(btn.className).toMatch(/bg-critico\b/);
    expect(btn.className).toMatch(/text-sobre-acento\b/);
    expect(btn.className).not.toMatch(/bg-acento\b/);
  });
```

E um `describe` novo, que é o que impede os dois caminhos de divergirem com o tempo:

```tsx
describe("buttonClasses", () => {
  it("dá ao link exatamente as classes que o botão renderiza", () => {
    render(<Button variant="primary" size="sm">x</Button>);

    expect(screen.getByRole("button").className).toBe(
      buttonClasses({ variant: "primary", size: "sm" }),
    );
  });

  it("vale para toda variante e todo tamanho", () => {
    const variantes = ["primary", "secondary", "tertiary", "danger"] as const;
    const tamanhos = ["sm", "md", "lg"] as const;

    for (const variant of variantes) {
      for (const size of tamanhos) {
        const { unmount } = render(
          <Button variant={variant} size={size}>
            x
          </Button>,
        );
        expect(screen.getByRole("button").className).toBe(buttonClasses({ variant, size }));
        unmount();
      }
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run packages/ui-web/src/button.test.tsx
```

Esperado: FAIL — `buttonClasses` não existe e `danger` não é variante válida.

- [ ] **Step 3: Implementar**

Em `packages/ui-web/src/button.tsx`, acrescente a variante ao `cva`, logo depois de `primary`:

```ts
      danger: "bg-critico text-sobre-acento shadow-suave hover:opacity-90",
```

Troque a declaração do `cva` e o tipo de props, e exporte as classes:

```ts
export const buttonClasses = cva({
```

(ou seja: `const buttonVariants` passa a se chamar `buttonClasses` e ganha `export`; ajuste o uso dentro de `Button`.)

```ts
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  width?: "auto" | "full";
  children: ReactNode;
};
```

Em `packages/ui-web/src/index.ts`, troque a linha do botão por:

```ts
export { Button, buttonClasses } from "./button";
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run packages/ui-web/src/button.test.tsx
pnpm typecheck
```

Esperado: PASS e typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-web/src/button.tsx packages/ui-web/src/button.test.tsx packages/ui-web/src/index.ts
git commit -m "feat(ds): botão ganha variante destrutiva e expõe as classes para links"
```

---

### Task 2: A varredura dos consumidores

Receita por caso, sem exceção:

- `<button className={adminClasses.primaryButton}>` → `<Button variant="primary">`
- `<button className={adminClasses.primaryButtonSm}>` → `<Button variant="primary" size="sm">`
- `<button className={adminClasses.secondaryButton}>` → `<Button variant="secondary">`
- `<button className={adminClasses.dangerButtonSm}>` → `<Button variant="danger" size="sm">`
- `<Link className={adminClasses.X}>` ou `<a className={adminClasses.X}>` → mantém a tag, troca a classe por `buttonClasses({ variant, size })`
- Classe extra concatenada (`${adminClasses.primaryButtonSm} mt-3.5 inline-flex`) → vira `className` dentro do `buttonClasses({ ..., className: "mt-3.5" })`, ou a prop `className` do `Button`

**Files:** os 25 consumidores listados abaixo, todos perdendo o import de `adminClasses`.

Em `apps/web/features/admin/components/client/`: `copiar-link-evento`, `comment-moderation`, `event-pieces`, `review-queue`, `guestbook-audio-field`, `host-drive-export`, `qr-code-print`, `host-album`, `support-help-button`, `guestbook-editor`, `event-controls`, `host-export`, `guest-display-names`, `event-team-panel`, `event-music`, `pre-event-promo`, `pre-event-checklist`, `guest-funnel`, `create-event-wizard`, `missions-editor`.

Fora do painel do anfitrião: `apps/web/app/admin/page.tsx`, `apps/web/app/admin/vendor/insights/page.tsx`, `apps/web/app/ops/page.tsx`, `apps/web/app/ops/events/page.tsx`, `apps/web/app/ops/e/[slug]/page.tsx`, `apps/web/features/vendor-portal/components/client/vendor-subscribe-button.tsx`.

- [ ] **Step 1: Migrar, arquivo a arquivo**

Para cada arquivo: trocar os usos pela receita, remover o import de `adminClasses`, somar o import de `Button` e/ou `buttonClasses` de `@albora/ui-web`.

`qr-code-print.tsx` e `create-event-wizard.tsx` **têm teste próprio** — rode o teste do arquivo depois de mexer nele:

```bash
pnpm vitest run apps/web/features/admin/components/client/qr-code-print.test.tsx
pnpm vitest run apps/web/features/admin/components/client/create-event-wizard.test.tsx
```

Se um teste quebrar porque consultava por classe, conserte o teste para consultar por papel e nome acessível — que é o padrão do repositório —, não devolva a classe antiga.

- [ ] **Step 2: Matar o mapa**

Em `apps/web/features/admin/components/server/admin-shell.tsx`, apague o `export const adminClasses` inteiro e ponha no lugar só o que não é botão:

```ts
export const listLinkClasses =
  "block border-b border-linha py-4 text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-acento-texto";
```

Ajuste os dois consumidores de `listLink` para o nome novo.

- [ ] **Step 3: Provar que morreu**

```bash
grep -rn "adminClasses" apps/web
```

Esperado: nenhuma ocorrência, nem definição nem uso.

- [ ] **Step 4: Conferir**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm guards
```

- [ ] **Step 5: Commit**

```bash
git add -A apps/web
git commit -m "refactor(admin): um sistema de botão só, do design system"
```

---

## Pronto quando

- `grep -rn "adminClasses" apps/web` não retorna nada.
- Todo botão e todo link com cara de botão do admin, do `/ops` e do portal do fornecedor sai do `Button` ou do `buttonClasses`.
- Existe teste que falha se o componente e as classes de link divergirem.
- Botões pequenos passam a ter 44px de alvo de toque, que os `*Sm` do mapa antigo não davam.
- A suíte inteira continua verde.

## Resultado da execução

`grep -rn "adminClasses" apps/web packages --include="*.tsx" --include="*.ts"` não retorna nada. 28 arquivos passam a usar `Button` ou `buttonClasses`. Suíte: 2737 testes verdes, lint limpo, typecheck limpo, 8 guards.

Um achado que não estava no plano e entrou junto: cinco arquivos carregavam um `ALVO_TOQUE = "min-h-11 px-5"` local, com comentário explicando que era override do `*Sm` compartilhado. Esse remendo **existia por causa** do mapa: os `*Sm` não davam 44px. Pior, depois da migração ele ficava conflitando com o `px-4` do `size="sm"` — duas classes de padding disputando na cascata. Saiu de `comment-moderation`, `event-pieces`, `host-album`, `review-queue` e `guestbook-audio-field`. Ficaram os de `event-music` e `missions-editor`, que se aplicam a botões que não são do design system (link de texto e botão de ícone) e continuam legítimos.

Server components: os agentes acertaram o tratamento. `Button` não tem `"use client"` e não usa hook, então renderiza em página server desde que não receba `onClick` — foi o caso do submit de `app/ops/events/page.tsx`, que virou `<Button type="submit">` sem tornar a página client. Todo `<Link>` usou `buttonClasses`, mantendo a tag.

Dívida residual conhecida: dois arquivos (`event-pieces`, `guestbook-audio-field`) têm botões que **já eram** Tailwind cru sem passar pelo mapa — "Baixar SVG" e "Cancelar". Não foram tocados porque estavam fora do alvo desta varredura, mas são o mesmo tipo de dívida e devem cair nas ondas de tela.

## O que esta onda não faz

Não mexe em `Dialog`, `BottomSheet` nem `Toast` — a spec §8 pede a adoção deles, mas isso é troca de padrão de interação (confirmação, feedback), não de aparência de botão, e cada caso precisa de decisão de conteúdo: o que a confirmação diz antes de uma ação destrutiva. Vai junto das ondas de tela, onde a copy é escrita.
