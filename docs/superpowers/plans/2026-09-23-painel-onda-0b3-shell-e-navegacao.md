# Onda 0B-3 — Shell e navegação do painel (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar as onze pílulas planas por uma navegação de seis destinos que existe de verdade no desktop e no celular, sem mover nenhuma rota.

**Architecture:** Os seis destinos da spec não correspondem hoje a seis rotas — cada um vai **absorver** telas que ainda vivem separadas. Em vez de esperar as ondas 1 a 6 para só então ter navegação nova, os destinos viram uma **estrutura de dados** em que cada um declara a rota que abre hoje e as rotas que vai absorver depois. O item fica marcado em qualquer uma delas. Assim a navegação nova entra inteira agora, e as ondas seguintes fundem conteúdo sem tocar na navegação.

**Tech Stack:** TypeScript, Next.js App Router, React, Tailwind v4 (config-in-CSS), vitest + @testing-library/react, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§2, §3), commit `8868ba42`.

## Global Constraints

- Nenhum hex hardcodado. Cor, raio e espaçamento saem de token — no `apps/web` isso significa as classes semânticas (`bg-acento`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-linha`, `bg-superficie`, `bg-superficie-alta`, `rounded-superficie`, `rounded-pilula`, `elev-1`, `tipo-*`), definidas no `@theme inline` de `apps/web/app/tailwind.css`.
- Nenhuma string de domínio (`noiva`, `casamento`, `noivos`) em componente.
- Item ativo **nunca marcado só por cor** — falha em daltonismo. Sempre cor mais uma segunda pista (fundo, peso, barra).
- Alvo de toque mínimo 44×44 (`min-h-11`).
- Anti-padrões bloqueantes: glassmorphism, neon, gradiente roxo, dark mode "tech", fonte script, verde sage, rosa blush, ícone de aliança/pombinha/coração, card dentro de card, fileira de KPI de painel B2B, emoji na interface.
- `aria-current="page"` no destino ativo; `nav` com `aria-label` distinto por instância (há duas, desktop e celular).
- Por padrão, **nenhum comentário**. Só invariante invisível no código, workaround com link, supressão com motivo, ou contrato que nome e assinatura não carregam.
- Commits em Conventional Commits com escopo.
- Nunca fazer merge sem pedido explícito.

## Ambiente

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

Testes `.tsx` rodam no project `jsdom` do vitest, com `vitest.setup.ts` já configurado (`@testing-library/jest-dom/vitest` mais `cleanup()` no `afterEach`). `pnpm vitest run <arquivo>` basta — estes testes não precisam de banco.

**`import React from "react"` é obrigatório** em todo `.tsx` de `apps/web` que tenha JSX — tanto o componente quanto o teste. O `apps/web/tsconfig.json:9` usa `"jsx": "preserve"`, que o SWC do Next resolve com o runtime automático mas o esbuild do vitest compila no runtime clássico: sem o import, o teste morre com `ReferenceError: React is not defined`, primeiro apontando para o teste e depois para o componente. `packages/ui-web` não tem esse problema porque seu tsconfig usa `"jsx": "react-jsx"`. Os testes que já existem no admin (`qr-code-print.test.tsx`, `create-event-wizard.test.tsx`) seguem essa convenção.

## Fora de escopo, de propósito

- **Tema escuro no admin.** O painel hoje não tem nenhum (`grep` por `data-tema`/`prefers-color-scheme` em `apps/web/features/admin` e `apps/web/app/admin` dá zero). O mecanismo existe no lado convidado (`apps/web/features/guest/lib/theme-style.ts:27-40`, `estiloAntiFlash`) e dá para reusar, mas traz consigo uma superfície inteira de verificação de contraste. Vai em plano próprio, como a spec §14.3 já previa.
- **Fusão de conteúdo** das telas absorvidas. Aqui só a navegação muda; `/album` e `/moderation` continuam sendo duas páginas.
- **`adminClasses` e o hook de leitura.** São os planos 0B-1 e 0B-2. O shell novo vai conviver com `adminClasses` por enquanto; isso é dívida conhecida e datada, não descuido.

## Desvios conscientes da spec

**Tablet.** A spec §3 dá ao tablet (768–1023px) a barra lateral já recolhida. Este plano corta em `lg` (1024px): abaixo disso vale a tab bar. Uma lateral recolhida a 768px rouba 4,5rem de uma tela que já é estreita, e o anfitrião de tablet segura o aparelho como segura um celular grande. Se ficar ruim no uso, é trocar um breakpoint em dois componentes.

**Barra recolhida.** A spec §3 diz que o estado recolhido é "persistido por conta". Este plano persiste em `localStorage`, por aparelho. É conveniência de quem está olhando, não dado de produto: guardar no banco custaria migration, rota e um round-trip para decidir a largura de uma coluna. Se você quiser por conta depois, é uma linha de leitura a mais no `loadEventPage`.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/features/admin/lib/navegacao.ts` *(criar)* | Os seis destinos e a regra de qual está ativo. Sem React, sem DOM. |
| `apps/web/features/admin/lib/navegacao.test.ts` *(criar)* | Testes da regra de destino ativo. |
| `apps/web/features/admin/components/client/event-sidebar.tsx` *(criar)* | Barra lateral do desktop, recolhível. |
| `apps/web/features/admin/components/client/event-sidebar.test.tsx` *(criar)* | Testes da barra lateral. |
| `apps/web/features/admin/components/client/event-tab-bar.tsx` *(criar)* | Tab bar do celular, cinco itens mais "Mais". |
| `apps/web/features/admin/components/client/event-tab-bar.test.tsx` *(criar)* | Testes da tab bar. |
| `apps/web/features/admin/components/server/admin-shell.tsx` *(modificar)* | Ganha slot de navegação e o layout de duas colunas. |
| `apps/web/features/admin/components/server/event-page-layout.tsx` *(modificar)* | Passa as duas navegações ao shell. |
| `apps/web/features/admin/components/client/event-nav.tsx` *(remover)* | Substituído pelos dois acima. |
| `apps/web/package.json`, `pnpm-lock.yaml` *(modificar)* | `lucide-react`. |

---

### Task 1: Os seis destinos e a regra de ativo

**Files:**
- Create: `apps/web/features/admin/lib/navegacao.ts`
- Test: `apps/web/features/admin/lib/navegacao.test.ts`

**Interfaces:**
- Produces: `DESTINOS: readonly Destino[]`, `destinoAtivo(pathname: string, base: string): DestinoId | null`, e os tipos `Destino`, `DestinoId`. As tasks 2 e 3 consomem os três.

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/features/admin/lib/navegacao.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DESTINOS, destinoAtivo } from "./navegacao";

const base = "/admin/e/abc";

describe("destinos do evento", () => {
  it("são seis, na ordem da jornada", () => {
    expect(DESTINOS.map((d) => d.id)).toEqual([
      "inicio",
      "fotos",
      "convidados",
      "experiencia",
      "compartilhar",
      "ajustes",
    ]);
  });

  it("nenhum destino declara a mesma rota que outro", () => {
    const rotas = DESTINOS.flatMap((d) => [d.suffix, ...d.absorve]);

    expect(new Set(rotas).size).toBe(rotas.length);
  });
});

describe("destino ativo", () => {
  it("a raiz do evento é o Início", () => {
    expect(destinoAtivo(base, base)).toBe("inicio");
    expect(destinoAtivo(`${base}/`, base)).toBe("inicio");
  });

  it("rota absorvida marca o destino que vai absorvê-la", () => {
    expect(destinoAtivo(`${base}/pre-event`, base)).toBe("inicio");
    expect(destinoAtivo(`${base}/moderation`, base)).toBe("fotos");
    expect(destinoAtivo(`${base}/insights`, base)).toBe("convidados");
    expect(destinoAtivo(`${base}/missions`, base)).toBe("experiencia");
    expect(destinoAtivo(`${base}/guestbook`, base)).toBe("experiencia");
  });

  it("rota própria marca o próprio destino", () => {
    expect(destinoAtivo(`${base}/album`, base)).toBe("fotos");
    expect(destinoAtivo(`${base}/guests`, base)).toBe("convidados");
    expect(destinoAtivo(`${base}/identity`, base)).toBe("experiencia");
    expect(destinoAtivo(`${base}/qrcode`, base)).toBe("compartilhar");
    expect(destinoAtivo(`${base}/consent`, base)).toBe("ajustes");
  });

  it("sub-rota mais funda continua marcando o destino", () => {
    expect(destinoAtivo(`${base}/album/123`, base)).toBe("fotos");
  });

  it("rota desconhecida não marca nada, em vez de marcar o Início por engano", () => {
    expect(destinoAtivo(`${base}/relatorio-secreto`, base)).toBeNull();
  });

  it("evento vizinho de prefixo parecido não marca nada", () => {
    expect(destinoAtivo("/admin/e/abcdef/album", base)).toBeNull();
  });

  it("fora do evento não marca nada", () => {
    expect(destinoAtivo("/admin", base)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run apps/web/features/admin/lib/navegacao.test.ts
```

Esperado: FAIL, não resolve `./navegacao`.

- [ ] **Step 3: Implementar**

Crie `apps/web/features/admin/lib/navegacao.ts`:

```ts
export type DestinoId =
  | "inicio"
  | "fotos"
  | "convidados"
  | "experiencia"
  | "compartilhar"
  | "ajustes";

export type Destino = {
  id: DestinoId;
  rotulo: string;
  /** A rota que o destino abre hoje. */
  suffix: string;
  /** Rotas que este destino vai absorver nas ondas seguintes; até lá, mantêm o item marcado. */
  absorve: readonly string[];
};

export const DESTINOS: readonly Destino[] = [
  { id: "inicio", rotulo: "Início", suffix: "", absorve: ["/pre-event"] },
  { id: "fotos", rotulo: "Fotos", suffix: "/album", absorve: ["/moderation"] },
  { id: "convidados", rotulo: "Convidados", suffix: "/guests", absorve: ["/insights"] },
  {
    id: "experiencia",
    rotulo: "Experiência",
    suffix: "/identity",
    absorve: ["/missions", "/guestbook"],
  },
  { id: "compartilhar", rotulo: "Compartilhar", suffix: "/qrcode", absorve: [] },
  { id: "ajustes", rotulo: "Ajustes", suffix: "/consent", absorve: [] },
];

function casa(pathname: string, rota: string): boolean {
  return pathname === rota || pathname.startsWith(`${rota}/`);
}

export function destinoAtivo(pathname: string, base: string): DestinoId | null {
  const limpo =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (!casa(limpo, base)) return null;

  for (const destino of DESTINOS) {
    const rotas = [...(destino.suffix ? [destino.suffix] : []), ...destino.absorve];
    if (rotas.some((r) => casa(limpo, `${base}${r}`))) return destino.id;
  }

  return limpo === base ? "inicio" : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run apps/web/features/admin/lib/navegacao.test.ts
```

Esperado: PASS, 9 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/admin/lib/navegacao.ts apps/web/features/admin/lib/navegacao.test.ts
git commit -m "feat(admin): seis destinos do painel e a regra de destino ativo"
```

---

### Task 2: Barra lateral do desktop

**Files:**
- Create: `apps/web/features/admin/components/client/event-sidebar.tsx`
- Test: `apps/web/features/admin/components/client/event-sidebar.test.tsx`
- Modify: `apps/web/package.json`, `pnpm-lock.yaml` (`lucide-react`, já instalado)

**Interfaces:**
- Consumes: `DESTINOS`, `destinoAtivo` (Task 1); `useModerationCount` de `./moderation-count-context`.
- Produces: `<EventSidebar eventId={string} nomeDoEvento={string} />`.

`lucide-react` entra só aqui e na Task 3, ambas sob `/admin` — a rota do convidado tem orçamento de bundle e não é tocada. O import é por ícone, então só o que se usa entra no pacote.

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/features/admin/components/client/event-sidebar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventSidebar } from "./event-sidebar";

const mockPathname = vi.fn(() => "/admin/e/abc");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockCount = vi.fn(() => ({ count: 0 }));
vi.mock("./moderation-count-context", () => ({ useModerationCount: () => mockCount() }));

describe("EventSidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin/e/abc");
    mockCount.mockReturnValue({ count: 0 });
  });

  it("lista os seis destinos", () => {
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    for (const rotulo of ["Início", "Fotos", "Convidados", "Experiência", "Compartilhar", "Ajustes"]) {
      expect(screen.getByRole("link", { name: new RegExp(rotulo) })).toBeInTheDocument();
    }
  });

  it("marca o destino da rota atual com aria-current", () => {
    mockPathname.mockReturnValue("/admin/e/abc/moderation");
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Início/ })).not.toHaveAttribute("aria-current");
  });

  it("o item ativo não se distingue só por cor", () => {
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);
    const ativo = screen.getByRole("link", { name: /Início/ });

    expect(ativo.className).toMatch(/bg-superficie-alta\b/);
    expect(ativo.className).toMatch(/font-titulo\b/);
  });

  it("mostra a pendência de revisão no destino Fotos", () => {
    mockCount.mockReturnValue({ count: 3 });
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveTextContent("3");
  });

  it("acima de nove a pendência vira 9+, para não alargar o item", () => {
    mockCount.mockReturnValue({ count: 42 });
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveTextContent("9+");
  });

  it("nome longo de evento não quebra o layout: trunca e guarda o inteiro no title", () => {
    const nome = "Casamento da Maria Fernanda com o João Pedro na Fazenda Santa Clara";
    render(<EventSidebar eventId="abc" nomeDoEvento={nome} />);

    const rotulo = screen.getByTitle(nome);
    expect(rotulo.className).toMatch(/truncate\b/);
  });

  it("tem rótulo de navegação próprio, já que há duas navegações na página", () => {
    render(<EventSidebar eventId="abc" nomeDoEvento="Festa" />);

    expect(screen.getByRole("navigation", { name: "Seções do evento" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run apps/web/features/admin/components/client/event-sidebar.test.tsx
```

Esperado: FAIL, não resolve `./event-sidebar`.

- [ ] **Step 3: Implementar**

Crie `apps/web/features/admin/components/client/event-sidebar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Images,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { DESTINOS, destinoAtivo, type DestinoId } from "@/features/admin/lib/navegacao";
import { useModerationCount } from "./moderation-count-context";

const ICONES: Record<DestinoId, typeof Home> = {
  inicio: Home,
  fotos: Images,
  convidados: Users,
  experiencia: Sparkles,
  compartilhar: Share2,
  ajustes: Settings2,
};

const CHAVE_RECOLHIDA = "albora.admin.sidebar.recolhida";

export function EventSidebar({
  eventId,
  nomeDoEvento,
}: {
  eventId: string;
  nomeDoEvento: string;
}) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const base = `/admin/e/${eventId}`;
  const ativo = destinoAtivo(pathname, base);
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    try {
      setRecolhida(window.localStorage.getItem(CHAVE_RECOLHIDA) === "1");
    } catch {
      setRecolhida(false);
    }
  }, []);

  const alternar = () => {
    setRecolhida((antes) => {
      const agora = !antes;
      try {
        window.localStorage.setItem(CHAVE_RECOLHIDA, agora ? "1" : "0");
      } catch {
        /* modo privado: a preferência não sobrevive, a navegação continua. */
      }
      return agora;
    });
  };

  const Recolher = recolhida ? PanelLeftOpen : PanelLeftClose;

  return (
    <nav
      aria-label="Seções do evento"
      data-admin-nav
      className={[
        "sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r border-linha bg-superficie px-3 py-6 lg:flex",
        recolhida ? "w-[4.5rem]" : "w-64",
      ].join(" ")}
    >
      <p
        title={nomeDoEvento}
        className={[
          "tipo-caption mb-4 px-2 text-ink-3",
          recolhida ? "sr-only" : "truncate",
        ].join(" ")}
      >
        {nomeDoEvento}
      </p>

      {DESTINOS.map((destino) => {
        const Icone = ICONES[destino.id];
        const href = `${base}${destino.suffix}`;
        const marcado = ativo === destino.id;
        const pendencia = destino.id === "fotos" && count > 0;

        return (
          <Link
            key={destino.id}
            href={href}
            aria-current={marcado ? "page" : undefined}
            title={recolhida ? destino.rotulo : undefined}
            className={[
              "relative flex min-h-11 items-center gap-3 rounded-pilula px-3 text-sm no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
              marcado
                ? "bg-superficie-alta font-titulo text-acento-texto"
                : "text-ink-2 hover:bg-superficie-alta hover:text-ink",
              recolhida ? "justify-center" : "",
            ].join(" ")}
          >
            <Icone size={18} aria-hidden />
            <span className={recolhida ? "sr-only" : "truncate"}>{destino.rotulo}</span>
            {pendencia && (
              <span
                className={[
                  "flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-critico px-1 font-titulo text-[0.55rem] leading-none text-sobre-acento",
                  recolhida ? "absolute right-1 top-1" : "ml-auto",
                ].join(" ")}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={alternar}
        aria-expanded={!recolhida}
        className="mt-auto flex min-h-11 cursor-pointer items-center gap-3 rounded-pilula border-none bg-transparent px-3 text-sm text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
      >
        <Recolher size={18} aria-hidden />
        <span className={recolhida ? "sr-only" : ""}>
          {recolhida ? "Expandir menu" : "Recolher menu"}
        </span>
      </button>
    </nav>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run apps/web/features/admin/components/client/event-sidebar.test.tsx
```

Esperado: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/admin/components/client/event-sidebar.tsx apps/web/features/admin/components/client/event-sidebar.test.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(admin): barra lateral recolhível com os seis destinos"
```

---

### Task 3: Tab bar do celular

Cinco itens cabem numa tab bar com alvo de toque decente; seis não. Início, Fotos, Convidados e Experiência ficam diretos, e "Mais" abre o resto.

**Files:**
- Create: `apps/web/features/admin/components/client/event-tab-bar.tsx`
- Test: `apps/web/features/admin/components/client/event-tab-bar.test.tsx`

**Interfaces:**
- Consumes: `DESTINOS`, `destinoAtivo` (Task 1); `BottomSheet` de `@albora/ui-web` (props `{ title, open, onClose, children, footer?, titleId? }`).
- Produces: `<EventTabBar eventId={string} />`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/features/admin/components/client/event-tab-bar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventTabBar } from "./event-tab-bar";

const mockPathname = vi.fn(() => "/admin/e/abc");
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockCount = vi.fn(() => ({ count: 0 }));
vi.mock("./moderation-count-context", () => ({ useModerationCount: () => mockCount() }));

describe("EventTabBar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin/e/abc");
    mockCount.mockReturnValue({ count: 0 });
  });

  it("mostra quatro destinos diretos e o botão Mais", () => {
    render(<EventTabBar eventId="abc" />);

    for (const rotulo of ["Início", "Fotos", "Convidados", "Experiência"]) {
      expect(screen.getByRole("link", { name: new RegExp(rotulo) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Mais/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Compartilhar/ })).not.toBeInTheDocument();
  });

  it("Mais abre o resto dos destinos sem tirar o anfitrião da tela", async () => {
    const user = userEvent.setup();
    render(<EventTabBar eventId="abc" />);

    await user.click(screen.getByRole("button", { name: /Mais/ }));

    expect(screen.getByRole("link", { name: /Compartilhar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ajustes/ })).toBeInTheDocument();
  });

  it("estando numa rota de Ajustes, o Mais aparece marcado", () => {
    mockPathname.mockReturnValue("/admin/e/abc/consent");
    render(<EventTabBar eventId="abc" />);

    expect(screen.getByRole("button", { name: /Mais/ })).toHaveAttribute("aria-current", "page");
  });

  it("marca o destino da rota atual", () => {
    mockPathname.mockReturnValue("/admin/e/abc/album");
    render(<EventTabBar eventId="abc" />);

    expect(screen.getByRole("link", { name: /Fotos/ })).toHaveAttribute("aria-current", "page");
  });

  it("respeita a área segura do aparelho", () => {
    render(<EventTabBar eventId="abc" />);

    expect(screen.getByRole("navigation", { name: "Navegação do evento" }).className).toMatch(
      /pb-\[env\(safe-area-inset-bottom\)\]/,
    );
  });

  it("todo alvo de toque tem pelo menos 44px", () => {
    render(<EventTabBar eventId="abc" />);

    for (const alvo of screen.getAllByRole("link")) {
      expect(alvo.className).toMatch(/min-h-11\b/);
    }
    expect(screen.getByRole("button", { name: /Mais/ }).className).toMatch(/min-h-11\b/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run apps/web/features/admin/components/client/event-tab-bar.test.tsx
```

Esperado: FAIL, não resolve `./event-tab-bar`.

- [ ] **Step 3: Implementar**

Crie `apps/web/features/admin/components/client/event-tab-bar.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomSheet } from "@albora/ui-web";
import { Home, Images, MoreHorizontal, Settings2, Share2, Sparkles, Users } from "lucide-react";
import { DESTINOS, destinoAtivo, type DestinoId } from "@/features/admin/lib/navegacao";
import { useModerationCount } from "./moderation-count-context";

const ICONES: Record<DestinoId, typeof Home> = {
  inicio: Home,
  fotos: Images,
  convidados: Users,
  experiencia: Sparkles,
  compartilhar: Share2,
  ajustes: Settings2,
};

const DIRETOS: readonly DestinoId[] = ["inicio", "fotos", "convidados", "experiencia"];

export function EventTabBar({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const [aberto, setAberto] = useState(false);
  const base = `/admin/e/${eventId}`;
  const ativo = destinoAtivo(pathname, base);

  const diretos = DESTINOS.filter((d) => DIRETOS.includes(d.id));
  const noMais = DESTINOS.filter((d) => !DIRETOS.includes(d.id));
  const maisMarcado = noMais.some((d) => d.id === ativo);

  const itemClasses = (marcado: boolean) =>
    [
      "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-superficie px-1 py-1.5 text-[0.65rem] no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
      marcado ? "font-titulo text-acento-texto" : "text-ink-3",
    ].join(" ");

  return (
    <>
      <nav
        aria-label="Navegação do evento"
        data-admin-nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-0.5 border-t border-linha bg-superficie px-2 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      >
        {diretos.map((destino) => {
          const Icone = ICONES[destino.id];
          const marcado = ativo === destino.id;
          const pendencia = destino.id === "fotos" && count > 0;

          return (
            <Link
              key={destino.id}
              href={`${base}${destino.suffix}`}
              aria-current={marcado ? "page" : undefined}
              className={itemClasses(marcado)}
            >
              <span className="relative">
                <Icone size={20} aria-hidden />
                {pendencia && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-critico px-1 font-titulo text-[0.5rem] leading-none text-sobre-acento">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{destino.rotulo}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-current={maisMarcado ? "page" : undefined}
          aria-haspopup="dialog"
          className={`${itemClasses(maisMarcado)} cursor-pointer border-none bg-transparent`}
        >
          <MoreHorizontal size={20} aria-hidden />
          <span>Mais</span>
        </button>
      </nav>

      <BottomSheet title="Mais do evento" open={aberto} onClose={() => setAberto(false)}>
        <div className="flex flex-col gap-1 pb-2">
          {noMais.map((destino) => {
            const Icone = ICONES[destino.id];

            return (
              <Link
                key={destino.id}
                href={`${base}${destino.suffix}`}
                onClick={() => setAberto(false)}
                aria-current={ativo === destino.id ? "page" : undefined}
                className="flex min-h-11 items-center gap-3 rounded-pilula px-3 text-sm text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta"
              >
                <Icone size={18} aria-hidden />
                {destino.rotulo}
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run apps/web/features/admin/components/client/event-tab-bar.test.tsx
```

Esperado: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/admin/components/client/event-tab-bar.tsx apps/web/features/admin/components/client/event-tab-bar.test.tsx
git commit -m "feat(admin): tab bar do celular com quatro destinos e folha Mais"
```

---

### Task 4: O shell abre espaço para a navegação

`AdminShell` hoje é uma coluna só de no máximo 72rem, com header e nada mais (`admin-shell.tsx:21-52`). Ganha um slot opcional de barra lateral, e as telas sem evento continuam iguais.

**Files:**
- Modify: `apps/web/features/admin/components/server/admin-shell.tsx:14-52`
- Modify: `apps/web/features/admin/components/server/event-page-layout.tsx:29-47`
- Delete: `apps/web/features/admin/components/client/event-nav.tsx`

**Interfaces:**
- Consumes: `<EventSidebar>` (Task 2), `<EventTabBar>` (Task 3).
- Produces: `AdminShell` passa a aceitar `sidebar?: ReactNode` e `bottomNav?: ReactNode`.

- [ ] **Step 1: Dar os dois slots ao shell**

Em `apps/web/features/admin/components/server/admin-shell.tsx`, troque o tipo e o corpo de `AdminShell`:

```tsx
type AdminShellProps = {
  title: string;
  subtitle?: string;
  back?: { label: string; href: string };
  sidebar?: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
};

export function AdminShell({
  title,
  subtitle,
  back,
  sidebar,
  bottomNav,
  children,
}: AdminShellProps) {
  return (
    <>
      <SkipLink />
      <div
        className="flex min-h-dvh bg-bg font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
        {sidebar}
        <main id="main-content" className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[72rem] p-[clamp(1.5rem,5vw,4rem)] pb-28 lg:pb-[clamp(1.5rem,5vw,4rem)]">
            <header
              className="mb-12 flex items-start justify-between gap-6"
              data-admin-shell-header
            >
              <div className="min-w-0">
                {back && (
                  <Link
                    href={back.href}
                    data-admin-shell-back
                    className="tipo-label mb-4 inline-block text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
                  >
                    ← {back.label}
                  </Link>
                )}
                <h1 className="tipo-title m-0 truncate" title={title}>
                  {title}
                </h1>
                {subtitle && <p className="tipo-caption m-0 mt-2 text-ink-3">{subtitle}</p>}
              </div>
              <SignOutButton />
            </header>
            {children}
          </div>
        </main>
      </div>
      {bottomNav}
    </>
  );
}
```

O `pb-28` no celular é o que impede a tab bar fixa de cobrir o fim do conteúdo; some no `lg`, onde não há tab bar.

- [ ] **Step 2: Ligar no layout do evento**

Em `apps/web/features/admin/components/server/event-page-layout.tsx`, troque o import de `EventNav` pelos dois novos e o corpo do `AdminShell`:

```tsx
import { EventSidebar } from "@/features/admin/components/client/event-sidebar";
import { EventTabBar } from "@/features/admin/components/client/event-tab-bar";
```

```tsx
  return (
    <ModerationCountProvider>
      <AdminShell
        title={ctx.name}
        subtitle={subtitle}
        back={{ label: "Seus eventos", href: "/admin" }}
        sidebar={<EventSidebar eventId={eventId} nomeDoEvento={ctx.name} />}
        bottomNav={<EventTabBar eventId={eventId} />}
      >
        <div className="mb-6 flex justify-end">
          <CopiarLinkEvento slug={ctx.evento.slug} />
        </div>
        {showsFollowMode(ctx.role, allowFollowMode) ? (
          <CoupleFollowMode eventoId={eventId} dense={content} />
        ) : (
          content
        )}
      </AdminShell>
    </ModerationCountProvider>
  );
```

O `ModerationCountProvider` sobe para fora do `AdminShell` porque agora a barra lateral e a tab bar, que ficam fora do `children`, também leem a contagem de pendências.

- [ ] **Step 3: Apagar a navegação antiga**

```bash
git rm apps/web/features/admin/components/client/event-nav.tsx
grep -rn "event-nav\|EventNav" apps/web
```

Esperado: nenhuma referência sobrando. Se houver, troque pelo componente novo correspondente.

- [ ] **Step 4: Conferir**

```bash
pnpm typecheck
pnpm lint
pnpm vitest run apps/web/features/admin
```

Esperado: tudo limpo.

- [ ] **Step 5: Ver com os próprios olhos**

O harness `apps/web/app/telas-admin` **não serve** para isto: ele renderiza telas-maquete de `app/telas/admin-screens.tsx`, não os componentes reais. Para ver os de verdade, crie uma página temporária que monte `AdminShell` + `EventSidebar` + `EventTabBar` dentro de `ModerationCountProvider` — o provider é estado puro, sem fetch, e `useModerationCount` tem default, então a página sobe sem auth e sem banco. Confira, nesta ordem:

1. Desktop (≥1024px): os seis itens na lateral, o ativo marcado, recolher e expandir.
2. Celular (375px): quatro itens mais "Mais", a folha abrindo, o conteúdo não coberto pela barra.
3. Nome de evento longo: trunca na lateral e no título, sem empurrar nada.

**Ao terminar, apague a página temporária E `apps/web/.next/types`.** O Next gera tipos de rota para ela, e os tipos sobrevivem ao arquivo: o `pnpm typecheck` passa a falhar com `TS2307: Cannot find module` apontando para `.next/types/app/<rota>/page.ts`, um erro que parece do seu código e não é.

Registro desta execução: o painel de browser deste ambiente renderizou em branco **também** `/telas-admin`, página que já existia e não foi tocada — 677KB de DOM e texto zero, com erro de chunk do webpack no console. Limpar o `.next` não resolveu. Conclusão: falha do painel, não do código. O que ficou verificado no lugar foi o HTML servido (`curl`), que traz as duas navegações com `aria-label` corretos e as classes `lg:flex`, `lg:hidden`, `pb-28` e `truncate` nos lugares certos.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/admin/components/server/admin-shell.tsx apps/web/features/admin/components/server/event-page-layout.tsx
git commit -m "feat(admin): shell de duas colunas com navegação de evento"
```

---

## Fechamento

- [ ] **Suíte**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm guards
```

`pnpm test:isolamento` não é necessário: este plano não toca em banco.

- [ ] **Verificar os artefatos**

```bash
git log --oneline -4
git status --short
```

Quatro commits novos. `event-nav.tsx` não existe mais.

## Pronto quando

- Os seis destinos aparecem e navegam no desktop e no celular.
- A rota atual marca o destino certo, inclusive nas telas que o destino ainda vai absorver.
- Nenhum item se distingue do resto só por cor.
- Nada essencial ficou atrás de caminho difícil no celular: quatro destinos diretos, dois a um toque.
- Nome longo de evento trunca e não quebra layout em nenhuma largura.
- A tab bar não cobre o fim do conteúdo, e respeita a área segura.
