# Onda 0B-2 — Hook de leitura do painel (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao painel um jeito único de ler dados, e provar que ele funciona no caso mais difícil que existe hoje.

**Architecture:** Cada componente client do admin reimplementa `useEffect` + `fetch` + três `useState`. Isso não é só repetição: é a causa raiz dos quinze skeletons artesanais, das mensagens de erro reescritas arquivo a arquivo, e de uma corrida de dados que ninguém trata — **nenhum arquivo do admin usa `AbortController`**, então num componente que faz polling a resposta atrasada de uma requisição velha sobrescreve a de uma requisição nova. O hook centraliza o padrão e conserta a corrida de uma vez.

**Tech Stack:** TypeScript, React 19, Next.js App Router, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§8), commit `8868ba42`.

## Global Constraints

- `import React from "react"` em todo `.tsx` de `apps/web` **que tenha JSX** — componente e teste. `apps/web/tsconfig.json:9` usa `"jsx": "preserve"`, que o esbuild do vitest compila no runtime clássico. Um teste de hook feito só com `renderHook` **não** tem JSX: ali o import sobra e o lint reprova por `no-unused-vars`. Ainda assim o arquivo precisa terminar em `.tsx`, porque o project `jsdom` do vitest (`vitest.config.ts:39`) só inclui `*.test.tsx` — um `.test.ts` cairia no project `node`, sem DOM, e `renderHook` quebraria.
- Nenhum hex hardcodado; cor sai de classe semântica de token.
- Nenhuma string de domínio (`noiva`, `casamento`, `noivos`) em componente.
- Nenhum componente retorna `null` por falta de dado ou de permissão. Todo vazio tem texto próprio.
- Caminho crítico nunca bloqueia: leitura que falha **degrada**, não zera. Se já havia dado na tela, ele continua lá.
- Por padrão, **nenhum comentário**. Só invariante invisível no código, workaround com link, supressão com motivo, ou contrato que nome e assinatura não carregam.
- Commits em Conventional Commits com escopo.
- Nunca fazer merge sem pedido explícito.

## Ambiente

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

Nada aqui toca banco. `pnpm vitest run <arquivo>` basta.

## Escopo: o que esta onda entrega e o que ela não entrega

**Entrega:** o hook, com testes que cobrem inclusive a corrida que hoje ninguém trata, e a migração do `live-summary.tsx` — que é o consumidor mais difícil do painel: faz polling de 30s, tem efeito colateral (alimenta a contagem de moderação que a navegação lê), tem skeleton artesanal, tem estado de erro e tem botão de recarregar manual. Se o hook serve para ele, serve para os outros.

**Não entrega:** a migração dos outros doze arquivos. É varredura mecânica, e escrevê-la aqui às cegas produziria código de plano que não bate com o código real. Vai em plano próprio (0B-2b), escrito depois de ler os arquivos, cobrindo: `comment-moderation.tsx`, `consent-versions.tsx`, `billing-history.tsx`, `couple-follow-mode.tsx`, `event-insights.tsx`, `event-music.tsx`, `event-team-panel.tsx`, `host-album.tsx`, `guestbook-editor.tsx`, `host-export.tsx`, `guest-funnel.tsx`, `host-drive-export.tsx`, `review-queue.tsx`.

Dois `animate-pulse` do admin **não** entram na varredura em nenhum momento: `live-summary.tsx:146` e `guestbook-audio-field.tsx:43` são indicadores de estado ativo ("festa", "gravando"), não skeletons de carregamento.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/features/admin/hooks/use-admin-resource.ts` *(criar)* | O hook de leitura. Sem JSX. |
| `apps/web/features/admin/hooks/use-admin-resource.test.tsx` *(criar)* | Testes do hook, inclusive corrida e desmontagem. |
| `apps/web/features/admin/components/client/live-summary.tsx` *(modificar)* | Primeiro consumidor; perde o fetch cru e o skeleton artesanal. |

---

### Task 1: O hook

**Files:**
- Create: `apps/web/features/admin/hooks/use-admin-resource.ts`
- Test: `apps/web/features/admin/hooks/use-admin-resource.test.tsx`

**Interfaces:**
- Produces: `useAdminResource<T>(url: string, opcoes?: { intervaloMs?: number; aoCarregar?: (dado: T) => void }): RecursoAdmin<T>`, com `RecursoAdmin<T> = { dado: T | null; carregando: boolean; erro: boolean; atualizadoEm: Date | null; recarregar: () => Promise<void> }`. A Task 2 e o plano 0B-2b consomem.

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/features/admin/hooks/use-admin-resource.test.tsx`:

```tsx
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminResource } from "./use-admin-resource";

type Dado = { n: number };

function respostaOk(dado: unknown) {
  return { ok: true, json: async () => dado } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useAdminResource", () => {
  it("começa carregando e entrega o dado", async () => {
    fetchMock.mockResolvedValue(respostaOk({ n: 1 }));

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));

    expect(result.current.carregando).toBe(true);
    expect(result.current.dado).toBeNull();

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dado).toEqual({ n: 1 });
    expect(result.current.erro).toBe(false);
    expect(result.current.atualizadoEm).toBeInstanceOf(Date);
  });

  it("resposta não-ok vira erro", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));

    await waitFor(() => expect(result.current.erro).toBe(true));
    expect(result.current.dado).toBeNull();
  });

  it("recarga que falha preserva o dado que já estava na tela", async () => {
    fetchMock.mockResolvedValueOnce(respostaOk({ n: 1 }));

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));
    await waitFor(() => expect(result.current.dado).toEqual({ n: 1 }));

    fetchMock.mockRejectedValueOnce(new Error("rede caiu"));
    await act(async () => {
      await result.current.recarregar();
    });

    expect(result.current.erro).toBe(true);
    expect(result.current.dado).toEqual({ n: 1 });
  });

  it("resposta atrasada de uma leitura velha não sobrescreve a mais nova", async () => {
    let liberaPrimeira: (r: Response) => void = () => undefined;
    const primeira = new Promise<Response>((resolve) => {
      liberaPrimeira = resolve;
    });

    fetchMock.mockReturnValueOnce(primeira);
    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));

    fetchMock.mockResolvedValueOnce(respostaOk({ n: 2 }));
    await act(async () => {
      await result.current.recarregar();
    });
    expect(result.current.dado).toEqual({ n: 2 });

    await act(async () => {
      liberaPrimeira(respostaOk({ n: 1 }));
      await primeira;
    });

    expect(result.current.dado).toEqual({ n: 2 });
  });

  it("avisa quem pediu, a cada carga bem-sucedida", async () => {
    fetchMock.mockResolvedValue(respostaOk({ n: 7 }));
    const aoCarregar = vi.fn();

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x", { aoCarregar }));
    await waitFor(() => expect(result.current.dado).toEqual({ n: 7 }));

    expect(aoCarregar).toHaveBeenCalledWith({ n: 7 });
  });

  it("sem intervalo, lê uma vez só", async () => {
    fetchMock.mockResolvedValue(respostaOk({ n: 1 }));

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("com intervalo, relê sozinho", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue(respostaOk({ n: 1 }));

    const { result } = renderHook(() =>
      useAdminResource<Dado>("/api/x", { intervaloMs: 30_000 }),
    );
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("desmontado, não tenta mais escrever estado", async () => {
    let libera: (r: Response) => void = () => undefined;
    const pendente = new Promise<Response>((resolve) => {
      libera = resolve;
    });
    fetchMock.mockReturnValueOnce(pendente);

    const { unmount } = renderHook(() => useAdminResource<Dado>("/api/x"));
    unmount();

    const avisos = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await act(async () => {
      libera(respostaOk({ n: 1 }));
      await pendente;
    });

    expect(avisos).not.toHaveBeenCalled();
    avisos.mockRestore();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run apps/web/features/admin/hooks/use-admin-resource.test.tsx
```

Esperado: FAIL, não resolve `./use-admin-resource`.

- [ ] **Step 3: Implementar**

Crie `apps/web/features/admin/hooks/use-admin-resource.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Opcoes<T> = {
  /** Relê sozinho neste intervalo. Omita para ler uma vez só. */
  intervaloMs?: number;
  aoCarregar?: (dado: T) => void;
};

export type RecursoAdmin<T> = {
  dado: T | null;
  carregando: boolean;
  erro: boolean;
  atualizadoEm: Date | null;
  recarregar: () => Promise<void>;
};

export function useAdminResource<T>(url: string, opcoes: Opcoes<T> = {}): RecursoAdmin<T> {
  const { intervaloMs, aoCarregar } = opcoes;
  const [dado, setDado] = useState<T | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const aoCarregarRef = useRef(aoCarregar);
  aoCarregarRef.current = aoCarregar;

  /** Só a leitura mais nova pode escrever: sem isto, a resposta atrasada de um poll velho sobrescreve a de um poll recente. */
  const geracao = useRef(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregar = useCallback(async () => {
    const minha = ++geracao.current;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      const novo = (await r.json()) as T;
      if (!montado.current || minha !== geracao.current) return;
      setDado(novo);
      setErro(false);
      setAtualizadoEm(new Date());
      aoCarregarRef.current?.(novo);
    } catch {
      if (!montado.current || minha !== geracao.current) return;
      setErro(true);
    } finally {
      if (montado.current && minha === geracao.current) setCarregando(false);
    }
  }, [url]);

  useEffect(() => {
    void recarregar();
    if (!intervaloMs) return;
    const id = window.setInterval(() => void recarregar(), intervaloMs);
    return () => window.clearInterval(id);
  }, [recarregar, intervaloMs]);

  return { dado, carregando, erro, atualizadoEm, recarregar };
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run apps/web/features/admin/hooks/use-admin-resource.test.tsx
```

Esperado: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/admin/hooks/use-admin-resource.ts apps/web/features/admin/hooks/use-admin-resource.test.tsx
git commit -m "feat(admin): hook de leitura com guarda contra leitura atrasada"
```

---

### Task 2: O consumidor mais difícil

`live-summary.tsx` hoje tem, entre as linhas 1 e 79, o padrão inteiro: `useState` para dado, erro, última atualização e "atualizando"; `useCallback` com `fetch`; `useEffect` com `setInterval` de 30s; e o efeito colateral de alimentar `setCount` da contagem de moderação — que a barra lateral e a tab bar leem. Entre 108 e 123 tem o skeleton artesanal.

**Files:**
- Modify: `apps/web/features/admin/components/client/live-summary.tsx:1-79` (estado e fetch), `:108-123` (skeleton)

**Interfaces:**
- Consumes: `useAdminResource` (Task 1), `Skeleton` de `@albora/ui-web` (props `{ variant?: "rect" | "circle" | "text"; className?; style? }`).

- [ ] **Step 1: Trocar o estado e o fetch pelo hook**

Em `apps/web/features/admin/components/client/live-summary.tsx`, troque o bloco que vai de `export function LiveSummary` até o fim do segundo `useEffect` por:

```tsx
export function LiveSummary({ eventoId }: Props) {
  const [primeiraFotoToast, setPrimeiraFotoToast] = useState(false);
  const primeiraFotoVista = useRef(false);
  const { setCount } = useModerationCount();
  const [atualizando, setAtualizando] = useState(false);

  const aoCarregar = useCallback(
    (dados: Resumo) => {
      setCount(dados.filaRevisao);

      if (!primeiraFotoVista.current && dados.totalFotos > 0) {
        const chave = `albora:primeiraFoto:${eventoId}`;
        try {
          if (!sessionStorage.getItem(chave)) {
            sessionStorage.setItem(chave, "1");
            setPrimeiraFotoToast(true);
          }
        } catch {
          /* Modo privado: o aviso não aparece, o painel continua. */
        }
        primeiraFotoVista.current = true;
      }
    },
    [eventoId, setCount],
  );

  const {
    dado: resumo,
    erro,
    atualizadoEm: ultimaAtualizacao,
    recarregar: carregar,
  } = useAdminResource<Resumo>(`/api/admin/events/${eventoId}`, {
    intervaloMs: INTERVALO_MS,
    aoCarregar,
  });

  useEffect(() => {
    if (!primeiraFotoToast) return;
    const id = setTimeout(() => setPrimeiraFotoToast(false), 7000);
    return () => clearTimeout(id);
  }, [primeiraFotoToast]);
```

Ajuste os imports do topo: `useAdminResource` entra, e de `react` sobram `useCallback`, `useEffect`, `useRef`, `useState`.

```tsx
import { Badge, Skeleton } from "@albora/ui-web";
import { useAdminResource } from "@/features/admin/hooks/use-admin-resource";
```

O resto do componente não muda: `erro && !resumo` e `!resumo` continuam sendo as condições de erro e de carregando, e `carregar` continua sendo o que o `RefreshButton` chama.

- [ ] **Step 2: Trocar o skeleton artesanal pelo do design system**

Troque o bloco `if (!resumo)` (linhas 108-123) por:

```tsx
  if (!resumo) {
    return (
      <AdminSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton variant="text" className="h-6 w-20" />
        </div>
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[4.5rem]" />
          ))}
        </div>
        <Skeleton variant="text" className="h-1.5" />
      </AdminSection>
    );
  }
```

O `Skeleton` traz `aria-hidden` e a classe `skeleton-pulse`, que é a do design system. **Não toque** no `animate-pulse` da linha ~146: aquele é o ponto pulsante do selo "festa", indicador de estado ativo, não skeleton.

- [ ] **Step 3: Conferir**

```bash
pnpm typecheck
pnpm lint
pnpm vitest run apps/web/features/admin
```

Esperado: tudo limpo. Se sobrar import não usado de `react`, o lint acusa — remova.

- [ ] **Step 4: Conferir que a corrida sumiu de verdade neste arquivo**

```bash
grep -n "fetch(\|setInterval\|setErro\|setResumo" apps/web/features/admin/components/client/live-summary.tsx
```

Esperado: nenhuma ocorrência. Todo o ciclo de leitura agora vive no hook.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/admin/components/client/live-summary.tsx
git commit -m "refactor(admin): painel ao vivo lê pelo hook e usa o skeleton do design system"
```

---

## Fechamento

- [ ] **Suíte**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm guards
```

- [ ] **Verificar os artefatos**

```bash
git log --oneline -2
git status --short
```

Dois commits novos, árvore sem resíduo.

## Pronto quando

- O hook existe, com teste que prova que leitura atrasada não sobrescreve leitura nova — comportamento que **nenhum** arquivo do admin tinha.
- `live-summary.tsx` não tem mais `fetch`, `setInterval` nem estado de leitura próprio.
- O skeleton do painel ao vivo é o do design system.
- A contagem de moderação continua chegando na navegação: é ela que acende a pendência em Fotos.

## Achado para outra onda

`live-summary.tsx:136` mostra "🎉 A primeira foto chegou!". Emoji na interface é anti-padrão declarado no brief e na spec. Não mexi aqui porque esta onda é sobre o padrão de leitura, não sobre copy — entra na Onda 7, junto com o resto dos textos.
