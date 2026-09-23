# Onda 1A — Início por fase (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o anfitrião abrir o painel e entender, em segundos, em que fase está o evento e qual é a próxima coisa a fazer.

**Architecture:** Hoje `/admin/e/[id]` empilha quatro seções fixas — resumo ao vivo, controles, promo de pré-evento e equipe — iguais na véspera, na festa e três meses depois. A fase já existe no domínio desde a Onda 0A (`faseDoEvento`). Esta onda usa essa fase para decidir **o que a tela mostra**, e introduz uma segunda função pura que responde "o que falta": `proximosPassos`, derivada de dado que já existe no banco. Nada de campo novo, nada de migration, nada de número inventado.

**Tech Stack:** TypeScript, React 19, Next.js App Router, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§4), commit `8868ba42`.

## Global Constraints

- **Nada de métrica, prazo ou recurso inventado.** Todo passo sugerido sai de sinal que o banco já tem. Se não dá para derivar, não aparece.
- Verbo específico em vez de rótulo genérico: "Escolher a capa", "Baixar o QR code". Nunca "Gerenciar".
- Sem emoji na interface.
- Nenhum hex hardcodado; nenhuma string de domínio em componente — o vocabulário de casamento vive no pack.
- Todo estado vazio tem texto próprio e um caminho de saída.
- `import React from "react"` em arquivo de `apps/web` com JSX.
- Botão sai do `Button` ou do `buttonClasses`; leitura sai do `useAdminResource`; placeholder sai do `Skeleton`. As ondas 0B deixaram isso pronto e nada aqui pode reintroduzir a dívida.
- Por padrão, **nenhum comentário**.
- Commits em Conventional Commits com escopo. Nunca fazer merge sem pedido explícito.

## Escopo: o que esta onda entrega e o que fica para as irmãs

**Entrega:** a função pura que decide os próximos passos, o Início dividido nos quatro estados da spec §4, e a contagem de missões que faltava para o passo de missões ser honesto.

**Não entrega:**
- **Checklist persistido** (spec §6.3, migration 0059). Hoje vive em `localStorage` e morre na troca de celular. Vai na 1B, porque envolve tabela, RLS e rota — e porque a maior parte do que o checklist cobre é derivável e já entra aqui sem tabela nenhuma.
- **Onboarding dispensável de primeira visita.** Vai na 1C, com a copy escrita junto.
- **Retrospectiva e retenção visível** na fase Depois. Dependem de leitura nova de `retention_jobs` escopada ao evento (spec §6.5) e de decisão de curadoria (§6.6). A fase Depois entra aqui com o que já existe: balanço, curadoria e guardar.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/features/admin/lib/proximos-passos.ts` *(criar)* | Decide o que falta, e em que ordem. Sem React. |
| `apps/web/features/admin/lib/proximos-passos.test.ts` *(criar)* | Testes da priorização e dos limites. |
| `apps/web/features/admin/data/load-event-page.ts` *(modificar)* | Passa a contar as missões do evento. |
| `apps/web/features/admin/components/server/inicio-do-evento.tsx` *(criar)* | Decide qual estado renderizar a partir da fase. |
| `apps/web/features/admin/components/client/contagem-regressiva.tsx` *(criar)* | Contagem para a fase Antes. |
| `apps/web/features/admin/components/client/contagem-regressiva.test.tsx` *(criar)* | Testes da contagem. |
| `apps/web/app/admin/e/[eventId]/page.tsx` *(modificar)* | Delega ao Início. |

---

### Task 1: O que falta, e em que ordem

**Files:**
- Create: `apps/web/features/admin/lib/proximos-passos.ts`
- Test: `apps/web/features/admin/lib/proximos-passos.test.ts`

**Interfaces:**
- Consumes: `FaseDoEvento` de `@albora/core` (Onda 0A).
- Produces: `proximosPassos(sinais: SinaisDoEvento, base: string): Passo[]`, com `Passo = { id: PassoId; rotulo: string; porque: string; href: string }` e `SinaisDoEvento = { fase, temCapa, temIdentidade, missoes, convidadosEsperados, gateDefinido }`. A Task 3 consome.

Regras que os testes fixam:

1. **No máximo três.** Mais que isso deixa de ser prioridade e vira lista de tarefas.
2. **Ordem fixa por impacto na participação**, que é a H1 do produto: missões antes de capa, capa antes de identidade, identidade antes de convidados esperados, e o gate por último — porque o gate tem padrão sensato e os outros não.
3. **Nada aparece se já está feito.**
4. **Na fase Durante e Depois não há próximos passos de preparo** — preparar evento que já começou é conselho inútil.

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/features/admin/lib/proximos-passos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { proximosPassos, type SinaisDoEvento } from "./proximos-passos";

const base = "/admin/e/abc";

const tudoFeito: SinaisDoEvento = {
  fase: "antes",
  temCapa: true,
  temIdentidade: true,
  missoes: 8,
  convidadosEsperados: 80,
  gateDefinido: true,
};

const nadaFeito: SinaisDoEvento = {
  fase: "antes",
  temCapa: false,
  temIdentidade: false,
  missoes: 0,
  convidadosEsperados: 0,
  gateDefinido: false,
};

describe("próximos passos", () => {
  it("com tudo pronto, não sobra passo nenhum", () => {
    expect(proximosPassos(tudoFeito, base)).toEqual([]);
  });

  it("no máximo três, para continuar sendo prioridade", () => {
    expect(proximosPassos(nadaFeito, base)).toHaveLength(3);
  });

  it("missões vêm antes de tudo: é o que move participação", () => {
    expect(proximosPassos(nadaFeito, base)[0]?.id).toBe("missoes");
  });

  it("a ordem é fixa e por impacto", () => {
    expect(proximosPassos(nadaFeito, base).map((p) => p.id)).toEqual([
      "missoes",
      "capa",
      "identidade",
    ]);
  });

  it("o que já está feito não é cobrado", () => {
    const comMissoes = { ...nadaFeito, missoes: 8 };

    expect(proximosPassos(comMissoes, base).map((p) => p.id)).toEqual([
      "capa",
      "identidade",
      "convidados",
    ]);
  });

  it("o gate entra por último, porque tem padrão sensato", () => {
    const soGate = { ...tudoFeito, gateDefinido: false };

    expect(proximosPassos(soGate, base).map((p) => p.id)).toEqual(["gate"]);
  });

  it("evento em rascunho também prepara", () => {
    expect(proximosPassos({ ...nadaFeito, fase: "rascunho" }, base).length).toBeGreaterThan(0);
  });

  it("depois que a festa começou, preparar não é conselho útil", () => {
    expect(proximosPassos({ ...nadaFeito, fase: "durante" }, base)).toEqual([]);
    expect(proximosPassos({ ...nadaFeito, fase: "depois" }, base)).toEqual([]);
  });

  it("cada passo leva direto à tela que resolve, e diz o porquê", () => {
    for (const passo of proximosPassos(nadaFeito, base)) {
      expect(passo.href.startsWith(base)).toBe(true);
      expect(passo.rotulo.length).toBeGreaterThan(0);
      expect(passo.porque.length).toBeGreaterThan(0);
    }
  });

  it("o rótulo é verbo específico, nunca 'Gerenciar'", () => {
    for (const passo of proximosPassos(nadaFeito, base)) {
      expect(passo.rotulo).not.toMatch(/Gerenciar/i);
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run apps/web/features/admin/lib/proximos-passos.test.ts
```

Esperado: FAIL, não resolve `./proximos-passos`.

- [ ] **Step 3: Implementar**

Crie `apps/web/features/admin/lib/proximos-passos.ts`:

```ts
import type { FaseDoEvento } from "@albora/core";

export type PassoId = "missoes" | "capa" | "identidade" | "convidados" | "gate";

export type Passo = {
  id: PassoId;
  rotulo: string;
  porque: string;
  href: string;
};

export type SinaisDoEvento = {
  fase: FaseDoEvento;
  temCapa: boolean;
  temIdentidade: boolean;
  missoes: number;
  convidadosEsperados: number;
  gateDefinido: boolean;
};

const MAXIMO = 3;

/** Ordem por impacto na participação, que é a hipótese que decide o produto. O gate fica por último: é o único com padrão sensato sem o casal tocar. */
const ORDEM: readonly {
  id: PassoId;
  rotulo: string;
  porque: string;
  suffix: string;
  pendente: (s: SinaisDoEvento) => boolean;
}[] = [
  {
    id: "missoes",
    rotulo: "Escolher as missões",
    porque: "É o que faz o convidado tirar a segunda foto, não só a primeira.",
    suffix: "/missions",
    pendente: (s) => s.missoes === 0,
  },
  {
    id: "capa",
    rotulo: "Escolher a capa",
    porque: "É a primeira coisa que o convidado vê ao escanear.",
    suffix: "/identity",
    pendente: (s) => !s.temCapa,
  },
  {
    id: "identidade",
    rotulo: "Definir a cor do evento",
    porque: "Deixa as fotos com a cara da festa, no telão e no álbum.",
    suffix: "/identity",
    pendente: (s) => !s.temIdentidade,
  },
  {
    id: "convidados",
    rotulo: "Informar quantos convidados",
    porque: "Sem isso não dá para saber se a participação está boa.",
    suffix: "/guests",
    pendente: (s) => s.convidadosEsperados === 0,
  },
  {
    id: "gate",
    rotulo: "Decidir quando abrir a interação",
    porque: "O padrão é abrir depois da cerimônia. Você escolhe a hora.",
    suffix: "/consent",
    pendente: (s) => !s.gateDefinido,
  },
];

export function proximosPassos(sinais: SinaisDoEvento, base: string): Passo[] {
  if (sinais.fase !== "rascunho" && sinais.fase !== "antes") return [];

  return ORDEM.filter((p) => p.pendente(sinais))
    .slice(0, MAXIMO)
    .map(({ id, rotulo, porque, suffix }) => ({
      id,
      rotulo,
      porque,
      href: `${base}${suffix}`,
    }));
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run apps/web/features/admin/lib/proximos-passos.test.ts
```

Esperado: PASS, 10 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/admin/lib/proximos-passos.ts apps/web/features/admin/lib/proximos-passos.test.ts
git commit -m "feat(admin): próximos passos derivados do que o evento já tem"
```

---

### Task 2: A contagem de missões

Sem ela o passo "Escolher as missões" seria chute. `listarDesafios` já existe em `@albora/db`.

**Files:**
- Modify: `apps/web/features/admin/data/load-event-page.ts`

**Interfaces:**
- Produces: `AdminEventPageContext` ganha `missoes: number`.

- [ ] **Step 1: Contar**

Em `apps/web/features/admin/data/load-event-page.ts`, some `listarDesafios` ao import de `@albora/db`, acrescente o campo ao tipo:

```ts
  /** Quantas missões o evento tem hoje — alimenta os próximos passos. */
  missoes: number;
```

e, depois de carregar o evento:

```ts
  const desafios = await listarDesafios(pool, eventoId);
```

somando `missoes: desafios.length` ao objeto de retorno.

Confira a assinatura real de `listarDesafios` antes de chamar — se ela pedir um cliente com evento setado em vez de pool, use `withEvent` como as outras leituras escopadas fazem.

- [ ] **Step 2: Conferir**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/features/admin/data/load-event-page.ts
git commit -m "feat(admin): contexto da página do evento traz a contagem de missões"
```

---

### Task 3: A contagem regressiva

**Files:**
- Create: `apps/web/features/admin/components/client/contagem-regressiva.tsx`
- Test: `apps/web/features/admin/components/client/contagem-regressiva.test.tsx`

**Interfaces:**
- Produces: `<ContagemRegressiva paraISO={string} />`.

Regras que os testes fixam: mostra dias quando falta mais de um dia; horas e minutos no último dia; texto próprio quando já começou, em vez de número negativo; respeita `prefers-reduced-motion` não animando; e é anunciada por leitor de tela sem tagarelar — `aria-live="off"`, porque uma contagem que fala a cada segundo é tortura.

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/features/admin/components/client/contagem-regressiva.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContagemRegressiva } from "./contagem-regressiva";

const agora = new Date("2026-06-01T12:00:00Z");

afterEach(() => {
  vi.useRealTimers();
});

function em(iso: string) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(agora);
  render(<ContagemRegressiva paraISO={iso} />);
}

describe("ContagemRegressiva", () => {
  it("faltando mais de um dia, conta em dias", () => {
    em("2026-06-11T12:00:00Z");

    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText(/dias/i)).toBeInTheDocument();
  });

  it("no último dia, conta em horas", () => {
    em("2026-06-01T20:00:00Z");

    expect(screen.getByText(/8/)).toBeInTheDocument();
    expect(screen.getByText(/horas/i)).toBeInTheDocument();
  });

  it("já começou: diz isso, não mostra número negativo", () => {
    em("2026-06-01T11:00:00Z");

    expect(screen.queryByText(/-/)).not.toBeInTheDocument();
    expect(screen.getByText(/começou/i)).toBeInTheDocument();
  });

  it("não tagarela em leitor de tela", () => {
    em("2026-06-11T12:00:00Z");

    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run apps/web/features/admin/components/client/contagem-regressiva.test.tsx
```

- [ ] **Step 3: Implementar**

Crie o componente com `"use client"`, `import React, { useEffect, useState } from "react"`, um intervalo de 60 s (não de 1 s: a tela conta dias e horas, e um timer por segundo só gasta bateria), `role="timer"` e `aria-live="off"`. O número usa `tipo-display` e a unidade `tipo-caption text-ink-3`; quando já começou, o texto é "A festa começou" sem número.

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run apps/web/features/admin/components/client/contagem-regressiva.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/admin/components/client/contagem-regressiva.tsx apps/web/features/admin/components/client/contagem-regressiva.test.tsx
git commit -m "feat(admin): contagem regressiva do evento"
```

---

### Task 4: O Início muda de forma

**Files:**
- Create: `apps/web/features/admin/components/server/inicio-do-evento.tsx`
- Modify: `apps/web/app/admin/e/[eventId]/page.tsx`

**Interfaces:**
- Consumes: `faseDoEvento` de `@albora/core`, `proximosPassos` (Task 1), `missoes` do contexto (Task 2), `ContagemRegressiva` (Task 3), e os componentes que já existem: `LiveSummary`, `EventControls`, `EventTeamPanel`.

O que cada fase mostra:

- **Rascunho** — boas-vindas com o que o Álbora faz em três linhas; os próximos passos; e **Publicar evento** como única ação primária, com confirmação que diz a consequência: a partir daí o QR funciona e qualquer convidado com o link entra. Sem número, sem gráfico: não há o que medir.
- **Antes** — hero com nome, data por extenso e a contagem regressiva; os próximos passos; o acesso ao QR e ao link; e os controles, recolhidos abaixo. Sem `LiveSummary`: não há nada ao vivo.
- **Durante** — `LiveSummary` no topo, controles logo abaixo, equipe por último. É o que a tela é hoje, menos a promo de pré-evento, que não faz sentido durante a festa.
- **Depois** — balanço a partir do `LiveSummary`, caminho para o álbum e para guardar, e os controles reduzidos ao que ainda importa.

- [ ] **Step 1: Implementar o roteador de fase**

`InicioDoEvento` recebe o `AdminEventPageContext`, chama `faseDoEvento(ctx.evento, new Date())` e devolve a composição de cada fase. Os sinais de `proximosPassos` saem de: `temCapa` = `Boolean(evento.coverImageKey)`; `temIdentidade` = `Object.keys(evento.identityTokens).length > 0`; `missoes` = `ctx.missoes`; `convidadosEsperados` = `evento.expectedGuests`; `gateDefinido` = `evento.interacaoAbreEm !== null`.

- [ ] **Step 2: A página delega**

`apps/web/app/admin/e/[eventId]/page.tsx` passa a renderizar `<InicioDoEvento ctx={ctx} />` dentro do `EventPageLayout`, no lugar da pilha fixa de quatro seções.

- [ ] **Step 3: Conferir**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm guards
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/admin/components/server/inicio-do-evento.tsx "apps/web/app/admin/e/[eventId]/page.tsx"
git commit -m "feat(admin): Início muda de forma conforme a fase do evento"
```

---

## Pronto quando

- Um evento em rascunho mostra preparação e um só botão, não um painel ao vivo zerado.
- Um evento na véspera mostra a contagem e no máximo três passos, cada um com verbo específico e um porquê.
- Um evento em festa mostra o ao vivo primeiro.
- Um evento encerrado não cobra preparo nem oferece controle de festa.
- Nenhum passo sugerido vem de dado que o sistema não tem.
- A suíte inteira continua verde.
