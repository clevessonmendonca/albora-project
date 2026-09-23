# Onda 1C — Primeira visita e ajuda (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Explicar o painel a quem chega, sem obrigar ninguém a ler nada.

**Architecture:** O anfitrião abre o painel e encontra palavras que o produto inventou: moderação, gate, telão, modo endurecido, retenção. Hoje não há nenhuma explicação em lugar nenhum. A saída não é um tour de modais — a spec §9 é explícita: "o anfitrião deve conseguir usar o painel mesmo que ignore o tutorial". Então: uma **fonte única** de definições, que alimenta ao mesmo tempo a ajuda reabrível e as explicações no contexto da ação; e uma introdução curta que sai com um toque e não volta.

**Tech Stack:** TypeScript, React 19, Next.js App Router, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§9), commit `8868ba42`.

## Global Constraints

- **Usável sem ler.** Nada nesta onda pode bloquear o caminho de ninguém: sem modal obrigatório, sem sequência de passos, sem overlay que precise ser fechado para trabalhar.
- Uma frase por termo, e a **mesma** frase na ajuda e no contexto. Duas redações do mesmo conceito viram duas verdades.
- Sem emoji. Sem exclamação em série. Sem promessa que o sistema não cumpre.
- Nenhum hex hardcodado; nenhuma string de domínio em componente.
- `import React from "react"` em arquivo de `apps/web` com JSX.
- `BottomSheet` e `Button` saem do design system. Leitura, se houver, pelo `useAdminResource`.
- Por padrão, **nenhum comentário**.
- Commits em Conventional Commits. Nunca fazer merge sem pedido explícito.

## Onde mora o "já dispensei", e por quê

Em `localStorage`, por aparelho. **Deliberado, e diferente da escolha da Onda 1B.**

O checklist saiu do `localStorage` porque é **trabalho compartilhado**: perder o que foi marcado perde trabalho de várias pessoas. Já a introdução dispensada é **preferência de quem está olhando** — reaparecer noutro aparelho custa um toque, não custa trabalho. Guardar isso no banco pediria coluna nova em `accounts`, migration e rota, para economizar um toque uma vez na vida.

A regra que separa os dois casos: se perder o dado perde trabalho, vai para o servidor; se perder o dado custa um toque, fica no aparelho. E como a ajuda é reabrível a qualquer momento, nada fica inacessível por causa dessa escolha.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/features/admin/lib/glossario.ts` *(criar)* | Fonte única das definições. Sem React. |
| `apps/web/features/admin/lib/glossario.test.ts` *(criar)* | Testes das invariantes do texto. |
| `apps/web/features/admin/components/client/ajuda-do-painel.tsx` *(criar)* | Botão de ajuda e a folha com o glossário. |
| `apps/web/features/admin/components/client/ajuda-do-painel.test.tsx` *(criar)* | Testes de abrir, fechar e foco. |
| `apps/web/features/admin/components/client/primeira-visita.tsx` *(criar)* | A introdução dispensável. |
| `apps/web/features/admin/components/client/primeira-visita.test.tsx` *(criar)* | Testes de dispensar e não voltar. |
| `apps/web/features/admin/components/server/admin-shell.tsx` *(modificar)* | Ajuda no cabeçalho. |
| `apps/web/features/admin/components/server/inicio-do-evento.tsx` *(modificar)* | Introdução no topo. |

---

### Task 1: As palavras que o produto inventou

**Files:**
- Create: `apps/web/features/admin/lib/glossario.ts`
- Test: `apps/web/features/admin/lib/glossario.test.ts`

**Interfaces:**
- Produces: `GLOSSARIO: readonly Termo[]` e `explicar(id: TermoId): string`, com `Termo = { id: TermoId; termo: string; frase: string }`.

Os sete termos da spec §9: moderação, consentimento, telão, missões, gate de interação, modo endurecido, retenção.

Regras que os testes fixam: são exatamente sete; nenhuma frase passa de 160 caracteres, porque explicação que não cabe num balão não explica; nenhuma frase usa o próprio termo para se definir ("moderação é moderar"); nenhuma contém emoji; e `explicar` devolve exatamente a mesma frase que está no glossário — é isso que garante uma redação só.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, expect, it } from "vitest";
import { explicar, GLOSSARIO } from "./glossario";

describe("glossário do painel", () => {
  it("cobre os sete termos que o produto inventou", () => {
    expect(GLOSSARIO.map((t) => t.id)).toEqual([
      "moderacao",
      "consentimento",
      "telao",
      "missoes",
      "gate",
      "modo-endurecido",
      "retencao",
    ]);
  });

  it("explicação que não cabe num balão não explica", () => {
    for (const t of GLOSSARIO) {
      expect(t.frase.length).toBeLessThanOrEqual(160);
      expect(t.frase.length).toBeGreaterThan(20);
    }
  });

  it("nenhum termo se define usando a própria palavra", () => {
    for (const t of GLOSSARIO) {
      const primeira = t.termo.split(" ")[0]?.toLowerCase() ?? "";
      expect(t.frase.toLowerCase()).not.toContain(primeira);
    }
  });

  it("sem emoji na interface", () => {
    for (const t of GLOSSARIO) {
      expect(t.frase).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(t.termo).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it("a ajuda e o contexto leem a mesma frase", () => {
    for (const t of GLOSSARIO) {
      expect(explicar(t.id)).toBe(t.frase);
    }
  });
});
```

- [ ] **Step 2 a 5: ver falhar, implementar, ver passar, commitar**

```bash
git commit -m "feat(admin): glossário único dos termos do painel"
```

---

### Task 2: A ajuda que reabre

**Files:**
- Create: `apps/web/features/admin/components/client/ajuda-do-painel.tsx`
- Test: `apps/web/features/admin/components/client/ajuda-do-painel.test.tsx`
- Modify: `apps/web/features/admin/components/server/admin-shell.tsx`

**Interfaces:**
- Consumes: `GLOSSARIO` (Task 1), `BottomSheet` e `Button` de `@albora/ui-web`.
- Produces: `<AjudaDoPainel />`.

Um botão discreto no cabeçalho, ao lado do sair. Abre `BottomSheet` com os sete termos. Fecha por `Esc`, por toque fora e pelo botão. O `BottomSheet` já resolve foco e arrasto — não reimplemente.

Regras que os testes fixam: o botão está sempre lá; a folha começa fechada; abrir mostra os sete termos; e o botão diz o que faz por nome acessível, não por ícone mudo.

- [ ] **Steps: TDD normal, depois montar no cabeçalho do `AdminShell` e commitar**

```bash
git commit -m "feat(admin): ajuda reabrível com os termos do painel"
```

---

### Task 3: A introdução que sai com um toque

**Files:**
- Create: `apps/web/features/admin/components/client/primeira-visita.tsx`
- Test: `apps/web/features/admin/components/client/primeira-visita.test.tsx`
- Modify: `apps/web/features/admin/components/server/inicio-do-evento.tsx`

**Interfaces:**
- Produces: `<PrimeiraVisita />`.

Um cartão no topo do Início, **não** um modal: quem ignorar continua trabalhando. Três linhas sobre como o Álbora funciona, um botão "Entendi" que dispensa, e um link para a ajuda. Dispensado, não volta neste aparelho.

Regras que os testes fixam: aparece quando nada foi dispensado; some ao dispensar; não volta depois de remontar; `localStorage` indisponível não quebra a tela — aparece e o dispensar só não persiste; e **não é modal**, isto é, não tem `role="dialog"` e não prende foco.

- [ ] **Steps: TDD normal, montar no topo do Início nas fases rascunho e antes, e commitar**

```bash
git commit -m "feat(admin): introdução dispensável na primeira visita"
```

---

## Fechamento

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm guards
```

## Pronto quando

- Existe uma frase, e só uma, para cada termo que o produto inventou.
- A ajuda abre de qualquer tela do evento e fecha sem deixar resíduo.
- A introdução aparece uma vez, sai com um toque e não volta.
- Quem nunca abriu a ajuda e dispensou a introdução no primeiro segundo consegue usar o painel inteiro.
- A suíte continua verde.
