# Loop viral P1 — atribuição, CTAs e share — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o loop viral medível: um convidado que vê o álbum consegue chegar à landing com atribuição (`?ref=` → cookie `albora_ref` → `product_events.origin_ref`), e o produto registra cliques em "crie o seu" e compartilhamentos do álbum.

**Architecture:** O outbound já existe (`event_share_refs`, `refDoEvento`). P1 fecha o inbound: um middleware mínimo transforma `?ref=` válido em cookie httpOnly de 30 min; o sink de analytics passa a gravar `origin_ref`; a landing envia `originRef` lido da URL; o álbum público e o álbum do convidado ganham CTAs que apontam para `/?ref=<token>`; um util compartilhado dispara eventos `guest_*`. A única mudança em `/admin` é entregue como patch documentado, não aplicada.

**Tech Stack:** Next.js 15 (App Router, middleware, Route Handlers), React 19, TypeScript (`exactOptionalPropertyTypes`), Postgres (`pg`), vitest (jsdom + node), Playwright, pnpm monorepo. Node 22 obrigatório no shell dos commits (`source ~/.nvm/nvm.sh && nvm use 22`).

**Spec:** `docs/superpowers/specs/2026-09-05-loop-viral-convidado-anfitriao-design.md` (§2 atribuição, §3 CTAs, §4 share, §6 analytics, §8 P1, §11 handoff).

## Global Constraints

- **Nenhuma edição em `apps/web/app/admin/**`, `apps/web/features/admin/**` ou `apps/web/lib/api/handlers/admin-events.ts`.** A mudança necessária ali é entregue como patch em `docs/superpowers/handoffs/` (Task 7).
- `product_events` **continua sem `event_id`** — é anônimo por design (migration 0032). `origin_ref` é rótulo opaco; nunca gravar `event_id`, nome, e-mail ou telefone nele.
- Ref token: exatamente 24 chars `[A-Za-z0-9]` (`packages/db/src/share-attribution.ts`: `TAMANHO_REF = 24`, alfabeto de 62). Validar com `REF_TOKEN_RE` antes de aceitar de qualquer origem externa (URL, body, cookie).
- Cookie `albora_ref`: `httpOnly`, `sameSite: "lax"`, `secure` em produção, `path: "/"`, `maxAge: 1800`. Não é limpo após uso (trade-off aceito: expiração de 30 min limita a janela).
- Todo CTA viral aponta para `/?ref=<token>` (landing), **nunca** direto para `/admin/new`.
- **Nenhum hex hardcodado; nenhuma string de domínio** (`casamento`, `noiv*`, `padrinh*`, `madrinha*`) em componente. Copy de marca do produto ("álbum da sua festa") é permitida; vocabulário de evento não.
- **Nunca logar PII.** Logs de falha usam só `name`/`err`.
- Migrations são forward-only. A próxima é **`0059`**.
- Nomes de evento de analytics em `snake_case` sem ponto, seguindo `PRODUCT_EVENT_NAMES` (ex.: `landing_cta`). Novos: `guest_cta_criar_click`, `guest_share_album`.
- Commits: Conventional Commits com escopo; terminar com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Testes do pacote `packages/db` só rodam com `--config vitest.isolamento.config.ts` (a config raiz exclui `packages/db/**`). Testes de `apps/web` rodam na config raiz a partir da raiz do monorepo: `pnpm exec vitest run <caminho>`.
- Guards ao final de cada task: `node tools/guards/tokens.mjs && node tools/guards/dominio.mjs && node tools/guards/isolamento.mjs && node tools/guards/sessao.mjs`.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `packages/core/src/ref-token.ts` (create) | `REF_TOKEN_RE` e `isRefToken` — fonte única do formato, puro e isomórfico (client, edge, server) |
| `packages/db/src/share-attribution.ts` (modify) | re-exporta o validador de `@albora/core` |
| `apps/web/lib/analytics/ref-cookie.ts` (create) | `COOKIE_REF = "albora_ref"` — nome único do cookie, sem acoplar ao middleware |
| `packages/db/src/analytics.ts` (modify) | `recordProductEvent` grava `origin_ref`; enum ganha 2 nomes `guest_*` |
| `packages/db/src/analytics.test.ts` (create) | unit com pool mockado: SQL e params |
| `packages/db/migrations/0059_analytics_guest_events.sql` (create) | recria CHECK de `product_events.name` com os 2 nomes novos |
| `apps/web/app/api/analytics/product/route.ts` (modify) | aceita e valida `originRef` |
| `apps/web/app/api/analytics/product/route.test.ts` (create) | route handler com `getPool` mockado |
| `apps/web/lib/analytics/fire-product-event.ts` (create) | util client compartilhado `fireProductEvent` + `refDaUrl` |
| `apps/web/lib/analytics/fire-product-event.test.ts` (create) | jsdom, `fetch` mockado |
| `apps/web/app/landing/landing-product.ts` (modify) | vira wrapper fino sobre o util, encaminha `originRef` |
| `apps/web/middleware.ts` (create) | `?ref=` válido em `/` → cookie `albora_ref` |
| `apps/web/middleware.test.ts` (create) | `NextRequest` → `Set-Cookie` |
| `apps/web/features/public-event/data/get-public-event-page.ts` (modify) | carrega `refToken`; `ctaHref = /?ref=<token>` |
| `apps/web/features/public-event/data/get-public-event-page.test.ts` (create/modify) | loader com `withEvent`/`refDoEvento` mockados |
| `apps/web/features/my-photos/lib/compartilhar-link.ts` (create) | `navigator.share({url})` com fallback clipboard |
| `apps/web/features/my-photos/lib/compartilhar-link.test.ts` (create) | jsdom, `navigator` mockado |
| `apps/web/features/my-photos/components/client/album-footer-cta.tsx` (create) | botão "Compartilhar álbum" + link "Crie o álbum da sua festa" |
| `apps/web/features/my-photos/components/client/album-footer-cta.test.tsx` (create) | jsdom |
| `apps/web/features/my-photos/components/client/my-photos-page.tsx` (modify) | renderiza `AlbumFooterCta` após `RetrySection` |
| `docs/superpowers/handoffs/2026-09-05-admin-events-origin-ref.md` (create) | patch para o dono do admin |
| `docs/product/congelamento-de-features.md` (modify) | seção "Exceção: loop viral" |
| `docs/architecture.md` (modify) | inbound de atribuição |
| `apps/web/e2e/specs/viral-ref.spec.ts` (create) | E2E cookie + `originRef` no beacon |

---

### Task 1: `origin_ref` no sink + validador de ref + migration 0059

**Files:**
- Create: `packages/core/src/ref-token.ts`
- Modify: `packages/core/src/index.ts` (adicionar `export * from "./ref-token";`)
- Modify: `packages/db/src/share-attribution.ts` (após `const TAMANHO_REF = 24;`, re-export)
- Modify: `packages/db/src/analytics.ts:9-54`
- Create: `packages/db/src/analytics.test.ts`
- Create: `packages/db/migrations/0059_analytics_guest_events.sql`

**Interfaces:**
- Produces: `export const REF_TOKEN_RE: RegExp` e `export function isRefToken(v: unknown): v is string` em `@albora/core` (definição) e re-exportados por `@albora/db`. Módulos client e edge importam de `@albora/core` — `@albora/db` arrasta `pg`.
- Produces: `recordProductEvent(pool, name, opts?: { anonId?: string|null; packHint?: string|null; originRef?: string|null })`.
- Produces: `ProductEventName` inclui `"guest_cta_criar_click" | "guest_share_album"`.

- [ ] **Step 1: Escrever o teste que falha (validador + origin_ref)**

Criar `packages/db/src/analytics.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { isProductEventName, recordProductEvent } from "./analytics";
import { isRefToken, REF_TOKEN_RE } from "./share-attribution";

function poolFalso() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  return { pool: { query } as unknown as Pool, query };
}

describe("REF_TOKEN_RE / isRefToken", () => {
  it("aceita exatamente 24 chars alfanuméricos", () => {
    expect(isRefToken("a".repeat(24))).toBe(true);
    expect(REF_TOKEN_RE.test("Ab9".repeat(8))).toBe(true);
  });
  it("rejeita tamanho errado, símbolos e não-string", () => {
    expect(isRefToken("a".repeat(23))).toBe(false);
    expect(isRefToken("a".repeat(25))).toBe(false);
    expect(isRefToken("a".repeat(23) + "-")).toBe(false);
    expect(isRefToken(null)).toBe(false);
    expect(isRefToken(42)).toBe(false);
  });
});

describe("recordProductEvent", () => {
  it("grava origin_ref quando informado", async () => {
    const { pool, query } = poolFalso();
    await recordProductEvent(pool, "landing_cta", { anonId: "anon", packHint: "casamento", originRef: "x".repeat(24) });
    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toMatch(/origin_ref/);
    expect(params).toEqual(["landing_cta", "anon", "casamento", "x".repeat(24)]);
  });
  it("origin_ref é null por padrão", async () => {
    const { pool, query } = poolFalso();
    await recordProductEvent(pool, "landing_view");
    expect(query.mock.calls[0]![1]).toEqual(["landing_view", null, null, null]);
  });
  it("aceita os nomes guest_*", () => {
    expect(isProductEventName("guest_cta_criar_click")).toBe(true);
    expect(isProductEventName("guest_share_album")).toBe(true);
    expect(isProductEventName("guest.qualquer")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/analytics.test.ts`
Expected: FAIL — `isRefToken`/`REF_TOKEN_RE` não exportados; params têm 3 itens; `guest_*` não reconhecidos.

- [ ] **Step 3: Implementar o validador em `@albora/core`**

Criar `packages/core/src/ref-token.ts`:

```ts
/**
 * Formato público do ref de compartilhamento: exatamente 24 chars [A-Za-z0-9]
 * (o alfabeto de 62 e o tamanho vivem em `@albora/db` share-attribution, que
 * gera o token). Puro e sem dependência: vale em client, edge e server.
 */
export const REF_TOKEN_RE = /^[A-Za-z0-9]{24}$/;

export function isRefToken(v: unknown): v is string {
  return typeof v === "string" && REF_TOKEN_RE.test(v);
}
```

Em `packages/core/src/index.ts`, adicionar `export * from "./ref-token";`.

Em `packages/db/src/share-attribution.ts`, logo após `const TAMANHO_REF = 24;`:

```ts
export { REF_TOKEN_RE, isRefToken } from "@albora/core";
```

Se `@albora/db` ainda não depender de `@albora/core` no `package.json`, adicionar `"@albora/core": "workspace:*"` e rodar `pnpm install --offline` (ou `pnpm install`). Verificar em `packages/db/src/index.ts` que `share-attribution` é exportado (`export *` ou nominal com os dois nomes).

- [ ] **Step 4: Implementar `origin_ref` e os nomes novos**

Em `packages/db/src/analytics.ts`, substituir o array por:

```ts
export const PRODUCT_EVENT_NAMES = [
  "landing_view",
  "landing_scroll_50",
  "landing_demo",
  "landing_cta",
  "landing_veteran_cta",
  "account_created",
  "event_created",
  "qr_downloaded",
  "checkout_started",
  "checkout_paid",
  "guest_cta_criar_click",
  "guest_share_album",
] as const;
```

E substituir `recordProductEvent` por:

```ts
export async function recordProductEvent(
  pool: Pool,
  name: ProductEventName,
  opts?: { anonId?: string | null; packHint?: string | null; originRef?: string | null },
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO product_events (name, anon_id, pack_hint, origin_ref) VALUES ($1, $2, $3, $4)`,
      [name, opts?.anonId ?? null, opts?.packHint ?? null, opts?.originRef ?? null],
    );
  } catch (e) {
    console.warn("product_event.falhou", { name, err: String(e) });
  }
}
```

- [ ] **Step 5: Migration 0059 (CHECK recriado, padrão da 0052)**

Criar `packages/db/migrations/0059_analytics_guest_events.sql`:

```sql
-- 0059 — eventos analytics do loop viral (convidado → anfitrião)

ALTER TABLE product_events DROP CONSTRAINT IF EXISTS product_events_name_check;

ALTER TABLE product_events ADD CONSTRAINT product_events_name_check
  CHECK (name IN (
    'landing_view',
    'landing_scroll_50',
    'landing_demo',
    'landing_cta',
    'landing_veteran_cta',
    'account_created',
    'event_created',
    'qr_downloaded',
    'checkout_started',
    'checkout_paid',
    'guest_cta_criar_click',
    'guest_share_album'
  ));
```

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/analytics.test.ts packages/db/src/share-attribution.test.ts`
Expected: PASS (todos). O `share-attribution.test.ts` existente continua verde.

Run (migration aplica sem erro num banco real): `pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/share-attribution.test.ts` — `prepararBanco()` roda todas as migrations, incluindo a 0059.

- [ ] **Step 7: Typecheck + guards + commit**

Run: `pnpm typecheck && node tools/guards/isolamento.mjs && node tools/guards/sessao.mjs`
Expected: limpo.

```bash
git add packages/core/src/ref-token.ts packages/core/src/index.ts packages/db/src/share-attribution.ts packages/db/src/analytics.ts packages/db/src/analytics.test.ts packages/db/migrations/0059_analytics_guest_events.sql packages/db/package.json pnpm-lock.yaml
git commit -m "feat(analytics): grava origin_ref e expõe validador de ref token

recordProductEvent passa a escrever product_events.origin_ref (coluna da
0039, até aqui nunca preenchida). REF_TOKEN_RE/isRefToken viram a fonte
única do formato do ref. Enum e CHECK ganham guest_cta_criar_click e
guest_share_album (migration 0059).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Rota `/api/analytics/product` aceita `originRef`

**Files:**
- Modify: `apps/web/app/api/analytics/product/route.ts:8,27-29`
- Create: `apps/web/app/api/analytics/product/route.test.ts`

**Interfaces:**
- Consumes: `isRefToken`, `recordProductEvent` (Task 1) de `@albora/db`.
- Produces: body `{ name, anonId?, packHint?, originRef? }`; `originRef` inválido vira `null` (nunca 4xx — best effort).

- [ ] **Step 1: Teste que falha**

Criar `apps/web/app/api/analytics/product/route.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const { poolQuery } = vi.hoisted(() => ({ poolQuery: vi.fn().mockResolvedValue({ rows: [] }) }));
vi.mock("@/lib/db", () => ({ getPool: () => ({ query: poolQuery }) }));

const { POST } = await import("./route");

function req(body: unknown) {
  return new Request("https://exemplo.test/api/analytics/product", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/product — originRef", () => {
  beforeEach(() => poolQuery.mockClear());

  it("grava originRef válido", async () => {
    const ref = "r".repeat(24);
    const res = await POST(req({ name: "landing_cta", anonId: "a1", packHint: "casamento", originRef: ref }));
    expect(res.status).toBe(200);
    const params = poolQuery.mock.calls[0]![1] as unknown[];
    expect(params[3]).toBe(ref);
  });

  it("originRef inválido vira null, sem rejeitar", async () => {
    const res = await POST(req({ name: "landing_view", originRef: "curto" }));
    expect(res.status).toBe(200);
    expect((poolQuery.mock.calls[0]![1] as unknown[])[3]).toBeNull();
  });

  it("aceita evento guest_* ", async () => {
    const res = await POST(req({ name: "guest_share_album", originRef: "g".repeat(24) }));
    expect(res.status).toBe(200);
    expect((poolQuery.mock.calls[0]![1] as unknown[])[0]).toBe("guest_share_album");
  });

  it("nome inválido continua 422", async () => {
    const res = await POST(req({ name: "guest.qualquer" }));
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm exec vitest run apps/web/app/api/analytics/product/route.test.ts`
Expected: FAIL — `params[3]` é `undefined` (rota não passa `originRef`).

- [ ] **Step 3: Implementar**

Em `route.ts`, alterar o tipo e o handler:

```ts
import { isProductEventName, isRefToken, recordProductEvent } from "@albora/db";
```

```ts
type Body = { name?: unknown; anonId?: unknown; packHint?: unknown; originRef?: unknown };
```

Após o cálculo de `packHint`:

```ts
  const originRef = isRefToken(parsed.data.originRef) ? parsed.data.originRef : null;

  await recordProductEvent(getPool(), parsed.data.name, { anonId, packHint, originRef });
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm exec vitest run apps/web/app/api/analytics/product/route.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/analytics/product/route.ts apps/web/app/api/analytics/product/route.test.ts
git commit -m "feat(analytics): rota product aceita originRef validado

Ref inválido degrada para null — a rota é best effort e nunca rejeita por
atribuição ruim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Util client `fireProductEvent` + landing envia `originRef` da URL

**Files:**
- Create: `apps/web/lib/analytics/fire-product-event.ts`
- Create: `apps/web/lib/analytics/fire-product-event.test.ts`
- Modify: `apps/web/app/landing/landing-product.ts` (arquivo inteiro)

**Interfaces:**
- Produces: `fireProductEvent(name: ProductEventName, opts?: { packHint?: string | null; originRef?: string | null }): void` e `refDaUrl(search?: string): string | null` em `@/lib/analytics/fire-product-event`.
- Produces: `fireLandingProduct(name: LandingProductName, packHint?: string)` mantém a assinatura e passa a encaminhar `originRef: refDaUrl()`.

- [ ] **Step 1: Teste que falha**

Criar `apps/web/lib/analytics/fire-product-event.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireProductEvent, refDaUrl } from "./fire-product-event";

describe("refDaUrl", () => {
  it("extrai ref válido da query", () => {
    expect(refDaUrl(`?ref=${"q".repeat(24)}&x=1`)).toBe("q".repeat(24));
  });
  it("ignora ref inválido ou ausente", () => {
    expect(refDaUrl("?ref=abc")).toBeNull();
    expect(refDaUrl("?x=1")).toBeNull();
    expect(refDaUrl("")).toBeNull();
  });
});

describe("fireProductEvent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTa name, anonId, packHint e originRef", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    fireProductEvent("guest_share_album", { packHint: "casamento", originRef: "z".repeat(24) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/analytics/product");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ name: "guest_share_album", packHint: "casamento", originRef: "z".repeat(24) });
    expect(typeof body.anonId).toBe("string");
  });

  it("originRef e packHint são null quando omitidos", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    fireProductEvent("guest_cta_criar_click");
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.packHint).toBeNull();
    expect(body.originRef).toBeNull();
  });

  it("falha de rede é engolida", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => fireProductEvent("landing_view")).not.toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm exec vitest run apps/web/lib/analytics/fire-product-event.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o util**

Criar `apps/web/lib/analytics/fire-product-event.ts`:

```ts
"use client";

import { isRefToken } from "@albora/core";
import type { ProductEventName } from "@albora/db";

function anonId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `a${Date.now()}`;
}

/** Lê `?ref=` da query atual (ou da string dada). Só devolve ref no formato válido. */
export function refDaUrl(search: string = typeof window !== "undefined" ? window.location.search : ""): string | null {
  const ref = new URLSearchParams(search).get("ref");
  return isRefToken(ref) ? ref : null;
}

export function fireProductEvent(
  name: ProductEventName,
  opts?: { packHint?: string | null; originRef?: string | null },
): void {
  void fetch("/api/analytics/product", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      anonId: anonId(),
      packHint: opts?.packHint ?? null,
      originRef: opts?.originRef ?? null,
    }),
  }).catch(() => {});
}
```

`isRefToken` vem de `@albora/core` (puro). `ProductEventName` é só tipo — `import type` é apagado na compilação e não arrasta `pg`. Confirmar que `apps/web/package.json` já depende de `@albora/core`; se não, adicionar `"@albora/core": "workspace:*"`.

- [ ] **Step 4: Landing vira wrapper**

Substituir o conteúdo de `apps/web/app/landing/landing-product.ts` por:

```ts
"use client";

import { fireProductEvent, refDaUrl } from "@/lib/analytics/fire-product-event";

export type LandingProductName =
  | "landing_view"
  | "landing_cta"
  | "landing_veteran_cta"
  | "landing_scroll_50"
  | "landing_demo";

/** A landing encaminha o `?ref=` da URL: quem chegou por um convidado é atribuído já no primeiro evento. */
export function fireLandingProduct(name: LandingProductName, packHint?: string) {
  fireProductEvent(name, { packHint: packHint ?? null, originRef: refDaUrl() });
}
```

- [ ] **Step 5: Rodar tudo que toca landing e ver passar**

Run: `pnpm exec vitest run apps/web/lib/analytics apps/web/app/landing`
Expected: PASS (novos + `first-photo-demo.test.tsx` 8/8 intactos).

- [ ] **Step 6: Typecheck + guards + commit**

Run: `pnpm typecheck && node tools/guards/tokens.mjs && node tools/guards/dominio.mjs && node tools/guards/sessao.mjs`

```bash
git add apps/web/lib/analytics/fire-product-event.ts apps/web/lib/analytics/fire-product-event.test.ts apps/web/app/landing/landing-product.ts
git commit -m "feat(analytics): util compartilhado fireProductEvent; landing envia originRef da URL

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Middleware — `?ref=` em `/` vira cookie `albora_ref`

**Files:**
- Create: `apps/web/lib/analytics/ref-cookie.ts`
- Create: `apps/web/middleware.ts`
- Create: `apps/web/middleware.test.ts`

**Interfaces:**
- Consumes: `isRefToken` de `@albora/core` (Task 1).
- Produces: `export const COOKIE_REF = "albora_ref"` em `@/lib/analytics/ref-cookie` — o handoff do admin (Task 7) importa daqui, não do middleware.
- Produces: cookie `albora_ref=<token>` (httpOnly, lax, 1800s, path `/`, secure em produção) em respostas de `/` e `/15-anos` quando `?ref=` é válido. Lido depois pelo handoff do admin (Task 7).

- [ ] **Step 1: Teste que falha**

Criar `apps/web/middleware.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config } from "./middleware";

const REF = "m".repeat(24);

describe("middleware albora_ref", () => {
  it("ref válido em / seta cookie httpOnly de 30 min", () => {
    const res = middleware(new NextRequest(`https://albora.test/?ref=${REF}`));
    const cookie = res.cookies.get("albora_ref");
    expect(cookie?.value).toBe(REF);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(1800);
  });

  it("ref inválido não seta cookie", () => {
    const res = middleware(new NextRequest("https://albora.test/?ref=abc"));
    expect(res.cookies.get("albora_ref")).toBeUndefined();
  });

  it("sem ref não seta cookie", () => {
    const res = middleware(new NextRequest("https://albora.test/"));
    expect(res.cookies.get("albora_ref")).toBeUndefined();
  });

  it("matcher cobre só as landings", () => {
    expect(config.matcher).toEqual(["/", "/15-anos"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm exec vitest run apps/web/middleware.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `apps/web/lib/analytics/ref-cookie.ts`:

```ts
/** Nome do cookie que carrega o ref de atribuição da landing até a criação do evento. */
export const COOKIE_REF = "albora_ref";
```

Criar `apps/web/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { isRefToken } from "@albora/core";
import { COOKIE_REF } from "@/lib/analytics/ref-cookie";

const TRINTA_MINUTOS = 30 * 60;

/**
 * O único trabalho deste middleware: um convidado que chega à landing por
 * `/?ref=<token>` deixa o ref num cookie httpOnly, que o handler de criação
 * de evento lê para atribuir a origem. Rótulo opaco — nunca event_id nem PII.
 */
export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();
  const ref = req.nextUrl.searchParams.get("ref");
  if (isRefToken(ref)) {
    res.cookies.set(COOKIE_REF, ref, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TRINTA_MINUTOS,
    });
  }
  return res;
}

export const config = { matcher: ["/", "/15-anos"] };
```

`isRefToken` de `@albora/core` é puro — seguro no runtime edge. Nunca importar `@albora/db` aqui (arrasta `pg`).

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm exec vitest run apps/web/middleware.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Confirmar que o dev server aceita o middleware**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && cd apps/web && timeout 60 pnpm exec next build --experimental-build-mode compile 2>&1 | tail -5` — se travar (conhecido: `next build` pode pendurar neste ambiente), pular e confiar em `pnpm typecheck` + no E2E da Task 8.

- [ ] **Step 6: Typecheck + guards + commit**

Run: `pnpm typecheck && node tools/guards/sessao.mjs && node tools/guards/isolamento.mjs`

```bash
git add apps/web/lib/analytics/ref-cookie.ts apps/web/middleware.ts apps/web/middleware.test.ts
git commit -m "feat(atribuicao): middleware grava cookie albora_ref a partir de ?ref= na landing

Cookie httpOnly de 30 min, só com ref no formato válido. Inbound do loop
viral: quem chegou por um convidado carrega a origem até criar o evento.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Álbum público `/p/[slug]` — CTA aponta para `/?ref=<token>`

**Files:**
- Modify: `apps/web/features/public-event/data/get-public-event-page.ts:39-43,85`
- Create or Modify: `apps/web/features/public-event/data/get-public-event-page.test.ts`

**Interfaces:**
- Consumes: `withEvent`, `refDoEvento` de `@albora/db` (já usados em `get-my-photos-page.ts`).
- Produces: `PublicEventPageData.ctaHref` = `/?ref=<token>` quando há ref; `/` caso contrário. `PublicEventView` não muda (recebe `ctaHref` como hoje).

- [ ] **Step 1: Ver o teste existente**

Run: `ls apps/web/features/public-event/data/*.test.ts 2>/dev/null; grep -n "ctaHref\|CTA_MONTAR" apps/web/features/public-event/data/*.test.ts 2>/dev/null`
Se existir teste do loader, adicionar os casos abaixo a ele (respeitando os mocks que já usa). Se não existir, criar o arquivo como abaixo — ajustando os mocks às dependências reais que `getPublicEventPage` importa (ler o topo do arquivo: quais funções de `@albora/db` e `@/lib/db` ele usa e mockar todas com retornos mínimos para o evento existir).

- [ ] **Step 2: Teste que falha**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  withEvent: vi.fn(),
  refDoEvento: vi.fn(),
}));
vi.mock("@albora/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@albora/db")>();
  return { ...actual, withEvent: db.withEvent, refDoEvento: db.refDoEvento };
});
vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { getPublicEventPage, CTA_LANDING } = await import("./get-public-event-page");

// Os mocks das demais leituras (evento por slug, vitrine, totais) devem seguir
// o que o loader importa — ver topo de get-public-event-page.ts e mockar cada
// função para devolver um evento mínimo com eventoId "e1".

describe("getPublicEventPage — ctaHref com ref", () => {
  beforeEach(() => {
    db.withEvent.mockImplementation(async (_pool: unknown, _id: string, fn: (c: unknown) => Promise<unknown>) => fn({}));
  });

  it("com ref, CTA aponta para a landing com ?ref=", async () => {
    db.refDoEvento.mockResolvedValue("p".repeat(24));
    const dados = await getPublicEventPage("festa-demo");
    expect(dados?.ctaHref).toBe(`/?ref=${"p".repeat(24)}`);
  });

  it("sem ref, CTA aponta para a landing pura", async () => {
    db.refDoEvento.mockResolvedValue(null);
    const dados = await getPublicEventPage("festa-demo");
    expect(dados?.ctaHref).toBe(CTA_LANDING);
  });

  it("falha ao ler ref não derruba a página", async () => {
    db.refDoEvento.mockRejectedValue(new Error("rls"));
    const dados = await getPublicEventPage("festa-demo");
    expect(dados?.ctaHref).toBe(CTA_LANDING);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm exec vitest run apps/web/features/public-event/data/get-public-event-page.test.ts`
Expected: FAIL — `CTA_LANDING` não existe; `ctaHref` é `/admin/new?plano=free`.

- [ ] **Step 4: Implementar**

Em `get-public-event-page.ts`:

```ts
import { refDoEvento, withEvent } from "@albora/db";
import { getPool } from "@/lib/db";
```

Substituir a constante:

```ts
/** Todo CTA viral cai na landing (não direto no admin): quem chegou por um convidado vê o produto antes do sign-in, e o middleware grava o ref. */
export const CTA_LANDING = "/";

function ctaComRef(refToken: string | null): string {
  return refToken ? `${CTA_LANDING}?ref=${encodeURIComponent(refToken)}` : CTA_LANDING;
}
```

Dentro de `getPublicEventPage`, depois de resolver o evento (variável com `eventoId`), antes de montar o retorno:

```ts
  const refToken = await withEvent(getPool(), evento.eventoId, (c) => refDoEvento(c, evento.eventoId)).catch(() => null);
```

E no retorno: `ctaHref: ctaComRef(refToken),`.

Remover `CTA_MONTAR_O_SEU` se nenhum outro arquivo o importa (`grep -rn CTA_MONTAR_O_SEU apps/web`). Se algo importar, manter exportado apontando para `CTA_LANDING`.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm exec vitest run apps/web/features/public-event`
Expected: PASS (novos + existentes).

- [ ] **Step 6: Typecheck + guards + commit**

Run: `pnpm typecheck && node tools/guards/dominio.mjs && node tools/guards/packs.mjs`

```bash
git add apps/web/features/public-event/data/get-public-event-page.ts apps/web/features/public-event/data/get-public-event-page.test.ts
git commit -m "feat(public-event): CTA do álbum público carrega ref do evento para a landing

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Álbum do convidado — "Compartilhar álbum" + "Crie o álbum da sua festa"

**Files:**
- Create: `apps/web/features/my-photos/lib/compartilhar-link.ts`
- Create: `apps/web/features/my-photos/lib/compartilhar-link.test.ts`
- Create: `apps/web/features/my-photos/components/client/album-footer-cta.tsx`
- Create: `apps/web/features/my-photos/components/client/album-footer-cta.test.tsx`
- Modify: `apps/web/features/my-photos/components/client/my-photos-page.tsx` (~linha 314, após `RetrySection`, antes de `<ThemeSetting />`)

**Interfaces:**
- Consumes: `fireProductEvent` (Task 3); `shareWasAborted` de `@/lib/share-or-download` (existente).
- Produces: `compartilharLink(url: string): Promise<"shared" | "copied" | "cancelled">`; `AlbumFooterCta({ slug, refToken }: { slug: string; refToken: string | null })`.

- [ ] **Step 1: Teste do util que falha**

Criar `apps/web/features/my-photos/lib/compartilhar-link.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { compartilharLink } from "./compartilhar-link";

describe("compartilharLink", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa navigator.share quando existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ url: "https://x/p/festa" });
  });

  it("cancelamento do share devolve cancelled", async () => {
    const abort = Object.assign(new Error("abort"), { name: "AbortError" });
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(abort) });
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("cancelled");
  });

  it("sem share, copia para o clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://x/p/festa");
  });

  it("sem share nem clipboard devolve cancelled", async () => {
    vi.stubGlobal("navigator", {});
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("cancelled");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm exec vitest run apps/web/features/my-photos/lib/compartilhar-link.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o util**

Criar `apps/web/features/my-photos/lib/compartilhar-link.ts`:

```ts
import { shareWasAborted } from "@/lib/share-or-download";

export type ResultadoLink = "shared" | "copied" | "cancelled";

/** Compartilha uma URL: share sheet nativo quando há; senão copia o link. Nunca lança por cancelamento. */
export async function compartilharLink(url: string): Promise<ResultadoLink> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ url });
      return "shared";
    } catch (error) {
      if (shareWasAborted(error)) return "cancelled";
      throw error;
    }
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(url);
    return "copied";
  }
  return "cancelled";
}
```

Confirmar a assinatura de `shareWasAborted` em `apps/web/lib/share-or-download.ts` (deve aceitar `unknown` e testar `name === "AbortError"`). Se testar outra coisa, ajustar o teste do cancelamento ao que ela reconhece.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm exec vitest run apps/web/features/my-photos/lib/compartilhar-link.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Teste do componente que falha**

Criar `apps/web/features/my-photos/components/client/album-footer-cta.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({ fireProductEvent: vi.fn() }));
vi.mock("@/lib/analytics/fire-product-event", () => analytics);
const link = vi.hoisted(() => ({ compartilharLink: vi.fn().mockResolvedValue("shared") }));
vi.mock("../../lib/compartilhar-link", () => link);

import { AlbumFooterCta } from "./album-footer-cta";

const REF = "f".repeat(24);

describe("AlbumFooterCta", () => {
  afterEach(() => vi.clearAllMocks());

  it("link 'crie o seu' aponta para a landing com ref e registra o clique", () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={REF} />);
    const a = screen.getByRole("link", { name: /álbum da sua festa/i });
    expect(a).toHaveAttribute("href", `/?ref=${REF}`);
    fireEvent.click(a);
    expect(analytics.fireProductEvent).toHaveBeenCalledWith("guest_cta_criar_click", { originRef: REF });
  });

  it("sem ref, link vai para a landing pura", () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={null} />);
    expect(screen.getByRole("link", { name: /álbum da sua festa/i })).toHaveAttribute("href", "/");
  });

  it("botão compartilhar chama compartilharLink com /p/<slug> e registra", async () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={REF} />);
    fireEvent.click(screen.getByRole("button", { name: /compartilhar álbum/i }));
    await waitFor(() => expect(link.compartilharLink).toHaveBeenCalledWith(expect.stringMatching(/\/p\/festa-demo$/)));
    expect(analytics.fireProductEvent).toHaveBeenCalledWith("guest_share_album", { originRef: REF });
  });

  it("botão tem alvo de toque ≥44px (classe min-h-11)", () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={REF} />);
    expect(screen.getByRole("button", { name: /compartilhar álbum/i }).className).toMatch(/min-h-11/);
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `pnpm exec vitest run apps/web/features/my-photos/components/client/album-footer-cta.test.tsx`
Expected: FAIL — componente não existe.

- [ ] **Step 7: Implementar o componente**

Criar `apps/web/features/my-photos/components/client/album-footer-cta.tsx`:

```tsx
"use client";

import { useState } from "react";
import { fireProductEvent } from "@/lib/analytics/fire-product-event";
import { compartilharLink } from "../../lib/compartilhar-link";

type Props = { slug: string; refToken: string | null };

/**
 * Rodapé do álbum do convidado: o ponto onde ele já viu o valor inteiro.
 * Compartilhar leva o álbum público (que carrega o ref no próprio CTA);
 * "crie o seu" leva à landing com o ref — o loop convidado → anfitrião.
 */
export function AlbumFooterCta({ slug, refToken }: Props) {
  const [estado, setEstado] = useState<"idle" | "copied">("idle");
  const hrefCriar = refToken ? `/?ref=${encodeURIComponent(refToken)}` : "/";
  const opts = refToken ? { originRef: refToken } : {};

  async function compartilhar() {
    fireProductEvent("guest_share_album", opts);
    const url = `${window.location.origin}/p/${encodeURIComponent(slug)}`;
    const resultado = await compartilharLink(url);
    if (resultado === "copied") {
      setEstado("copied");
      setTimeout(() => setEstado("idle"), 2000);
    }
  }

  return (
    <section className="mt-10 flex flex-col items-center gap-4 border-t border-linha pt-8 text-center">
      <button
        type="button"
        onClick={compartilhar}
        className="min-h-11 rounded-pilula bg-superficie-alta px-6 font-medium text-ink transition-transform duration-instantaneo ease-mola active:scale-[0.97]"
      >
        {estado === "copied" ? "Link copiado" : "Compartilhar álbum"}
      </button>
      <p className="tipo-caption m-0 max-w-[32ch] text-ink-2">
        Depois da sua festa você também pode ter um.{" "}
        <a
          href={hrefCriar}
          onClick={() => fireProductEvent("guest_cta_criar_click", opts)}
          className="text-ink underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
        >
          Crie o álbum da sua festa
        </a>
      </p>
    </section>
  );
}
```

Com `exactOptionalPropertyTypes`, `opts` deve ser `{ originRef: string } | {}` — por isso o ternário, e não `{ originRef: refToken }` com `null`.

- [ ] **Step 8: Rodar e ver passar**

Run: `pnpm exec vitest run apps/web/features/my-photos/components/client/album-footer-cta.test.tsx`
Expected: PASS (4).

- [ ] **Step 9: Ligar no `MyPhotosPage`**

Em `my-photos-page.tsx`, importar:

```tsx
import { AlbumFooterCta } from "./album-footer-cta";
```

Após o bloco de `RetrySection` (~linha 314) e antes de `<ThemeSetting />`, dentro de `<GuestMain>`:

```tsx
        <AlbumFooterCta slug={slug} refToken={refToken ?? null} />
```

`slug` e `refToken` já são props do componente — sem plumbing novo.

- [ ] **Step 10: Suíte de my-photos + guards**

Run: `pnpm exec vitest run apps/web/features/my-photos && pnpm typecheck && node tools/guards/tokens.mjs && node tools/guards/dominio.mjs && node tools/guards/packs.mjs`
Expected: PASS; guards limpos (sem hex, sem domínio — "álbum da sua festa" não é vocabulário de evento).

- [ ] **Step 11: Commit**

```bash
git add apps/web/features/my-photos/lib/compartilhar-link.ts apps/web/features/my-photos/lib/compartilhar-link.test.ts apps/web/features/my-photos/components/client/album-footer-cta.tsx apps/web/features/my-photos/components/client/album-footer-cta.test.tsx apps/web/features/my-photos/components/client/my-photos-page.tsx
git commit -m "feat(my-photos): rodapé do álbum com compartilhar e 'crie o álbum da sua festa'

Share leva ao álbum público (cujo CTA já carrega o ref); o link de criar
leva à landing com ref. Ambos registram guest_share_album e
guest_cta_criar_click com originRef.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Handoff para o admin + docs (congelamento, arquitetura)

**Files:**
- Create: `docs/superpowers/handoffs/2026-09-05-admin-events-origin-ref.md`
- Modify: `docs/product/congelamento-de-features.md` (nova seção ao final)
- Modify: `docs/architecture.md` (seção de analytics/atribuição — localizar com `grep -n "product_events\|atribui" docs/architecture.md`)

**Interfaces:**
- Consumes: `COOKIE_REF` de `@/lib/analytics/ref-cookie` (Task 4), `isRefToken` de `@albora/core` (Task 1), `recordProductEvent` com `originRef` (Task 1).
- Produces: um patch legível que o dono do admin aplica em `apps/web/lib/api/handlers/admin-events.ts`.

- [ ] **Step 1: Escrever o handoff**

Criar `docs/superpowers/handoffs/2026-09-05-admin-events-origin-ref.md`:

````markdown
# Handoff — atribuição de origem em `event_created` / `account_created`

**Para:** dono da frente `/admin` (RBAC).
**De:** frente do loop viral (spec `docs/superpowers/specs/2026-09-05-loop-viral-convidado-anfitriao-design.md`, §2.3).
**Por quê:** o middleware grava `albora_ref` quando um convidado chega à landing por `/?ref=`; sem esta leitura no handler de criação, a métrica "eventos criados originados de convidado" nunca fecha.

## Diff proposto — `apps/web/lib/api/handlers/admin-events.ts`

Adicionar aos imports:

```ts
import { cookies } from "next/headers";
import { isRefToken } from "@albora/core";
import { COOKIE_REF } from "@/lib/analytics/ref-cookie";
```

No início do handler que cria o evento (antes do primeiro `recordProductEvent`):

```ts
    const refCookie = (await cookies()).get(COOKIE_REF)?.value;
    const originRef = isRefToken(refCookie) ? refCookie : null;
```

Linha ~184:

```ts
        void recordProductEvent(getPool(), "account_created", { originRef });
```

Linha ~202:

```ts
    void recordProductEvent(getPool(), "event_created", { originRef });
```

## Garantias
- `originRef` é rótulo opaco de 24 chars; nunca `event_id`, nunca PII. Não logar.
- O cookie não é limpo aqui (expira em 30 min). Se quiserem consumo único, é uma linha a mais: `(await cookies()).delete(COOKIE_REF)` — decisão do admin.
- Sem o cookie, comportamento idêntico ao atual (`originRef: null`).

## Verificação sugerida
Teste do handler: mockar `next/headers` `cookies()` devolvendo `{ get: () => ({ value: "a".repeat(24) }) }` e assertar que `recordProductEvent` foi chamado com `{ originRef: "a".repeat(24) }`.
````

- [ ] **Step 2: Documentar a exceção ao congelamento**

Ao final de `docs/product/congelamento-de-features.md`, adicionar:

```markdown
## Exceção: loop viral convidado → anfitrião (2026-09-05)

Decisão do mantenedor em 2026-09-05: construir o loop viral (atribuição inbound, CTAs "crie o seu", compartilhamento do álbum, memórias automáticas) **antes** do casamento #1 ser medido, ciente de que o produto não rodou evento real nem está em produção. Motivo: crescimento/aquisição definido como alavanca primária; cada convidado é um futuro anfitrião. Spec: `docs/superpowers/specs/2026-09-05-loop-viral-convidado-anfitriao-design.md`. O restante do congelamento permanece.
```

- [ ] **Step 3: Arquitetura**

Em `docs/architecture.md`, na seção que descreve `product_events`/analytics (localizar com `grep -n "product_events" docs/architecture.md`), adicionar um parágrafo:

```markdown
**Atribuição inbound do loop viral.** `?ref=<token>` na landing (`/`, `/15-anos`) é convertido pelo `apps/web/middleware.ts` em cookie `albora_ref` (httpOnly, 30 min). O beacon da landing envia `originRef` lido da URL; o handler de criação de evento lê o cookie e grava `product_events.origin_ref` em `account_created`/`event_created`. A reconciliação `origin_ref → evento de origem` usa `eventoDoRef` (BYPASSRLS, auditado) — único caminho que cruza eventos. `product_events` segue sem `event_id`. Todo CTA viral aponta para a landing, nunca direto ao admin.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/handoffs/2026-09-05-admin-events-origin-ref.md docs/product/congelamento-de-features.md docs/architecture.md
git commit -m "docs(loop-viral): handoff do admin para origin_ref, exceção ao congelamento, arquitetura

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: E2E — `/?ref=` seta cookie e o beacon envia `originRef`

**Files:**
- Create: `apps/web/e2e/specs/viral-ref.spec.ts`

**Interfaces:**
- Consumes: middleware (Task 4), `fireLandingProduct` com `originRef` (Task 3).

- [ ] **Step 1: Escrever o spec**

```ts
import { expect, test } from "@playwright/test";

const REF = "e".repeat(24);

test.describe("Loop viral — ref inbound", () => {
  test("ref válido vira cookie albora_ref e o beacon envia originRef", async ({ page, context }) => {
    const beacon = page.waitForRequest(
      (r) => r.url().endsWith("/api/analytics/product") && r.method() === "POST",
    );
    await page.goto(`/?ref=${REF}`);
    const req = await beacon;
    const body = req.postDataJSON() as { name: string; originRef: string | null };
    expect(body.name).toBe("landing_view");
    expect(body.originRef).toBe(REF);

    const cookie = (await context.cookies()).find((c) => c.name === "albora_ref");
    expect(cookie?.value).toBe(REF);
    expect(cookie?.httpOnly).toBe(true);
  });

  test("ref inválido não seta cookie e o beacon envia null", async ({ page, context }) => {
    const beacon = page.waitForRequest(
      (r) => r.url().endsWith("/api/analytics/product") && r.method() === "POST",
    );
    await page.goto("/?ref=abc");
    const body = (await beacon).postDataJSON() as { originRef: string | null };
    expect(body.originRef).toBeNull();
    expect((await context.cookies()).find((c) => c.name === "albora_ref")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec playwright test apps/web/e2e/specs/viral-ref.spec.ts --project=chromium`
Expected: PASS (2). O `webServer` sobe `pnpm dev`; se já houver dev na 3000, é reaproveitado.

Se o dev server não subir neste ambiente, registrar no relatório que o E2E ficou para o CI e não marcar a task como verificada visualmente — os testes unitários das Tasks 3 e 4 cobrem a lógica.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/specs/viral-ref.spec.ts
git commit -m "test(e2e): ref inbound — cookie albora_ref e originRef no beacon da landing

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Métrica — eventos criados originados de convidado (spec §2.4)

**Files:**
- Modify: `packages/db/src/share-attribution.ts` (nova função ao final)
- Modify: `packages/db/src/share-attribution.test.ts` (novo `describe`)

**Interfaces:**
- Consumes: `eventoDoRef(pool, refToken, auditar)` (existente), `comAgregacao` (existente).
- Produces: `resumoAtribuicaoViral(pool: Pool, auditar: (r: { motivo: string; em: Date }) => void): Promise<ResumoAtribuicaoViral>` em `@albora/db`, com `type ResumoAtribuicaoViral = { eventosOriginados: number; porOrigem: { eventoOrigemId: string; criados: number }[] }`. Só agregação; nenhum `event_id` sai para log ou UI de convidado. Consumida no futuro por insights (admin) ou rota ops — fora de P1.

- [ ] **Step 1: Teste que falha**

Ler o topo de `packages/db/src/share-attribution.test.ts` para reusar `prepararBanco`/`semear` e o `auditar` que ele já usa. Acrescentar ao final:

```ts
describe("resumoAtribuicaoViral", () => {
  it("conta event_created por ref e resolve o evento de origem", async () => {
    // dois eventos semeados: A (origem) e B (qualquer)
    const refA = await withEvent(app, dados.a.eventoId, (c) => refDoEvento(c, dados.a.eventoId));
    expect(refA).not.toBeNull();

    // três criações atribuídas a A, uma sem atribuição, uma com ref desconhecido
    for (let i = 0; i < 3; i++) await recordProductEvent(admin, "event_created", { originRef: refA });
    await recordProductEvent(admin, "event_created");
    await recordProductEvent(admin, "event_created", { originRef: "x".repeat(24) });

    const auditoria: { motivo: string; em: Date }[] = [];
    const resumo = await resumoAtribuicaoViral(admin, (r) => auditoria.push(r));

    expect(resumo.eventosOriginados).toBe(3);
    expect(resumo.porOrigem).toEqual([{ eventoOrigemId: dados.a.eventoId, criados: 3 }]);
    expect(auditoria.length).toBeGreaterThan(0);
  });
});
```

Importar `recordProductEvent` de `./analytics`, `withEvent` de onde o arquivo já importa (ou `./event`), e `resumoAtribuicaoViral` de `./share-attribution`. `admin`/`app`/`dados` são os que o `beforeAll` do arquivo já prepara — ajustar os nomes aos existentes.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/share-attribution.test.ts`
Expected: FAIL — `resumoAtribuicaoViral` não existe.

- [ ] **Step 3: Implementar**

Ao final de `packages/db/src/share-attribution.ts`:

```ts
export type ResumoAtribuicaoViral = {
  eventosOriginados: number;
  porOrigem: { eventoOrigemId: string; criados: number }[];
};

/**
 * Quantos eventos foram criados a partir de um ref de convidado, e de qual
 * evento cada ref veio. `product_events` é anônimo (sem RLS); a resolução
 * ref → evento de origem cruza eventos e por isso passa por `comAgregacao`
 * (BYPASSRLS, auditado) — o único caminho permitido para isso.
 */
export async function resumoAtribuicaoViral(
  pool: Pool,
  auditar: (registro: { motivo: string; em: Date }) => void,
): Promise<ResumoAtribuicaoViral> {
  const { rows } = await pool.query<{ origin_ref: string; criados: string }>(
    `SELECT origin_ref, count(*)::text AS criados
       FROM product_events
      WHERE name = 'event_created' AND origin_ref IS NOT NULL
      GROUP BY origin_ref`,
  );

  const porOrigem: ResumoAtribuicaoViral["porOrigem"] = [];
  let eventosOriginados = 0;
  for (const linha of rows) {
    const eventoOrigemId = await eventoDoRef(pool, linha.origin_ref, auditar);
    if (!eventoOrigemId) continue;
    const criados = Number(linha.criados);
    eventosOriginados += criados;
    porOrigem.push({ eventoOrigemId, criados });
  }
  porOrigem.sort((a, b) => b.criados - a.criados);
  return { eventosOriginados, porOrigem };
}
```

Refs desconhecidos (sem evento de origem) não contam — são ruído, não atribuição.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/share-attribution.test.ts`
Expected: PASS (todos, incluindo os existentes).

- [ ] **Step 5: Typecheck + guards + commit**

Run: `pnpm typecheck && node tools/guards/isolamento.mjs && node tools/guards/sessao.mjs`

```bash
git add packages/db/src/share-attribution.ts packages/db/src/share-attribution.test.ts
git commit -m "feat(atribuicao): resumoAtribuicaoViral — eventos criados originados de convidado

Agregação via eventoDoRef (BYPASSRLS auditado); product_events segue
anônimo. Métrica do loop viral, consumível por insights/ops.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Verificação final de P1 (critério de aceite da spec §8)

- [ ] `pnpm exec vitest run` (raiz) verde; `pnpm test:isolamento` verde (inclui `analytics.test.ts` e a migration 0059 aplicada por `prepararBanco`).
- [ ] 8 guards verdes: `for g in tokens isolamento dominio packs sessao features api-routes nomenclatura; do node tools/guards/$g.mjs; done`.
- [ ] `pnpm typecheck && pnpm lint` limpos.
- [ ] `/?ref=X` → cookie → `product_events.origin_ref = X` em `landing_view`/`landing_cta` (E2E ou unit 3+4).
- [ ] `/p/[slug]` emite `ctaHref = /?ref=<token>`.
- [ ] `guest_cta_criar_click` e `guest_share_album` gravados com `originRef`.
- [ ] Handoff entregue em `docs/superpowers/handoffs/` e comunicado ao dono do admin.
- [ ] Nenhum arquivo sob `apps/web/app/admin`, `apps/web/features/admin` ou `admin-events.ts` no `git diff --stat` do branch.
