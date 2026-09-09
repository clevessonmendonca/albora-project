# Entrega das fotos ao convidado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O convidado que reivindicou (Google ou magic link) recebe, quando o casal libera, um link para uma galeria só das próprias fotos — servidor nunca empacota bytes.

**Architecture:** Quatro camadas (ADR 0016): migrations+repos em `packages/db`, use-cases em `packages/application`, rotas/páginas em `apps/web/app`, e-mail via `sendHostEmail` injetado como porta. Token de entrega opaco assinado (reusa `token.ts`) escopado a UMA sessão-evento. Magic link do convidado nunca toca `accounts`/host session.

**Tech Stack:** TypeScript, Next.js (app router), Postgres (RLS FORCED por evento), pnpm workspaces, vitest (config de isolamento p/ testes de DB), Resend (e-mail, degrada).

**Spec:** `docs/superpowers/specs/2026-09-06-entrega-das-fotos-design.md` · **ADR:** `docs/adr/0019-entrega-das-fotos-ao-convidado.md`

## Global Constraints

- **Node 22** para pnpm/vitest/git: `source ~/.nvm/nvm.sh && nvm use 22` no mesmo shell.
- Testes de DB/application rodam na **`vitest.isolamento.config.ts`** (tem Postgres + alias `@`); os demais na `vitest.config.ts`. Postgres: `docker start albora-pg`.
- **Toda tabela com `event_id` tem RLS FORCED**, política `isolamento_evento` filtrando `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`. `SET LOCAL`, nunca `SET`. Escrita/leitura por `withEvent`.
- **Migrations forward-only.** Próximo número livre: **0070**.
- **Servidor nunca toca bytes de mídia** — só assina URLs (`signGet`), storage serve.
- **IA generativa nunca toca a mídia** (ADR 0007).
- **Convidado nunca vira conta:** nenhum caminho guest referencia `accounts`, `host_sessions`, cookie de host. Blindagem provada por varredura de fonte no teste (padrão do ADR 0018).
- **Nunca logar PII crua** (e-mail mascarado/omitido).
- **E-mail degrada, nunca falha o caminho:** `sendHostEmail` sem `RESEND_API_KEY` retorna `{enviado:false}`; entrega só marca `delivered_at` se `enviado === true`, e re-tenta depois.
- **Commits:** Conventional Commits com escopo; terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Nenhum hex hardcodado** na galeria — tokens do evento (design system Albora).

---

### Task 1: Migration 0070 — tabelas e colunas de entrega

**Files:**
- Create: `packages/db/migrations/0070_entrega_de_fotos.sql`
- Modify: `packages/db/src/isolamento.test.ts` (as duas tabelas novas NÃO entram em `FORA_DA_RLS` — guardam vínculo de evento, não são hash-gates efêmeros; a suíte já varre todas as tabelas com `event_id`, então só precisa passar)
- Test: `packages/db/src/entrega-migration.test.ts`

**Interfaces:**
- Produces: tabelas `delivery_tokens (id, event_id, session_id, token_hash bytea UNIQUE, expires_at, revoked_at, created_at)`, `guest_magic_links (id, event_id, session_id, token_hash bytea UNIQUE, email, expires_at, used_at, created_at)`; colunas `events.delivery_opens_at timestamptz`, `guest_contacts.delivered_at timestamptz`.

- [ ] **Step 1: Write the failing test** — `packages/db/src/entrega-migration.test.ts` usa `prepararBanco()` e afirma: (a) `delivery_tokens` e `guest_magic_links` existem com RLS `relforcerowsecurity=true`; (b) `events.delivery_opens_at` e `guest_contacts.delivered_at` existem e são nulláveis; (c) INSERT em `delivery_tokens` com `app.event_id` de outro evento não enxerga a linha (isolamento). Espelhe o estilo de `guest-contacts-verificado.test.ts`.

- [ ] **Step 2: Run and see it fail** — `pnpm vitest run -c vitest.isolamento.config.ts packages/db/src/entrega-migration.test.ts` → FAIL (relação inexistente).

- [ ] **Step 3: Write the migration**

```sql
-- 0070 — entrega das fotos ao convidado (ADR 0019)
--
-- delivery_tokens: link opaco assinado para a galeria da sessão. Segundo
-- conceito, separado do session_tokens de auth: TTL próprio (dias) e
-- revogável/purgável à parte. guest_magic_links: prova de posse de e-mail
-- pelo convidado, NUNCA toca accounts. delivery_opens_at é o gate do casal;
-- delivered_at fecha a idempotência da entrega.
ALTER TABLE events         ADD COLUMN delivery_opens_at timestamptz;
ALTER TABLE guest_contacts ADD COLUMN delivered_at      timestamptz;

CREATE TABLE delivery_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE delivery_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tokens FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON delivery_tokens
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

CREATE TABLE guest_magic_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  token_hash  bytea NOT NULL UNIQUE,
  -- PII. Mascarada em log sempre, e apagada pela retenção.
  email       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE guest_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_magic_links FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON guest_magic_links
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
```

- [ ] **Step 4: Run and see it pass** — mesmo comando → PASS.
- [ ] **Step 5: Run the full isolation suite** — `pnpm vitest run -c vitest.isolamento.config.ts packages/db/src/isolamento.test.ts` → PASS (as duas tabelas novas passam pela varredura de RLS sem entrar na allowlist).
- [ ] **Step 6: Commit** — `feat(entrega): migration 0070 — delivery_tokens, guest_magic_links, gate e delivered_at`.

---

### Task 2: Repo `delivery-tokens.ts` — mint e resolve

**Files:**
- Create: `packages/db/src/delivery-tokens.ts`
- Modify: `packages/db/src/index.ts` (re-export)
- Test: `packages/db/src/delivery-tokens.test.ts`

**Interfaces:**
- Consumes: `emitirToken`, `assinaturaValida`, `hashDoToken` de `./token`; `withEvent` de `./index`.
- Produces:
  - `issueDeliveryToken(pool: Pool, segredo: string, eventId: string, sessionId: string, expiraEm: Date): Promise<{ token: string }>`
  - `resolveDeliveryToken(pool: Pool, segredo: string, token: string): Promise<{ eventId: string; sessionId: string }>` — lança `ErroTokenDeEntrega` se assinatura inválida, expirado, revogado ou desconhecido.

- [ ] **Step 1: Write the failing test** — roundtrip: `issueDeliveryToken` → `resolveDeliveryToken` devolve o mesmo `{eventId, sessionId}`; token forjado (assinatura) → erro sem tocar o banco; expirado (expiraEm no passado) → erro; revogado (setar `revoked_at`) → erro; token de um evento não resolve com contexto de outro (isolamento). Use `semear(admin)` e `withEvent`.

- [ ] **Step 2: Run and see it fail** — `pnpm vitest run -c vitest.isolamento.config.ts packages/db/src/delivery-tokens.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
import type { Pool } from "pg";
import { withEvent } from "./index";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

export class ErroTokenDeEntrega extends Error {
  constructor() {
    super("token de entrega inválido");
    this.name = "ErroTokenDeEntrega";
  }
}

export async function issueDeliveryToken(
  pool: Pool, segredo: string, eventId: string, sessionId: string, expiraEm: Date,
): Promise<{ token: string }> {
  const { token, hash } = emitirToken(segredo);
  await withEvent(pool, eventId, async (cliente) => {
    await cliente.query(
      `INSERT INTO delivery_tokens (event_id, session_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [eventId, sessionId, hash, expiraEm],
    );
  });
  return { token };
}

export async function resolveDeliveryToken(
  pool: Pool, segredo: string, token: string,
): Promise<{ eventId: string; sessionId: string }> {
  if (!assinaturaValida(segredo, token)) throw new ErroTokenDeEntrega();
  const hash = hashDoToken(token);
  const { rows } = await pool.query<{ event_id: string; session_id: string }>(
    `SELECT event_id, session_id FROM delivery_tokens
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hash],
  );
  if (rows.length === 0) throw new ErroTokenDeEntrega();
  return { eventId: rows[0]!.event_id, sessionId: rows[0]!.session_id };
}
```
> `resolveDeliveryToken` lê fora de `withEvent` de propósito — é a porta de entrada (resolve token → event_id antes de haver contexto), como `resolverSessao`. A consulta é por `token_hash` (UNIQUE global), então não vaza entre eventos: um hash pertence a um evento só.

- [ ] **Step 4: Run and see it pass** — PASS. Re-export em `index.ts`.
- [ ] **Step 5: Commit** — `feat(entrega): repo delivery-tokens (mint/resolve opaco assinado)`.

---

### Task 3: Repo `guest-magic-link.ts` — emit e consume (DB)

**Files:**
- Create: `packages/db/src/guest-magic-link.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/src/guest-magic-link.test.ts`

**Interfaces:**
- Consumes: `emitirToken`, `hashDoToken` de `./token`; `withEvent`.
- Produces:
  - `emitGuestMagicLinkRow(pool, segredo, eventId, sessionId, email, expiraEm): Promise<{ token: string }>`
  - `consumeGuestMagicLink(pool, segredo, token): Promise<{ eventId: string; sessionId: string; email: string } | null>` — single-use (`used_at IS NULL … RETURNING`), null se inválido/expirado/já usado.

- [ ] **Step 1: Write the failing test** — emit→consume devolve `{eventId, sessionId, email}`; segundo consume do mesmo token → `null` (single-use); expirado → `null`; assinatura forjada → `null` sem tocar banco. Afirmar também que a tabela NUNCA foi usada para inserir em `accounts` (contagem antes/depois == igual).

- [ ] **Step 2: Run and see it fail** — FAIL.

- [ ] **Step 3: Implement** — espelhe `host-auth.ts consumirMagicLink`, mas escopo evento+sessão, e `assinaturaValida` antes do banco:

```ts
import type { Pool } from "pg";
import { withEvent } from "./index";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

export async function emitGuestMagicLinkRow(
  pool: Pool, segredo: string, eventId: string, sessionId: string, email: string, expiraEm: Date,
): Promise<{ token: string }> {
  const { token, hash } = emitirToken(segredo);
  await withEvent(pool, eventId, async (cliente) => {
    await cliente.query(
      `INSERT INTO guest_magic_links (event_id, session_id, token_hash, email, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventId, sessionId, hash, email.trim().toLowerCase(), expiraEm],
    );
  });
  return { token };
}

export async function consumeGuestMagicLink(
  pool: Pool, segredo: string, token: string,
): Promise<{ eventId: string; sessionId: string; email: string } | null> {
  if (!assinaturaValida(segredo, token)) return null;
  const hash = hashDoToken(token);
  const { rows } = await pool.query<{ event_id: string; session_id: string; email: string }>(
    `UPDATE guest_magic_links SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING event_id, session_id, email`,
    [hash],
  );
  return rows[0] ?? null;
}
```
> `VALIDADE_GUEST_MAGIC_LINK_MINUTOS = 15` (constante exportada, igual host). O consume é global por `token_hash` (UNIQUE) — porta de entrada, como `session_tokens`.

- [ ] **Step 4: Run and see it pass** — PASS. Re-export.
- [ ] **Step 5: Commit** — `feat(entrega): repo guest-magic-link (emit/consume single-use, nunca accounts)`.

---

### Task 4: `claimGuestPhotosByEmail` aceita `verifiedVia`

**Files:**
- Modify: `packages/application/src/auth/claim-guest-photos-by-email.ts`
- Test: `packages/application/src/auth/claim-guest-photos-by-email.test.ts` (adicionar caso)

**Interfaces:**
- Produces: `ClaimGuestPhotosByEmailInput` ganha `verifiedVia?: "google" | "magic_link"` (default `"google"`). Assinatura pública inalterada p/ chamadas existentes.

- [ ] **Step 1: Write the failing test** — chamar com `verifiedVia: "magic_link"` grava `verified_via = 'magic_link'`; sem o campo continua `'google'` (não quebra o caminho Google).

- [ ] **Step 2: Run and see it fail** — `pnpm vitest run -c vitest.isolamento.config.ts packages/application/src/auth/claim-guest-photos-by-email.test.ts` → FAIL.

- [ ] **Step 3: Implement** — adicionar `verifiedVia = "google"` ao input e usar como parâmetro `$4` no upsert (tanto no VALUES quanto no DO UPDATE), mantendo o `ON CONFLICT (event_id, session_id, channel, value)`.

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): claimGuestPhotosByEmail aceita verifiedVia (google|magic_link)`.

---

### Task 5: Use-case `resolveDeliveries` — gate + destinatários pendentes

**Files:**
- Create: `packages/application/src/entrega/resolve-deliveries.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/src/entrega/resolve-deliveries.test.ts`

**Interfaces:**
- Consumes: `withEvent` de `@albora/db`.
- Produces: `resolveDeliveries(pool: Pool, eventId: string, now?: Date): Promise<{ sessionId: string; email: string }[]>` — `[]` se `delivery_opens_at` NULL ou futuro; senão os `guest_contacts` com `verified_at NOT NULL AND delivered_at IS NULL AND channel='email'`.

- [ ] **Step 1: Write the failing test** — gate fechado (`delivery_opens_at` NULL) → `[]`; gate no futuro → `[]`; gate no passado com 2 contatos verificados não-entregues → os 2; contato não-verificado ou já entregue → excluído. Semear via `admin`/`withEvent`.

- [ ] **Step 2: Run and see it fail** — FAIL.

- [ ] **Step 3: Implement**

```ts
import type { Pool } from "pg";
import { withEvent } from "@albora/db";

export async function resolveDeliveries(
  pool: Pool, eventId: string, now: Date = new Date(),
): Promise<{ sessionId: string; email: string }[]> {
  return withEvent(pool, eventId, async (cliente) => {
    const { rows: ev } = await cliente.query<{ delivery_opens_at: Date | null }>(
      "SELECT delivery_opens_at FROM events WHERE id = $1", [eventId],
    );
    const abre = ev[0]?.delivery_opens_at ?? null;
    if (!abre || abre.getTime() > now.getTime()) return [];

    const { rows } = await cliente.query<{ session_id: string; value: string }>(
      `SELECT session_id, value FROM guest_contacts
        WHERE event_id = $1 AND channel = 'email'
          AND verified_at IS NOT NULL AND delivered_at IS NULL`,
      [eventId],
    );
    return rows.map((r) => ({ sessionId: r.session_id, email: r.value }));
  });
}
```

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): resolveDeliveries (gate do casal + pendentes verificados)`.

---

### Task 6: Use-cases `sendGuestDelivery` + `runDeliveryForEvent`

**Files:**
- Create: `packages/application/src/entrega/send-delivery.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/src/entrega/send-delivery.test.ts`

**Interfaces:**
- Consumes: `issueDeliveryToken` de `@albora/db`; `resolveDeliveries` (Task 5); `withEvent`.
- Produces:
  - `type EntregaDeps = { pool: Pool; segredo: string; baseUrl: string; ttlDias?: number; sendEmail: (m: { to: string; subject: string; text: string }) => Promise<{ enviado: boolean }> }`
  - `sendGuestDelivery(deps, { eventId, sessionId, email }): Promise<{ enviado: boolean }>` — mint token, monta `\${baseUrl}/g/\${token}`, `sendEmail`, e **só** `UPDATE guest_contacts SET delivered_at = now()` (via `withEvent`) se `enviado`. Nunca loga o e-mail cru.
  - `runDeliveryForEvent(deps, eventId): Promise<{ enviados: number; pendentes: number }>` — `resolveDeliveries` → para cada, `sendGuestDelivery` num try/catch por destinatário (um erro não aborta os outros).

- [ ] **Step 1: Write the failing test** — com `sendEmail` fake que retorna `{enviado:true}`: entrega marca `delivered_at`, roda de novo → não re-envia (idempotente). Com `sendEmail` `{enviado:false}`: NÃO marca `delivered_at`, re-tenta no próximo run. `sendEmail` que lança em 1 de 2 destinatários: o outro ainda é entregue. Nenhuma linha de log contém o e-mail. O link gerado bate com `resolveDeliveryToken` (token válido).

- [ ] **Step 2: Run and see it fail** — FAIL.

- [ ] **Step 3: Implement** — conforme interfaces; `ttlDias` default 30; try/catch por destinatário em `runDeliveryForEvent`; texto do e-mail sem PII além do próprio `to`.

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): sendGuestDelivery + runDeliveryForEvent (idempotente, degrada)`.

---

### Task 7: Use-case `openGuestGallery` — token → fotos presigned

**Files:**
- Create: `packages/application/src/entrega/open-gallery.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/src/entrega/open-gallery.test.ts`

**Interfaces:**
- Consumes: `resolveDeliveryToken` (Task 2), `listarMinhasDoEvento`, `signableKeys`, `withEvent` de `@albora/db`.
- Produces:
  - `type FotoEntrega = { id: string; url: string; thumbUrl: string; mime: string; criadaEm: Date; legenda: string | null }`
  - `openGuestGallery(deps: { pool: Pool; segredo: string; signGet: (key: string, ttl: number) => Promise<string> }, token: string): Promise<{ eventId: string; fotos: FotoEntrega[] }>` — resolve token; `withEvent` p/ `listarMinhasDoEvento(sessaoId)`; filtra por `signableKeys` (respeita `panic`/`published`); presigna full+thumb. Token inválido/expirado → propaga `ErroTokenDeEntrega`.

- [ ] **Step 1: Write the failing test** — token válido lista as fotos da sessão com URLs presigned (fake `signGet` que ecoa a key); foto não-publicada / evento em `panic` → excluída (via `signableKeys`); token expirado → lança. Semear uploads via helper existente.

- [ ] **Step 2: Run and see it fail** — FAIL.

- [ ] **Step 3: Implement** — resolver, `withEvent`, `listarMinhasDoEvento(cliente, sessaoId)`, `signableKeys(cliente, eventId, chavesFull)` p/ decidir quais servir, presignar as sobreviventes.

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): openGuestGallery (token → fotos presigned, respeita panic/published)`.

---

### Task 8: Use-cases app do magic link do convidado

**Files:**
- Create: `packages/application/src/auth/guest-magic-link.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/src/auth/guest-magic-link.test.ts`

**Interfaces:**
- Consumes: `isGuestSessionLive`, `emitGuestMagicLinkRow`, `consumeGuestMagicLink` de `@albora/db`; `claimGuestPhotosByEmail` (Task 4).
- Produces:
  - `emitGuestMagicLink(deps: { pool; segredo; baseUrl; sendEmail }, { eventId, guestSessionId, email }): Promise<{ enviado: boolean }>` — revalida sessão viva; emite; e-mail com `\${baseUrl}/auth/guest-magic/callback?token=…`. Sessão morta → no-op `{enviado:false}`.
  - `verifyGuestMagicLink(pool, segredo, token): Promise<{ eventId: string } | null>` — consume; se ok, `claimGuestPhotosByEmail({ …, verifiedVia: "magic_link" })`. Nunca `accounts`/host.

- [ ] **Step 1: Write the failing test** — emit exige sessão viva (sessão fantasma → `{enviado:false}`, nada gravado); verify consome e grava `guest_contacts` verificado `magic_link`; segundo verify do mesmo token → `null`; **BLINDADO** por contagem antes/depois de `accounts`/`host_sessions` (iguais) e por varredura de fonte do arquivo (`not.toMatch(/\baccounts\b/)`, `/host_sessions|hostCookie/`).

- [ ] **Step 2: Run and see it fail** — FAIL.

- [ ] **Step 3: Implement** — conforme interfaces; e-mail nunca logado cru.

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): emit/verify magic link do convidado (blindado, verified_via=magic_link)`.

---

### Task 9: Página pública `/g/[token]`

**Files:**
- Create: `apps/web/app/g/[token]/page.tsx`
- Test: `apps/web/app/g/[token]/gallery.test.tsx` (ou teste de rota conforme padrão do repo)

**Interfaces:**
- Consumes: `openGuestGallery` (Task 7) com `signGet` real do `r2-client`; `SESSION_SECRET`.

- [ ] **Step 1: Write the failing test** — token válido renderiza N fotos (imgs com as URLs presigned); token inválido/expirado renderiza estado "link expirado, peça de novo" (sem stack, sem vazar existência). Seguir o padrão de teste de página já usado no repo (ex.: o da confirmação do convidado).

- [ ] **Step 2: Run and see it fail** — `pnpm vitest run -c vitest.config.ts apps/web/app/g/` → FAIL.

- [ ] **Step 3: Implement** — server component: lê `params.token`, chama `openGuestGallery`, renderiza grade de fotos com tokens de design do evento (nenhum hex hardcodado); try/catch → estado expirado. Sem login.

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): página pública /g/[token] (galeria da sessão, sem login)`.

---

### Task 10: Rotas `/auth/guest-magic/start` e `/callback`

**Files:**
- Create: `apps/web/app/auth/guest-magic/start/route.ts`, `apps/web/app/auth/guest-magic/callback/route.ts`
- Test: `apps/web/app/auth/guest-magic/guest-magic.test.ts`

**Interfaces:**
- Consumes: `emitGuestMagicLink`/`verifyGuestMagicLink` (Task 8); `sendHostEmail`; resolução da sessão de convidado do cookie (mesma do fluxo Google — `guestSessionId`/`eventId` resolvidos no servidor, nunca do cliente); validação de `returnTo` interno (reusar helper `safeReturnTo` do SSO).

- [ ] **Step 1: Write the failing test** — `start` só emite dentro de sessão de convidado viva (sessão ausente → redireciona pra `/`, nada emitido); `callback` com token válido grava contato verificado e volta pra tela do convidado com sinal de sucesso; `returnTo` externo (`//`, esquema, host) cai no default. Espelhar `apps/web/app/auth/google/*` do SSO.

- [ ] **Step 2: Run and see it fail** — FAIL.

- [ ] **Step 3: Implement** — as duas rotas, `guestSessionId`/`eventId` do cookie no servidor; `sendHostEmail` como `sendEmail`; `safeReturnTo`.

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): rotas do magic link do convidado (start/callback, blindadas)`.

---

### Task 11: Admin — gate `delivery_opens_at` + disparo manual

**Files:**
- Create/Modify: handler de admin do evento (seguir o padrão de `apps/web/lib/api/handlers/` e a UI do painel do evento)
- Test: teste do handler (afirma persistência do gate e disparo)

**Interfaces:**
- Consumes: `runDeliveryForEvent` (Task 6) com `sendHostEmail`; escrita de `events.delivery_opens_at` via caminho de admin já existente (RLS por evento / caminho de host).

- [ ] **Step 1: Write the failing test** — togglar o gate persiste `delivery_opens_at`; com o gate aberto, o disparo chama `runDeliveryForEvent` e retorna a contagem de enviados; gate fechado → disparo não entrega nada.

- [ ] **Step 2: Run and see it fail** — FAIL.

- [ ] **Step 3: Implement** — endpoint/handler de admin: setar/limpar o gate e um disparo manual de entrega (o cron/job automático fica como consumidor de `runDeliveryForEvent`, fora do caminho crítico).

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): admin libera o gate de entrega e dispara a rodada`.

---

### Task 12: Retenção purga contato, tokens e magic links

**Files:**
- Modify: `packages/db/src/retention-jobs.ts` (`purgarAcervo`)
- Test: `packages/db/src/retention-jobs.test.ts` (adicionar caso)

**Interfaces:**
- Produces: `purgarAcervo` passa a apagar `guest_contacts`, `delivery_tokens`, `guest_magic_links` do evento (hoje `guest_contacts` só cai pela cascade de conta — o ADR 0019 fecha essa lacuna do d365).

> **Coordenação:** `retention-jobs.ts` também é editado por outra sessão (worktree `merganser`). Esta task só APENDA statements ao fim de `purgarAcervo`; ao mergear, resolver conflito preservando ambas as mudanças. Se o arquivo divergir muito no merge, re-aplicar só o bloco de DELETE.

- [ ] **Step 1: Write the failing test** — após `purgarAcervo(cliente, eventId)`, `guest_contacts`, `delivery_tokens` e `guest_magic_links` do evento estão vazios; os de OUTRO evento intactos (isolamento). Usar `withEvent`/`admin`.

- [ ] **Step 2: Run and see it fail** — `pnpm vitest run -c vitest.isolamento.config.ts packages/db/src/retention-jobs.test.ts` → FAIL.

- [ ] **Step 3: Implement** — apendar ao fim de `purgarAcervo`:

```ts
  await cliente.query("DELETE FROM delivery_tokens   WHERE event_id = $1", [eventId]);
  await cliente.query("DELETE FROM guest_magic_links WHERE event_id = $1", [eventId]);
  await cliente.query("DELETE FROM guest_contacts    WHERE event_id = $1", [eventId]);
```
> `delivered_at`/tokens somem junto do acervo; coerente com "retenção cumprida por job, não por promessa".

- [ ] **Step 4: Run and see it pass** — PASS.
- [ ] **Step 5: Commit** — `feat(entrega): retenção apaga guest_contacts, delivery_tokens e guest_magic_links`.

---

## Self-Review

- **Cobertura da spec:** gate (T1,T5,T11), link galeria da sessão (T2,T7,T9), magic link convidado (T3,T4,T8,T10), envio idempotente/degrada (T6), retenção (T12), isolamento (T1 + testes por task). ✔
- **Placeholders:** nenhum "TBD"; cada task com código real ou interface exata. ✔
- **Consistência de tipos:** `issueDeliveryToken`/`resolveDeliveryToken` (T2) consumidos por T6/T7; `emitGuestMagicLinkRow`/`consumeGuestMagicLink` (T3) por T8; `verifiedVia` (T4) por T8; `resolveDeliveries` (T5) por T6. ✔
- **Riscos:** T9/T10/T11 dependem de padrões de rota/página do repo que o implementer deve ler antes (SSO `apps/web/app/auth/google/*` é o análogo direto); T12 toca arquivo contendido (nota de coordenação). ✔
