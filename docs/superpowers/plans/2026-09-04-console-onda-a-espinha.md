# Console Interno — Onda A: Espinha (identidade de staff, RBAC, auditoria, shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a espinha do console interno — identidade de staff isolada, RBAC por capacidade, trilha de auditoria em banco, e o shell do console com os primitivos de dado — de modo que nenhuma mutação futura possa existir sem papel e sem trilha.

**Architecture:** Staff vive em tabelas próprias (`staff_users`/`staff_sessions`), separado de `accounts`, com cookie e magic link próprios. Permissão é verificada por **capacidade**, com o mapa papel→capacidade em código (revisável em PR) e a atribuição papel→pessoa em banco. Toda ação consequente e toda leitura cross-tenant gravam em `audit_log` (append-only). O console vive em `/console`, sobre o design system já entregue, com dois primitivos novos (`DataTable`, gráficos) que as ondas seguintes consomem.

**Tech Stack:** Next.js 15.5 (App Router, RSC), React 19, Tailwind v4, Postgres + `pg`, Vitest, TypeScript (`exactOptionalPropertyTypes: true`), pnpm monorepo (Node 22 — `source ~/.nvm/nvm.sh && nvm use 22`).

**Spec:** `docs/superpowers/specs/2026-09-04-console-interno-design.md`

## Global Constraints

- **Nenhum hex hardcodado.** Toda cor/fonte/raio/espaço via token semântico ou classe (`.tipo-*`, `.elev-*`, classes Tailwind de token). Guards `tokens.mjs`, `isolamento.mjs`, `dominio.mjs`, `packs.mjs`, `sessao.mjs` — bloqueantes, rodar antes de commitar.
- **Zero glassmorphism** (`backdrop-filter`/`backdrop-blur`). Profundidade por elevação/scrim.
- **Convidado nunca ganha login.** Nada nesta onda toca a sessão de convidado.
- **Nunca PII crua** em log, em `metadata` de auditoria, ou em mensagem de erro. Ids e agregados.
- **Query cross-evento só por `comAgregacao`** (papel `albora_agregador`), com `motivo` não-vazio e gravação em `audit_log`.
- **`SET LOCAL`, nunca `SET`.** `pg_advisory_xact_lock`, nunca `pg_advisory_lock`.
- **Migrations forward-only.** Nunca reescrever migration aplicada; escrever outra. Próximo número livre: **0059**.
- **`exactOptionalPropertyTypes: true`** — nunca passar `undefined` explícito para prop/campo opcional; usar spread condicional.
- **Alvos de toque/clique ≥44px; foco visível; WCAG AA no claro** (console é light mode). `prefers-reduced-motion` honrado.
- **Nenhuma string de domínio** (`noiva`, `casamento`) em componente.
- Commits em Conventional Commits com escopo (`feat(console):`, `feat(db):`). Rodar `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `git commit` (o hook `commit-msg` do husky quebra com Node antigo).
- **Nunca fazer merge sem pedido explícito.** Ladder: feature → `stable`.

## File Structure

**Banco (`packages/db`)**
- `packages/db/migrations/0059_staff_identidade.sql` — tabelas de staff (users, magic links, sessions, role assignments)
- `packages/db/migrations/0060_audit_log.sql` — trilha de auditoria append-only
- `packages/db/src/staff.ts` — acesso a dados de staff (criar/buscar usuário, magic link, sessão, papéis)
- `packages/db/src/audit.ts` — inserção e leitura de `audit_log`

**RBAC (`packages/core`)**
- `packages/core/src/staff-rbac.ts` — `Capacidade`, `PapelStaff`, mapa papel→capacidades, `temCapacidade()`

**Sessão e guard (`apps/web`)**
- `apps/web/lib/infrastructure/session/staff-session.ts` — cookie `albora_staff`, emitir/resolver/revogar
- `apps/web/lib/console/require-capability.ts` — guard servidor `requireCapability()`

**Console UI (`apps/web`)**
- `apps/web/features/console/components/server/console-shell.tsx` — shell com sidebar
- `apps/web/features/console/components/server/console-nav.tsx` — navegação lateral
- `apps/web/app/console/layout.tsx`, `apps/web/app/console/page.tsx` — rota raiz do console
- `apps/web/app/console/sign-in/page.tsx` + `apps/web/features/console/components/client/staff-sign-in-form.tsx` — login de staff

**Primitivos (`packages/ui-web`)**
- `packages/ui-web/src/data-table.tsx` — tabela de dados
- `packages/ui-web/src/chart.tsx` — sparkline/barra/donut

---

### Task 1: Schema de identidade de staff

Tabelas isoladas de `accounts`. Sem RLS de evento (staff é camada acima do isolamento por evento, como `accounts`/`host_sessions` já são).

**Files:**
- Create: `packages/db/migrations/0059_staff_identidade.sql`

**Interfaces:**
- Produces: tabelas `staff_users`, `staff_magic_links`, `staff_sessions`, `staff_role_assignments` consumidas pela Task 2.

- [ ] **Step 1: Escrever a migration**

```sql
-- 0059_staff_identidade.sql
-- Equipe Albora. Isolada de `accounts` de propósito: staff tem poder cross-tenant,
-- e comprometer o fluxo de auth de cliente nunca pode virar acesso interno.

CREATE TABLE staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  visto_em timestamptz
);

CREATE TABLE staff_magic_links (
  token_hash text PRIMARY KEY,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL,
  usado_em timestamptz
);
CREATE INDEX staff_magic_links_user ON staff_magic_links (staff_user_id);

CREATE TABLE staff_sessions (
  token_hash text PRIMARY KEY,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL,
  revogada_em timestamptz,
  criada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_sessions_user ON staff_sessions (staff_user_id);

-- Um staff pode acumular papéis. O mapa papel -> capacidades vive em CÓDIGO
-- (packages/core/src/staff-rbac.ts), nunca aqui: uma matriz de permissão
-- editável pela UI é superfície de escalação de privilégio.
CREATE TABLE staff_role_assignments (
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('owner','support','finance','compliance','engineering')),
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_user_id, papel)
);
```

- [ ] **Step 2: Aplicar e verificar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec node tools/db/migrar.mjs` (ou o runner de migration do repo — confirmar o comando real em `package.json` do pacote `db` antes de rodar).
Expected: migration aplica sem erro; `\d staff_users` mostra as 4 tabelas.

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/0059_staff_identidade.sql
git commit -m "feat(db): schema de identidade de staff isolado de accounts"
```

---

### Task 2: Acesso a dados de staff

**Files:**
- Create: `packages/db/src/staff.ts`
- Create: `packages/db/src/staff.test.ts`
- Modify: `packages/db/src/index.ts` (exportar o módulo)

**Interfaces:**
- Consumes: tabelas da Task 1.
- Produces:
  - `type PapelStaff = 'owner'|'support'|'finance'|'compliance'|'engineering'`
  - `type StaffUser = { id: string; email: string; nome: string; status: 'active'|'suspended'; papeis: PapelStaff[] }`
  - `criarStaffUser(pool, { email, nome, papeis })  => Promise<StaffUser>`
  - `buscarStaffPorEmail(pool, email) => Promise<StaffUser | null>`
  - `buscarStaffPorId(pool, id) => Promise<StaffUser | null>`
  - `criarMagicLinkStaff(pool, staffUserId, tokenHash, expiraEm) => Promise<void>`
  - `consumirMagicLinkStaff(pool, tokenHash) => Promise<string | null>` (devolve `staffUserId`, marca `usado_em`; devolve `null` se inválido/expirado/usado)
  - `criarSessaoStaff(pool, staffUserId, tokenHash, expiraEm) => Promise<void>`
  - `resolverSessaoStaff(pool, tokenHash) => Promise<StaffUser | null>` (nula se expirada, revogada, ou usuário suspenso)
  - `revogarSessaoStaff(pool, tokenHash) => Promise<void>`

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, expect, it } from "vitest";
import { prepararBanco } from "./teste/preparar"; // usar o helper de teste real do pacote; conferir o nome em outro *.test.ts do db
import {
  criarStaffUser, buscarStaffPorEmail, criarMagicLinkStaff, consumirMagicLinkStaff,
  criarSessaoStaff, resolverSessaoStaff, revogarSessaoStaff,
} from "./staff";

describe("staff", () => {
  it("cria staff com papéis e busca por e-mail", async () => {
    const pool = await prepararBanco();
    const criado = await criarStaffUser(pool, { email: "ceo@albora.test", nome: "Dona", papeis: ["owner"] });
    expect(criado.papeis).toEqual(["owner"]);
    const achado = await buscarStaffPorEmail(pool, "ceo@albora.test");
    expect(achado?.id).toBe(criado.id);
  });

  it("magic link só funciona uma vez", async () => {
    const pool = await prepararBanco();
    const s = await criarStaffUser(pool, { email: "s@albora.test", nome: "S", papeis: ["support"] });
    await criarMagicLinkStaff(pool, s.id, "hash-1", new Date(Date.now() + 60_000));
    expect(await consumirMagicLinkStaff(pool, "hash-1")).toBe(s.id);
    expect(await consumirMagicLinkStaff(pool, "hash-1")).toBeNull();
  });

  it("magic link expirado não vale", async () => {
    const pool = await prepararBanco();
    const s = await criarStaffUser(pool, { email: "e@albora.test", nome: "E", papeis: ["support"] });
    await criarMagicLinkStaff(pool, s.id, "hash-exp", new Date(Date.now() - 1000));
    expect(await consumirMagicLinkStaff(pool, "hash-exp")).toBeNull();
  });

  it("sessão resolve, e para de resolver quando revogada", async () => {
    const pool = await prepararBanco();
    const s = await criarStaffUser(pool, { email: "r@albora.test", nome: "R", papeis: ["finance"] });
    await criarSessaoStaff(pool, s.id, "sess-1", new Date(Date.now() + 60_000));
    expect((await resolverSessaoStaff(pool, "sess-1"))?.papeis).toEqual(["finance"]);
    await revogarSessaoStaff(pool, "sess-1");
    expect(await resolverSessaoStaff(pool, "sess-1")).toBeNull();
  });

  it("staff suspenso não resolve sessão", async () => {
    const pool = await prepararBanco();
    const s = await criarStaffUser(pool, { email: "sus@albora.test", nome: "Sus", papeis: ["support"] });
    await criarSessaoStaff(pool, s.id, "sess-2", new Date(Date.now() + 60_000));
    await pool.query("UPDATE staff_users SET status = 'suspended' WHERE id = $1", [s.id]);
    expect(await resolverSessaoStaff(pool, "sess-2")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/staff.test.ts`
Expected: FAIL — `Cannot find module './staff'`.

- [ ] **Step 3: Implementar `packages/db/src/staff.ts`**

Implementar exatamente as assinaturas do bloco *Produces*. Notas obrigatórias:
- `resolverSessaoStaff` filtra `expira_em > now() AND revogada_em IS NULL` e faz join com `staff_users` exigindo `status = 'active'`.
- `consumirMagicLinkStaff` marca `usado_em = now()` na MESMA query que valida (`UPDATE ... WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > now() RETURNING staff_user_id`) — evita corrida de duplo consumo.
- Papéis vêm por join em `staff_role_assignments`, ordenados, sempre array (nunca `undefined`).
- Nenhuma função loga e-mail cru.

- [ ] **Step 4: Rodar e ver passar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/staff.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Exportar e rodar a suíte do pacote**

Adicionar `export * from "./staff";` em `packages/db/src/index.ts`.
Run: `pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src`
Expected: suíte inteira verde.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/staff.ts packages/db/src/staff.test.ts packages/db/src/index.ts
git commit -m "feat(db): acesso a dados de staff (magic link, sessao, papeis)"
```

---

### Task 3: RBAC por capacidade (em código)

**Files:**
- Create: `packages/core/src/staff-rbac.ts`
- Create: `packages/core/src/staff-rbac.test.ts`
- Modify: `packages/core/src/index.ts` (exportar)

**Interfaces:**
- Produces:
  - `type Capacidade` (união literal com as 18 capacidades abaixo)
  - `type PapelStaff` (mesma união da Task 2 — re-declarada aqui para o core não depender de `@albora/db`)
  - `CAPACIDADES_POR_PAPEL: Record<PapelStaff, readonly Capacidade[]>`
  - `capacidadesDe(papeis: readonly PapelStaff[]): Set<Capacidade>`
  - `temCapacidade(papeis: readonly PapelStaff[], cap: Capacidade): boolean`

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, expect, it } from "vitest";
import { CAPACIDADES_POR_PAPEL, capacidadesDe, temCapacidade } from "./staff-rbac";

describe("staff-rbac", () => {
  it("owner tem todas as capacidades", () => {
    const todas = new Set(Object.values(CAPACIDADES_POR_PAPEL).flat());
    expect(capacidadesDe(["owner"]).size).toBe(todas.size);
  });

  it("support atende ticket mas não reembolsa", () => {
    expect(temCapacidade(["support"], "tickets.write")).toBe(true);
    expect(temCapacidade(["support"], "subscription.refund")).toBe(false);
  });

  it("finance reembolsa mas não executa LGPD", () => {
    expect(temCapacidade(["finance"], "subscription.refund")).toBe(true);
    expect(temCapacidade(["finance"], "lgpd.delete_account")).toBe(false);
  });

  it("compliance executa LGPD mas não mexe em assinatura", () => {
    expect(temCapacidade(["compliance"], "lgpd.delete_account")).toBe(true);
    expect(temCapacidade(["compliance"], "subscription.mutate")).toBe(false);
  });

  it("papéis acumulam", () => {
    expect(temCapacidade(["support", "finance"], "subscription.refund")).toBe(true);
  });

  it("sem papel, sem capacidade", () => {
    expect(temCapacidade([], "accounts.read")).toBe(false);
  });

  it("só owner administra staff e só owner/compliance lê auditoria", () => {
    expect(temCapacidade(["owner"], "staff.manage")).toBe(true);
    expect(temCapacidade(["support"], "staff.manage")).toBe(false);
    expect(temCapacidade(["compliance"], "audit.read")).toBe(true);
    expect(temCapacidade(["finance"], "audit.read")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run packages/core/src/staff-rbac.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `packages/core/src/staff-rbac.ts`**

```ts
/** Permissão é por capacidade, nunca por papel espalhado no código.
 *  O mapa papel->capacidade vive aqui (git, revisado em PR) e não no banco:
 *  matriz de permissão editável pela UI é superfície de escalação de privilégio. */
export type Capacidade =
  | "analytics.platform.read"
  | "accounts.read" | "accounts.pii.reveal"
  | "events.read"
  | "tickets.read" | "tickets.write" | "tickets.assign"
  | "subscription.read" | "subscription.mutate" | "subscription.refund"
  | "lgpd.dsar.read" | "lgpd.dsar.execute" | "lgpd.delete_account"
  | "retention.read"
  | "impersonate.request" | "impersonate.approve"
  | "staff.manage"
  | "audit.read";

export type PapelStaff = "owner" | "support" | "finance" | "compliance" | "engineering";

const SUPPORT: readonly Capacidade[] = [
  "analytics.platform.read", "accounts.read", "accounts.pii.reveal", "events.read",
  "tickets.read", "tickets.write", "tickets.assign", "subscription.read",
  "impersonate.request",
];

const FINANCE: readonly Capacidade[] = [
  "analytics.platform.read", "accounts.read", "tickets.read",
  "subscription.read", "subscription.mutate", "subscription.refund",
];

const COMPLIANCE: readonly Capacidade[] = [
  "accounts.read", "accounts.pii.reveal", "events.read",
  "lgpd.dsar.read", "lgpd.dsar.execute", "lgpd.delete_account",
  "retention.read", "audit.read",
];

const ENGINEERING: readonly Capacidade[] = [
  "analytics.platform.read", "events.read", "retention.read", "tickets.read",
];

const TODAS: readonly Capacidade[] = [
  ...new Set<Capacidade>([
    ...SUPPORT, ...FINANCE, ...COMPLIANCE, ...ENGINEERING,
    "impersonate.approve", "staff.manage",
  ]),
];

export const CAPACIDADES_POR_PAPEL: Record<PapelStaff, readonly Capacidade[]> = {
  owner: TODAS,
  support: SUPPORT,
  finance: FINANCE,
  compliance: COMPLIANCE,
  engineering: ENGINEERING,
};

export function capacidadesDe(papeis: readonly PapelStaff[]): Set<Capacidade> {
  const set = new Set<Capacidade>();
  for (const papel of papeis) for (const cap of CAPACIDADES_POR_PAPEL[papel] ?? []) set.add(cap);
  return set;
}

export function temCapacidade(papeis: readonly PapelStaff[], cap: Capacidade): boolean {
  return capacidadesDe(papeis).has(cap);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run packages/core/src/staff-rbac.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Exportar e commitar**

Adicionar `export * from "./staff-rbac";` em `packages/core/src/index.ts`.

```bash
git add packages/core/src/staff-rbac.ts packages/core/src/staff-rbac.test.ts packages/core/src/index.ts
git commit -m "feat(core): RBAC por capacidade para staff"
```

---

### Task 4: Trilha de auditoria (schema + acesso)

**Files:**
- Create: `packages/db/migrations/0060_audit_log.sql`
- Create: `packages/db/src/audit.ts`
- Create: `packages/db/src/audit.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Produces:
  - `type AtorKind = 'staff'|'system'|'host'`
  - `registrarAuditoria(pool, { atorKind, atorId, atorLabel, acao, alvoKind, alvoId, motivo, metadata? }) => Promise<void>`
  - `listarAuditoria(pool, { limite, antesDe? }) => Promise<RegistroAuditoria[]>`

- [ ] **Step 1: Escrever a migration**

```sql
-- 0060_audit_log.sql
-- Trilha append-only. Sem trilha consultável, mutação em dado de cliente não deveria existir.
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  em timestamptz NOT NULL DEFAULT now(),
  ator_kind text NOT NULL CHECK (ator_kind IN ('staff','system','host')),
  ator_id text,
  ator_label text,                 -- mascarado; NUNCA e-mail/nome cru
  acao text NOT NULL,
  alvo_kind text NOT NULL CHECK (alvo_kind IN ('account','event','ticket','subscription','staff_user','platform')),
  alvo_id text,
  motivo text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,   -- ids e contadores; NUNCA PII crua
  request_id text,
  ip_hash text,
  CONSTRAINT motivo_nao_vazio CHECK (length(btrim(motivo)) > 0)
);

CREATE INDEX audit_log_em ON audit_log (em DESC);
CREATE INDEX audit_log_ator ON audit_log (ator_kind, ator_id, em DESC);
CREATE INDEX audit_log_alvo ON audit_log (alvo_kind, alvo_id, em DESC);

-- Append-only por grant: a aplicação insere e lê, nunca altera nem apaga.
REVOKE UPDATE, DELETE ON audit_log FROM albora_app;
GRANT INSERT, SELECT ON audit_log TO albora_app;
GRANT SELECT ON audit_log TO albora_agregador;
```

- [ ] **Step 2: Escrever os testes que falham**

```ts
import { describe, expect, it } from "vitest";
import { prepararBanco } from "./teste/preparar";
import { registrarAuditoria, listarAuditoria } from "./audit";

describe("audit_log", () => {
  it("grava e lê um registro", async () => {
    const pool = await prepararBanco();
    await registrarAuditoria(pool, {
      atorKind: "staff", atorId: "s1", atorLabel: "c***@albora.test",
      acao: "subscription.refund", alvoKind: "subscription", alvoId: "sub1",
      motivo: "cliente cobrado em duplicidade",
    });
    const linhas = await listarAuditoria(pool, { limite: 10 });
    expect(linhas[0]?.acao).toBe("subscription.refund");
    expect(linhas[0]?.motivo).toBe("cliente cobrado em duplicidade");
  });

  it("recusa motivo vazio", async () => {
    const pool = await prepararBanco();
    await expect(registrarAuditoria(pool, {
      atorKind: "staff", atorId: "s1", atorLabel: "x", acao: "a",
      alvoKind: "platform", alvoId: null, motivo: "   ",
    })).rejects.toThrow();
  });

  it("é append-only: UPDATE e DELETE falham para o papel da aplicação", async () => {
    const pool = await prepararBanco();
    await registrarAuditoria(pool, {
      atorKind: "system", atorId: null, atorLabel: null, acao: "aggregation.read",
      alvoKind: "platform", alvoId: null, motivo: "painel do console",
    });
    await expect(pool.query("UPDATE audit_log SET motivo = 'x'")).rejects.toThrow();
    await expect(pool.query("DELETE FROM audit_log")).rejects.toThrow();
  });
});
```

Nota para o implementador: o terceiro teste só é válido se o pool de teste conecta como `albora_app` (e não como superusuário). Conferir em `packages/db/src/teste/preparar.ts` qual papel o helper usa; se for superusuário, ajustar o teste para conectar com o papel da aplicação, e **não** relaxar o grant.

- [ ] **Step 3: Rodar e ver falhar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src/audit.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 4: Implementar `packages/db/src/audit.ts`**

- `registrarAuditoria` valida `motivo.trim()` não-vazio **antes** de ir ao banco (erro claro em vez de violação de constraint), e insere.
- `listarAuditoria` ordena por `em DESC`, aplica `limite` e `antesDe` (cursor por timestamp).
- Nenhuma função aceita ou grava PII crua: `atorLabel` é responsabilidade do chamador mascarar; documentar isso no JSDoc do módulo.

- [ ] **Step 5: Rodar e ver passar** + suíte do pacote

Run: `pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add packages/db/migrations/0060_audit_log.sql packages/db/src/audit.ts packages/db/src/audit.test.ts packages/db/src/index.ts
git commit -m "feat(db): trilha de auditoria append-only"
```

---

### Task 5: `comAgregacao` grava auditoria em banco

Hoje o callback `auditar` só faz `console.log`. Passa a gravar em `audit_log`, mantendo o log estruturado. Efeito: "quem cruzou eventos, quando e por quê" vira consulta SQL.

**Files:**
- Create: `apps/web/lib/console/auditar-agregacao.ts`
- Create: `apps/web/lib/console/auditar-agregacao.test.ts`
- Read (não modificar a assinatura): `packages/db/src/event.ts` (`comAgregacao`), `apps/web/features/vendor-portal/lib/audit.ts` (padrão atual)

**Interfaces:**
- Consumes: `registrarAuditoria` (Task 4); `comAgregacao(pool, motivo, auditar, executar)` já existente.
- Produces: `criarAuditorDeAgregacao(pool, contexto: { atorKind, atorId, atorLabel }) => (registro: { motivo: string; em: Date }) => void`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, expect, it, vi } from "vitest";
import { criarAuditorDeAgregacao } from "./auditar-agregacao";

describe("auditor de agregação", () => {
  it("grava uma linha de auditoria por agregação, com o motivo", async () => {
    const registrar = vi.fn().mockResolvedValue(undefined);
    const auditar = criarAuditorDeAgregacao({ registrar } as never, {
      atorKind: "staff", atorId: "s1", atorLabel: "c***@albora.test",
    });
    auditar({ motivo: "console_visao_geral", em: new Date() });
    await vi.waitFor(() => expect(registrar).toHaveBeenCalledTimes(1));
    expect(registrar.mock.calls[0][1]).toMatchObject({
      acao: "aggregation.read", motivo: "console_visao_geral", alvoKind: "platform",
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web/lib/console/auditar-agregacao.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`criarAuditorDeAgregacao` devolve uma função síncrona (a assinatura de `auditar` em `comAgregacao` é síncrona) que dispara a gravação e **nunca deixa a falha de auditoria derrubar a leitura** — `.catch()` que loga `console.error("auditoria.falhou", { acao, motivo })` sem PII. Mantém também o `console.log` estruturado atual, para não perder observabilidade externa.

- [ ] **Step 4: Rodar e ver passar**

Run: mesmo comando do Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/console/auditar-agregacao.ts apps/web/lib/console/auditar-agregacao.test.ts
git commit -m "feat(console): agregacao cross-tenant grava auditoria em banco"
```

---

### Task 6: Sessão de staff e guard de capacidade

**Files:**
- Create: `apps/web/lib/infrastructure/session/staff-session.ts`
- Create: `apps/web/lib/console/require-capability.ts`
- Create: `apps/web/lib/console/require-capability.test.ts`

**Interfaces:**
- Consumes: `resolverSessaoStaff`/`criarSessaoStaff`/`revogarSessaoStaff` (Task 2); `temCapacidade` (Task 3).
- Produces:
  - `STAFF_COOKIE = "albora_staff"`
  - `emitirTokenStaff(): { token: string; hash: string }`
  - `staffFromToken(pool, token): Promise<StaffUser | null>`
  - `staffCookieHeader(token, expiraEm): string` / `staffCookieLimpando(): string`
  - `requireCapability(cap: Capacidade): Promise<StaffUser>` — resolve o staff do cookie; **redirect** para `/console/sign-in` se não houver sessão; **lança/renderiza negado** se houver sessão sem a capacidade.

- [ ] **Step 1: Escrever o teste que falha (guard)**

```ts
import { describe, expect, it } from "vitest";
import { podeAcessar } from "./require-capability";

describe("guard de capacidade", () => {
  it("nega quem não tem a capacidade", () => {
    expect(podeAcessar(["support"], "subscription.refund")).toBe(false);
  });
  it("permite quem tem", () => {
    expect(podeAcessar(["finance"], "subscription.refund")).toBe(true);
  });
  it("nega sessão sem papel", () => {
    expect(podeAcessar([], "accounts.read")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web/lib/console/require-capability.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar sessão + guard**

- `staff-session.ts` espelha o padrão de `host-session.ts` (ler esse arquivo antes): cookie **HttpOnly**, `Path=/`, `SameSite=Lax`, `Secure` fora de dev, token opaco aleatório com hash guardado no banco (nunca o token cru).
- **Cookie e nome diferentes do host** (`albora_staff`), para que sessão de staff e de cliente nunca se confundam.
- `require-capability.ts` exporta a função pura `podeAcessar(papeis, cap)` (testável) e o wrapper de servidor `requireCapability(cap)` que lê o cookie, resolve a sessão e aplica `podeAcessar`.
- O guard **nunca** vaza por que negou (não diferencia "sem sessão" de "sem permissão" na mensagem ao usuário além do necessário para navegação).

- [ ] **Step 4: Rodar e ver passar**

Run: mesmo comando. Expected: PASS (3 testes).

- [ ] **Step 5: Rodar o guard `sessao.mjs`**

Run: `node tools/guards/sessao.mjs`
Expected: ✓ (nenhum log de cookie/token).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/infrastructure/session/staff-session.ts apps/web/lib/console/require-capability.ts apps/web/lib/console/require-capability.test.ts
git commit -m "feat(console): sessao de staff e guard por capacidade"
```

---

### Task 7: Login de staff (magic link)

**Files:**
- Create: `apps/web/app/console/sign-in/page.tsx`
- Create: `apps/web/features/console/components/client/staff-sign-in-form.tsx`
- Create: `apps/web/app/api/console/entrar/route.ts` (pede o link)
- Create: `apps/web/app/api/console/sessao/route.ts` (troca o token por sessão)
- Create: `apps/web/app/api/console/sair/route.ts` (revoga)

**Interfaces:**
- Consumes: Task 2 (magic link/sessão), Task 6 (cookie/emissão), `sendHostEmail` (o remetente de e-mail já existente — conferir o nome real e reusar; não criar outro).
- Produces: fluxo de login funcional em `/console/sign-in`.

- [ ] **Step 1: Escrever o teste que falha (handler de entrada)**

Teste do handler `POST /api/console/entrar`: e-mail **não cadastrado como staff** responde `200` com corpo genérico (nunca revela se o e-mail existe — evita enumeração de funcionários), e **não** cria magic link. E-mail cadastrado cria exatamente um magic link.

```ts
it("não revela se o e-mail é de staff", async () => { /* 200 + corpo genérico, zero magic link criado */ });
it("cria magic link para staff existente", async () => { /* 1 link criado */ });
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar as três rotas + a tela**

- Tela: uma coluna, `TextField` de e-mail (48px, `focus-visible`), `PrimaryButton` único, estado "link enviado" claro — mesmo idioma do `sign-in` do admin (ler `apps/web/features/admin/components/client/sign-in-form.tsx` e seguir o padrão, sem copiar cegamente).
- `POST /entrar`: sempre `200` genérico. Rate-limit por e-mail e por IP (reusar o utilitário de rate-limit existente do repo; conferir onde vive).
- `GET|POST /sessao`: consome o magic link, cria a sessão, seta o cookie, redireciona para `/console`. Grava auditoria `staff.login` (ator = o staff, alvo = `staff_user`, motivo `"login"`).
- `POST /sair`: revoga a sessão e limpa o cookie. Grava auditoria `staff.logout`.

- [ ] **Step 4: Rodar e ver passar** + `pnpm exec vitest run apps/web` verde.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/console/sign-in apps/web/features/console apps/web/app/api/console
git commit -m "feat(console): login de staff por magic link"
```

---

### Task 8: Migrar `platform_operators` para staff

Hoje quem opera `/ops` é uma conta de host listada em `platform_operators`. Esses humanos precisam continuar entrando — agora como staff.

**Files:**
- Create: `packages/db/migrations/0061_migrar_operadores_para_staff.sql`

**Interfaces:**
- Consumes: `staff_users`/`staff_role_assignments` (Task 1).

- [ ] **Step 1: Escrever a migration**

```sql
-- 0061_migrar_operadores_para_staff.sql
-- Cada operador de plataforma vira um staff_user com papel 'owner' (a equipe atual
-- é pequena e tinha acesso total no modelo binário anterior; refinar papéis depois
-- é uma decisão de pessoas, não de migration).
INSERT INTO staff_users (email, nome, status)
SELECT a.email, split_part(a.email, '@', 1), 'active'
FROM platform_operators po
JOIN accounts a ON a.id = po.account_id
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_role_assignments (staff_user_id, papel)
SELECT su.id, 'owner'
FROM staff_users su
WHERE su.email IN (SELECT a.email FROM platform_operators po JOIN accounts a ON a.id = po.account_id)
ON CONFLICT DO NOTHING;

-- `platform_operators` NÃO é removida aqui: `/ops` continua no ar durante a Onda A
-- e só é aposentada na Onda D, quando o console cobrir tudo. Forward-only.
```

- [ ] **Step 2: Aplicar e verificar**

Run: aplicar a migration; depois `SELECT email FROM staff_users;` deve conter os operadores.
Expected: um `staff_user` ativo com papel `owner` por operador.

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/0061_migrar_operadores_para_staff.sql
git commit -m "feat(db): migra operadores de plataforma para staff_users"
```

---

### Task 9: Primitivo `DataTable`

O design system não tem tabela de dados. Todas as telas das ondas B e C dependem dela.

**Files:**
- Create: `packages/ui-web/src/data-table.tsx`
- Create: `packages/ui-web/src/data-table.test.tsx`
- Modify: `packages/ui-web/src/index.ts`

**Interfaces:**
- Produces:
  - `type ColunaTabela<T> = { chave: string; titulo: string; render: (linha: T) => ReactNode; numerica?: boolean; ordenavel?: boolean }`
  - `DataTable<T>({ colunas, linhas, chaveDaLinha, vazio, carregando, ordenadaPor, ordem, aoOrdenar }): JSX.Element`

- [ ] **Step 1: Escrever os testes que falham**

```tsx
import { render, screen } from "@testing-library/react";
import { DataTable } from "./data-table";

const colunas = [
  { chave: "nome", titulo: "Nome", render: (l: { nome: string }) => l.nome },
  { chave: "total", titulo: "Total", numerica: true, render: (l: { total: number }) => String(l.total) },
];

it("renderiza cabeçalho e linhas", () => {
  render(<DataTable colunas={colunas} linhas={[{ nome: "A", total: 2 }]} chaveDaLinha={(l) => l.nome} />);
  expect(screen.getByRole("columnheader", { name: "Nome" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "A" })).toBeInTheDocument();
});

it("coluna numérica usa tabular-nums", () => {
  render(<DataTable colunas={colunas} linhas={[{ nome: "A", total: 2 }]} chaveDaLinha={(l) => l.nome} />);
  expect(screen.getByRole("cell", { name: "2" }).className).toMatch(/tabular-nums/);
});

it("mostra estado vazio quando não há linhas", () => {
  render(<DataTable colunas={colunas} linhas={[]} chaveDaLinha={() => "x"} vazio="Nada aqui" />);
  expect(screen.getByText("Nada aqui")).toBeInTheDocument();
});

it("cabeçalho ordenável expõe aria-sort", () => {
  render(<DataTable colunas={[{ ...colunas[0], ordenavel: true }]} linhas={[]} chaveDaLinha={() => "x"} ordenadaPor="nome" ordem="asc" />);
  expect(screen.getByRole("columnheader", { name: /Nome/ })).toHaveAttribute("aria-sort", "ascending");
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm exec vitest run packages/ui-web/src/data-table.test.tsx`

- [ ] **Step 3: Implementar**

`<table>` semântica real (`role` implícito), `scope="col"` nos cabeçalhos, `aria-sort` na coluna ordenada, botão de ordenação com alvo ≥44px, coluna numérica com `tabular-nums text-right`, estados vazio e carregando (skeleton com a mesma geometria, sem pulo de layout). Só tokens (`.tipo-*`, `border-linha`, `bg-superficie`, `.elev-*`) — zero hex.

- [ ] **Step 4: Rodar e ver passar** + suíte inteira `pnpm exec vitest run packages/ui-web/src`.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-web/src/data-table.tsx packages/ui-web/src/data-table.test.tsx packages/ui-web/src/index.ts
git commit -m "feat(ui): primitivo DataTable"
```

---

### Task 10: Primitivos de gráfico

**Files:**
- Create: `packages/ui-web/src/chart.tsx`
- Create: `packages/ui-web/src/chart.test.tsx`
- Modify: `packages/ui-web/src/index.ts`

**Interfaces:**
- Produces: `Sparkline({ pontos, rotulo })`, `BarChart({ barras, rotulo })`, `Donut({ fatias, rotulo })` — todos SVG, sem dependência externa.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
it("sparkline desenha um path e tem rótulo acessível", () => {
  render(<Sparkline pontos={[1, 5, 3]} rotulo="Fotos por dia" />);
  expect(screen.getByRole("img", { name: "Fotos por dia" })).toBeInTheDocument();
});

it("barra destaca o pico", () => {
  const { container } = render(<BarChart barras={[{ rotulo: "A", valor: 1 }, { rotulo: "B", valor: 9 }]} rotulo="Por hora" />);
  expect(container.querySelectorAll("[data-pico='true']")).toHaveLength(1);
});

it("donut soma 100% e expõe rótulo", () => {
  render(<Donut fatias={[{ rotulo: "X", valor: 1 }, { rotulo: "Y", valor: 1 }]} rotulo="Distribuição" />);
  expect(screen.getByRole("img", { name: "Distribuição" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**

SVG puro. `role="img"` + `aria-label` no `<svg>` (o gráfico é uma imagem para leitor de tela; a tabela ao lado é a fonte acessível do dado quando houver). Preenchimento por token (`var(--acento)` para destaque, `var(--ink-3)` para o resto) — **nunca** hex. Grade discreta com `border-linha`. Sem animação de entrada obrigatória; se houver, respeitar `prefers-reduced-motion`.

- [ ] **Step 4: Rodar e ver passar** + suíte `packages/ui-web/src` verde.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-web/src/chart.tsx packages/ui-web/src/chart.test.tsx packages/ui-web/src/index.ts
git commit -m "feat(ui): primitivos de grafico (sparkline, barra, donut)"
```

---

### Task 11: Shell do console com sidebar

**Files:**
- Create: `apps/web/features/console/components/server/console-shell.tsx`
- Create: `apps/web/features/console/components/server/console-nav.tsx`
- Create: `apps/web/app/console/layout.tsx`
- Create: `apps/web/app/console/page.tsx` (placeholder da Visão geral, preenchido na Onda B)

**Interfaces:**
- Consumes: `requireCapability` (Task 6), `capacidadesDe` (Task 3).
- Produces: `ConsoleShell({ titulo, subtitulo?, children })` usado por toda página do console nas ondas B e C.

- [ ] **Step 1: Escrever o teste que falha (nav filtra por capacidade)**

```tsx
it("esconde item de nav sem a capacidade", () => {
  render(<ConsoleNav capacidades={new Set(["tickets.read"])} atual="/console/suporte" />);
  expect(screen.getByRole("link", { name: /Suporte/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Auditoria/ })).toBeNull();
});

it("marca o item atual com aria-current", () => {
  render(<ConsoleNav capacidades={new Set(["tickets.read"])} atual="/console/suporte" />);
  expect(screen.getByRole("link", { name: /Suporte/ })).toHaveAttribute("aria-current", "page");
});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**

- `console-nav.tsx`: sidebar persistente. Itens: Visão geral (`analytics.platform.read`), Contas (`accounts.read`), Eventos (`events.read`), Assinaturas (`subscription.read`), Suporte (`tickets.read`), LGPD (`lgpd.dsar.read`), Auditoria (`audit.read`), Equipe (`staff.manage`). **Cada item só aparece se a capacidade estiver no conjunto** — a nav é a primeira expressão visível do RBAC. `aria-current="page"` no atual, alvos ≥44px.
- `console-shell.tsx`: layout de duas colunas (sidebar + conteúdo), modo claro (reusar `adminVars('light')`), cabeçalho com `h1.tipo-title`, identidade do staff logado e ação de sair. Conteúdo em largura de leitura confortável.
- `layout.tsx`: chama `requireCapability` com a capacidade mínima do console (`analytics.platform.read` **não** serve — compliance não a tem). Usar uma checagem de "tem sessão de staff ativa" no layout, e a capacidade específica em cada página.
- `page.tsx`: placeholder honesto ("Visão geral chega na próxima onda"), sem dado falso.

- [ ] **Step 4: Rodar e ver passar** + `pnpm exec vitest run apps/web/features/console`.

- [ ] **Step 5: Guards + commit**

Run: `node tools/guards/tokens.mjs && node tools/guards/isolamento.mjs && node tools/guards/dominio.mjs && node tools/guards/packs.mjs && node tools/guards/sessao.mjs`

```bash
git add apps/web/features/console apps/web/app/console
git commit -m "feat(console): shell com sidebar filtrada por capacidade"
```

---

### Task 12: Verificação da Onda A

Prova que a espinha aguenta peso. Não é código de produção novo.

**Files:** nenhum de produção. Opcional: nota de status no spec.

- [ ] **Step 1: Suíte inteira + guards**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web packages/ui-web packages/core && pnpm exec vitest run --config vitest.isolamento.config.ts packages/db/src && node tools/guards/tokens.mjs && node tools/guards/isolamento.mjs && node tools/guards/dominio.mjs && node tools/guards/packs.mjs && node tools/guards/sessao.mjs`
Expected: tudo verde.

- [ ] **Step 2: `tsc` limpo**

Run: `pnpm exec tsc --noEmit` nos pacotes tocados e em `apps/web`.
Expected: sem erro novo. (Há um erro pré-existente conhecido e não relacionado em `apps/web/features/guest/lib/event-vars.test.ts` — ignorar apenas esse.)

- [ ] **Step 3: Prova manual do fluxo de staff**

Criar um staff de teste, pedir magic link, trocar por sessão, abrir `/console`. Confirmar: (a) sem cookie → redireciona para `/console/sign-in`; (b) staff `support` **não** vê os itens Auditoria e Equipe na sidebar; (c) staff `owner` vê tudo; (d) sair revoga e volta a redirecionar.

- [ ] **Step 4: Prova de que a auditoria grava**

Disparar uma leitura que passe por `comAgregacao` e confirmar por SQL: `SELECT acao, motivo FROM audit_log ORDER BY em DESC LIMIT 5;` mostra `aggregation.read` com o motivo.

- [ ] **Step 5: Commit da nota de status (se houver)**

```bash
git add docs/superpowers/specs/2026-09-04-console-interno-design.md
git commit -m "docs(console): marca Onda A (espinha) concluida"
```

---

## Self-Review (feito na escrita)

- **Cobertura do spec:** §4 substratos → T1/T2/T6/T7; §5 RBAC → T3 (capacidades/papéis) + T6 (enforcement) + T11 (nav filtrada); §6 auditoria → T4 (tabela) + T5 (agregação grava); §7 analytics → primitivos T9/T10 + o caminho auditado T5 (as telas em si são Onda B, por desenho); §12 UI/console → T11 + T9 + T10; migração do modelo antigo → T8. §8 suporte, §9 assinatura, §10 LGPD, §11 impersonação são **explicitamente Ondas B/C** — esta onda entrega a espinha que as habilita.
- **Placeholders:** nenhum "TBD". Onde o implementador precisa ler um arquivo antes de escrever (helper de teste do `db`, `host-session.ts`, remetente de e-mail, utilitário de rate-limit), o passo diz **qual arquivo ler e por quê** — isso é leitura necessária, não placeholder. O comando exato do runner de migration é o único ponto marcado para confirmar no `package.json`, porque inventá-lo seria pior que confirmá-lo.
- **Consistência de tipos:** `PapelStaff` aparece em T2 (db) e T3 (core) com os mesmos cinco valores — declarado nos dois de propósito, para o `core` não depender do `db`; o CHECK da migration (T1) usa exatamente a mesma lista. `Capacidade` de T3 é a mesma união usada por `requireCapability` (T6) e pela nav (T11). `registrarAuditoria` (T4) é consumida com a mesma forma de argumento em T5 e T7.
- **Escopo:** a Onda A é entregável e testável sozinha — ao fim dela existe um console com login de staff, RBAC visível na navegação e auditoria gravando, mesmo sem nenhuma tela de dado ainda.
