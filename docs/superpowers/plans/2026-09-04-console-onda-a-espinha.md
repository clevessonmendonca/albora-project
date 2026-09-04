# Console Interno — Onda A (Espinha) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a espinha do console interno — identidade de staff endurecida, autorização por capacidade+política, auditoria transacional e os envelopes de aplicação — para que nenhuma mutação da Onda C precise lembrar de fazer as cinco garantias na ordem certa.

**Architecture:** Quatro camadas com dependência unidirecional (`apps/web/app/console` → `apps/web/lib/console` → `packages/application` → `packages/core`, com `application` também falando com `packages/db`/`packages/integrations`); `core` nunca importa `db`/`application`/`apps`. Toda mutação passa por `executeCommand` (autoriza → `BEGIN` → `run(tx)` → `INSERT audit_log` na mesma transação → `COMMIT` — se a auditoria falhar, a mutação não acontece); toda leitura por `executeQuery` (auditoria informacional, pode falhar sem derrubar a leitura); cross-tenant só por `withPlatformAggregation`. Autorização é `authorize({actor, capability, resource, context}) → Decision` com quatro saídas (`allowed`/`denied`/`needsApproval`/`needsReauth`), onde o mapa papel→capacidade vive em código (`packages/core/src/authorization/`) e quem-tem-qual-papel vive no banco.

**Tech Stack:** TypeScript (`exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`), pnpm workspaces, Next.js 15 (App Router, Server Actions), PostgreSQL via `pg` com RLS forçado, Vitest (projetos `node`/`jsdom`), Node 22.

**Spec:** docs/superpowers/specs/2026-09-04-console-interno-design.md
**ADR:** docs/adr/0016-camadas-do-console-interno.md

## Global Constraints

- Node 22: `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `git commit` (hook husky commit-msg quebra com Node antigo).
- Worktree: `/Users/clevesson-mendonca/orca/workspaces/albora-project/ceo-backoffice`, branch `feat/ceo-backoffice`. NUNCA tocar em `/Users/clevesson-mendonca/orca/workspaces/albora-project/merganser`.
- Nenhuma task roda `next build` ou `next start`.
- Migrations forward-only. Próximo número livre após 0059: **0060**.
- Símbolo/coluna nova em inglês (ADR 0014). Guard `tools/guards/nomenclatura.mjs` é bloqueante.
- Nunca logar PII crua (e-mail, nome, telefone) — nem em log, nem em `audit_log.metadata`, nem em `security_events.metadata`.
- `SET LOCAL`, nunca `SET`. `pg_advisory_xact_lock`, nunca `pg_advisory_lock`.
- Nenhum hex hardcodado em componente; zero `backdrop-blur`/glassmorphism; alvo de toque ≥44px; WCAG AA.
- Conventional Commits com escopo. Commit termina com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Test runner: Vitest. TypeScript com `exactOptionalPropertyTypes: true`.
- Helper de teste de banco: `packages/db/src/testes/banco.ts`; runner de migration: `migrar(pool, dir)` em `packages/db/src/migrar.ts` (idempotente, tracking em `_migrations`). `TEST_DATABASE_URL` = `postgres://albora:albora@localhost:55432/albora`.

## Notas de reconhecimento que mudam a execução

Achados da leitura do código real que a espinha não previa (ou previa de forma incompleta) e que os passos abaixo já incorporam — não são pontos em aberto, são decisões já tomadas:

1. **`comAgregacao` tem `auditar` síncrono, não assíncrono.** A assinatura real (`packages/db/src/event.ts`) é `comAgregacao<T>(pool, motivo, auditar: (registro) => void, executar)`, e `auditar` é chamado *antes* do `BEGIN`, de forma síncrona. `insertAuditLog` é assíncrono e grava com o papel `albora_app` — que não é o mesmo pool/role do `aggregatorPool` (`albora_agregador`, sem `INSERT` em `audit_log`). T7 resolve isso capturando a promise da escrita de auditoria dentro do callback síncrono e `await`-ando depois que `comAgregacao` retorna, numa conexão separada do `deps.pool` (papel da aplicação).
2. **Colunas de hash em `staff_magic_links`/`staff_sessions` são `text`, não `bytea`.** Diferente de `magic_links.token_hash` (que é `bytea`, ver `packages/db/src/host-auth.test.ts`), a migration 0059 (já aplicada) declara `token_hash text PRIMARY KEY`. T4/T9 usam `createHash("sha256").update(token).digest("hex")` (string), não o `hashDoToken` de `packages/db/src/token.ts` (que devolve `Buffer` e exige segredo HMAC — um esquema mais pesado que a espinha não pede para staff).
3. **`hasCapability`/`ROLE_CAPABILITIES`/`ALL_CAPABILITIES` têm uma dependência circular óbvia se seguidos ao pé da letra.** A espinha põe `ALL_CAPABILITIES` e `hasCapability` em `capabilities.ts`, e `owner = todas` em `roles.ts` — mas "todas" só existe se um dos dois importar do outro. T3 resolve com direção única `capabilities.ts → roles.ts`: `roles.ts` declara o array literal de `owner` (com uma prova de exaustão em tempo de compilação, `AssertaCompleto<T>`) e `capabilities.ts` deriva `ALL_CAPABILITIES = ROLE_CAPABILITIES.owner`.
4. **Um `role === "owner"` legítimo já existe no código** (`apps/web/features/admin/data/load-event-page.ts:37`, onde `role` é `HostEventRole`, não `StaffRole`). Um guard que varre o repo inteiro por `role === "owner"|"support"|...` reprovaria código correto e alheio a este projeto. T8 escopa a Regra 3 às superfícies que este projeto cria (`apps/web/app/console`, `apps/web/features/console`, `apps/web/lib/console`, `packages/application`, `packages/core/src` fora de `authorization`) em vez do repositório inteiro.
5. **`getAggregatorPool` já existe** (`apps/web/lib/infrastructure/database/client`, reexportado por `@/lib/db`) — T7/T14 não precisam criar um pool novo para o papel `albora_agregador`.
6. **O rate limiter em memória já existe, mas na camada errada.** `apps/web/lib/infrastructure/background/rate-limit-store.ts` é exatamente o primitivo que T10 precisa, mas vive em `apps/web/lib` — e `packages/application` não pode importar de `apps/web` (a dependência é `app → application`, nunca o contrário). T10 escreve um limitador local minúsculo em `packages/application/src/staff/rate-limit.ts` (mesma forma, ~15 linhas) em vez de cruzar a camada.
7. **`logger` (masking de PII) existe em `packages/core/src/structured-logging.ts` mas não estava exportado no barrel.** T3 adiciona `export { logger } from "./structured-logging"` em `packages/core/src/index.ts` — T5 (`insertSecurityEvent` nunca lança) e T7 dependem dele.
8. **Variáveis CSS reais são `--acento`, `--ink-3`, `--critico`, `--linha`** (sem prefixo `cor-`), confirmadas em `apps/web/app/tailwind.css`. Os gráficos SVG de T13 usam esses nomes exatos em `fill`/`stroke` — Tailwind não alcança atributos SVG, então o token entra via `var(--acento)` direto.
9. **`packages/db` não expõe `./testes/banco` como subpath** (`package.json` só declara `.", "./events", "./sessions", ...`). T6 adiciona esse subpath ao `exports` map — sem isso, os testes de `packages/application` (que rodam contra Postgres real, nunca mock) não conseguem chamar `prepararBanco()`.
10. **Nenhum pacote do monorepo tem `vitest.config.ts` próprio.** Testes rodam via `vitest.config.ts` na raiz (dois projetos, `node` e `jsdom`, por glob). `packages/application` não precisa de `vitest.config.ts` — precisa de `package.json` e `tsconfig.json` no molde de `packages/core`, mais uma entrada nova em `server.deps.inline` (raiz) e em `tsconfig.json` (raiz, `references`).

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/migrations/0060_audit_e_security.sql` | Tabelas `audit_log` (append-only) e `security_events` |
| `packages/db/migrations/0061_migrar_operadores_para_staff.sql` | Migração de legado: `platform_operators` → `staff_users`/`owner` |
| `packages/core/src/authorization/types.ts` | `Capability`, `StaffRole`, `Actor`, `Decision`, `AuthorizationRequest`, `Policy` |
| `packages/core/src/authorization/roles.ts` | `ROLE_CAPABILITIES` (owner com prova de exaustão) |
| `packages/core/src/authorization/capabilities.ts` | `ALL_CAPABILITIES`, `hasCapability` |
| `packages/core/src/authorization/policies.ts` | `POLICIES`, `REAUTH_MAX_AGE_SECONDS`, `REFUND_APPROVAL_THRESHOLD_CENTS` |
| `packages/core/src/authorization/authorize.ts` | `authorize(req): Decision` |
| `packages/core/src/authorization/index.ts` | Barrel do módulo |
| `packages/core/src/authorization/authorize.test.ts` | Testes de papel, política de reauth, política de refund |
| `packages/core/src/index.ts` | Modificado: exporta `authorization` e `logger` |
| `packages/db/src/staff.ts` | Repositório de `staff_users`/`staff_magic_links`/`staff_sessions`/`staff_role_assignments` |
| `packages/db/src/staff.test.ts` | Consumo duplo, sessão expirada/ociosa/revogada/suspensa, cadeia de rotação |
| `packages/db/src/audit.ts` | `insertAuditLog`, `listAuditLog`, `insertSecurityEvent`, `listSecurityEvents` |
| `packages/db/src/audit.test.ts` | Append-only por GRANT, CHECK de `reason`, caminho feliz |
| `packages/db/src/index.ts` | Modificado: exporta `staff.ts`, `audit.ts` |
| `packages/db/package.json` | Modificado: subpath `./testes/banco` |
| `packages/application/package.json` | Scaffold do pacote novo |
| `packages/application/tsconfig.json` | Scaffold do pacote novo |
| `packages/application/src/envelope/types.ts` | `ExecuteCommandInput<T>`, `ExecuteQueryInput<T>` |
| `packages/application/src/envelope/errors.ts` | `CommandDeniedError`, `ReauthRequiredError`, `ApprovalRequiredError` |
| `packages/application/src/envelope/command.ts` | `executeCommand` |
| `packages/application/src/envelope/query.ts` | `executeQuery` |
| `packages/application/src/envelope/command.test.ts` | Rollback (prova real, sem mock), negação, reauth, approval, caminho feliz |
| `packages/application/src/envelope/query.test.ts` | Caminho feliz, negado grava `security_events` |
| `packages/application/src/platform/aggregation.ts` | `withPlatformAggregation` |
| `packages/application/src/platform/aggregation.test.ts` | `reason` vazio, negado, caminho feliz |
| `packages/application/src/staff/rate-limit.ts` | Limitador em memória local (não cruza para `apps/web`) |
| `packages/application/src/staff/token.ts` | `generateStaffToken`, `hashStaffToken` |
| `packages/application/src/staff/request-login.ts` | `requestStaffLogin` |
| `packages/application/src/staff/request-login.test.ts` | Anti-enumeração, rate limit |
| `packages/application/src/staff/complete-login.ts` | `completeStaffLogin` |
| `packages/application/src/staff/complete-login.test.ts` | Uso único do magic link |
| `packages/application/src/index.ts` | Barrel do pacote |
| `tsconfig.json` (raiz) | Modificado: referência a `packages/application` |
| `vitest.config.ts` (raiz) | Modificado: `@albora/application` em `server.deps.inline` |
| `tools/guards/camadas.mjs` | Guard das 3 regras de camada (ADR 0016) |
| `tools/guards/fixtures/camadas/**` | Fixtures violadoras das 3 regras |
| `tools/guards/todos.mjs` | Modificado: registra `camadas` |
| `tools/guards/guards.test.mjs` | Modificado: registra `camadas` |
| `.github/workflows/ci.yml` | Modificado: step `camadas` no job `guards` |
| `apps/web/lib/console/staff-session.ts` | Cookie `albora_staff`, TTLs, rotação, detecção de reuso |
| `apps/web/lib/console/staff-session.test.ts` | Expirado/ocioso/revogado/reuso/rotação |
| `apps/web/lib/console/actor.ts` | Fachada: reexporta `resolveActor`/`Actor` |
| `apps/web/lib/console/actor.test.ts` | Reexport funciona |
| `apps/web/app/console/login/page.tsx` | Página de login do staff |
| `apps/web/app/console/login/actions.ts` | Server actions: pedir/consumir magic link |
| `apps/web/features/console/components/client/login-form.tsx` | Formulário client |
| `packages/ui-web/src/data-table.tsx` | `DataTable<T>` genérico |
| `packages/ui-web/src/data-table.test.tsx` | `aria-sort`, vazio, paginação, teclado |
| `packages/ui-web/src/chart.tsx` | `Sparkline`, `BarChart`, `Donut` |
| `packages/ui-web/src/chart.test.tsx` | `aria-label`, série vazia |
| `packages/ui-web/src/page-header.tsx` | `PageHeader` |
| `packages/ui-web/src/status-badge.tsx` | `StatusBadge` |
| `packages/ui-web/src/status-badge.test.tsx` | Sem hex em nenhum tom |
| `packages/ui-web/src/empty-state.tsx` | `EmptyState` |
| `packages/ui-web/src/index.ts` | Modificado: exporta os 5 componentes novos |
| `apps/web/features/console/components/server/console-nav.tsx` | `CONSOLE_NAV_ITEMS`, `visibleNavItems`, `ConsoleNav` |
| `apps/web/features/console/components/server/console-nav.test.ts` | Filtro por capacidade |
| `apps/web/features/console/components/server/console-shell.tsx` | `ConsoleShell` (sidebar + conteúdo) |
| `apps/web/app/console/layout.tsx` | Resolve ator, redireciona sem ator |
| `apps/web/app/console/layout.test.ts` | Redireciona sem ator |
| `apps/web/app/console/page.tsx` | Placeholder honesto |

---

### Task 1: Schema de identidade de staff — **JÁ CONCLUÍDA** (commits `ac32c95` + `bcc1b16`)

`packages/db/migrations/0059_staff_identidade.sql` já cria `staff_users`, `staff_magic_links`, `staff_sessions` (com `last_used_at`, `reauthenticated_at`, `rotated_from`, `revoked_at`) e `staff_role_assignments` (`role` com `CHECK IN ('owner','support','finance','compliance','engineering')`). Não replanejar. A execução começa na Task 2.

---

### Task 2: Migration de auditoria e eventos de segurança

**Files:**
- Create: `packages/db/migrations/0060_audit_e_security.sql`

**Interfaces:**
- Produces: tabelas `audit_log` e `security_events` que T5 envolve em funções TypeScript.

- [ ] **Step 1: Escrever o teste que falha**

`packages/db/src/audit.test.ts` (arquivo completo — ver Task 5) importa `insertAuditLog` de `./audit`, que ainda não existe, e a migration ainda não roda. Rodar a suíte de Task 5 primeiro é o que prova a falha; aqui o passo imediato é confirmar que a tabela não existe.

```ts
// prova mínima, descartável — roda uma vez para confirmar a falha, não fica no repo
import { prepararBanco } from "./testes/banco";

async function verificarQueTabelaNaoExiste() {
  const { admin } = await prepararBanco();
  await admin.query("SELECT 1 FROM audit_log LIMIT 1");
}

verificarQueTabelaNaoExiste();
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && cd packages/db && node --loader tsx --eval "$(cat <<'EOF'
import { prepararBanco } from './src/testes/banco';
prepararBanco().then(({admin}) => admin.query('SELECT 1 FROM audit_log LIMIT 1')).catch(e => { console.error(e.message); process.exit(1); });
EOF
)"`

Expected: FAIL com `relation "audit_log" does not exist`.

- [ ] **Step 3: Implementar o mínimo**

```sql
-- 0060_audit_e_security.sql
-- Auditoria de negócio e eventos de segurança (ADR 0016 §5). Duas tabelas,
-- não três: application_logs é observabilidade, vai para stdout.

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  actor_kind text NOT NULL CHECK (actor_kind IN ('staff','system','host')),
  actor_id uuid,
  actor_label text,                 -- mascarado, NUNCA PII crua
  action text NOT NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('account','event','ticket','subscription','staff_user','platform')),
  target_id text,
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  ip_hash text
);
CREATE INDEX audit_log_at ON audit_log (at DESC);
CREATE INDEX audit_log_actor ON audit_log (actor_id, at DESC);
CREATE INDEX audit_log_target ON audit_log (target_kind, target_id, at DESC);

CREATE TABLE security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('login.failed','magic_link.abuse','capability.denied','rate_limit.exceeded','session.reuse','reauth.failed')),
  actor_kind text,
  actor_id uuid,
  ip_hash text,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX security_events_at ON security_events (at DESC);
CREATE INDEX security_events_kind ON security_events (kind, at DESC);

-- append-only por GRANT: a aplicação insere e lê, nunca corrige nem apaga
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;
GRANT INSERT, SELECT ON audit_log TO albora_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM albora_app;
GRANT INSERT, SELECT ON security_events TO albora_app;
```

Papel confirmado por `grep -rn "GRANT\|CREATE ROLE" packages/db/migrations/`: `packages/db/migrations/0002_papeis.sql` cria `albora_app` (sem `BYPASSRLS`) e `albora_agregador` (`BYPASSRLS`). O GRANT acima usa `albora_app`, exatamente como a espinha previu — sem divergência aqui.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db test`

Expected: a suíte de `audit.test.ts` (Task 5) ainda falha por falta de `./audit.ts` — mas o erro muda de "relation does not exist" para "Cannot find module './audit'", provando que a migration aplicou.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/migrations/0060_audit_e_security.sql
git commit -m "$(cat <<'EOF'
feat(db): migration de audit_log e security_events

Duas tabelas de registro (ADR 0016 §5): audit_log append-only por GRANT
para negócio/compliance, security_events para eventos de alto volume.
application_logs não vira tabela — é stdout.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Autorização pura em `packages/core`

**Files:**
- Create: `packages/core/src/authorization/types.ts`
- Create: `packages/core/src/authorization/roles.ts`
- Create: `packages/core/src/authorization/capabilities.ts`
- Create: `packages/core/src/authorization/policies.ts`
- Create: `packages/core/src/authorization/authorize.ts`
- Create: `packages/core/src/authorization/index.ts`
- Test: `packages/core/src/authorization/authorize.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: nada (zero import de `@albora/db`, `@albora/application` ou `apps/*` — guard `camadas` de T8 bloqueia isso).
- Produces: `Actor`, `Capability`, `StaffRole`, `Decision`, `AuthorizationRequest`, `Policy`, `authorize`, `hasCapability`, `ALL_CAPABILITIES`, `ROLE_CAPABILITIES`, `POLICIES`, `REAUTH_MAX_AGE_SECONDS`, `REFUND_APPROVAL_THRESHOLD_CENTS` — tudo reexportado por `@albora/core` (T4, T6, T7, T9, T14 importam daqui).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/core/src/authorization/authorize.test.ts
import { describe, expect, it } from "vitest";
import {
  ALL_CAPABILITIES,
  authorize,
  hasCapability,
  REAUTH_MAX_AGE_SECONDS,
  REFUND_APPROVAL_THRESHOLD_CENTS,
  ROLE_CAPABILITIES,
} from "./index";
import type { Actor, StaffRole } from "./types";

function actor(roles: StaffRole[], overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles,
    sessionId: "sess-1",
    requestId: "req-1",
    reauthenticatedAt: null,
    ...overrides,
  };
}

describe("papéis recebem exatamente suas capacidades", () => {
  it.each(Object.keys(ROLE_CAPABILITIES) as StaffRole[])("%s", (role) => {
    for (const capability of ALL_CAPABILITIES) {
      const esperado = ROLE_CAPABILITIES[role].includes(capability);
      expect(hasCapability([role], capability)).toBe(esperado);
    }
  });

  it("owner recebe todas", () => {
    expect(ROLE_CAPABILITIES.owner).toEqual(ALL_CAPABILITIES);
  });
});

describe("papel sem a capacidade é negado", () => {
  it("engineering não tem subscription.refund", () => {
    const decisao = authorize({ actor: actor(["engineering"]), capability: "subscription.refund" });
    expect(decisao.kind).toBe("denied");
  });
});

describe("política de reauth", () => {
  const now = new Date("2026-09-04T12:00:00Z");

  it("timestamp fresco passa", () => {
    const decisao = authorize({
      actor: actor(["compliance"], { reauthenticatedAt: new Date(now.getTime() - 60_000) }),
      capability: "lgpd.delete_account",
      now,
    });
    expect(decisao).toEqual({ kind: "allowed" });
  });

  it("timestamp stale exige reauth", () => {
    const decisao = authorize({
      actor: actor(["compliance"], {
        reauthenticatedAt: new Date(now.getTime() - (REAUTH_MAX_AGE_SECONDS + 1) * 1000),
      }),
      capability: "lgpd.delete_account",
      now,
    });
    expect(decisao).toEqual({ kind: "needsReauth", maxAgeSeconds: REAUTH_MAX_AGE_SECONDS });
  });

  it("sem reautenticação nenhuma também exige reauth", () => {
    const decisao = authorize({
      actor: actor(["compliance"], { reauthenticatedAt: null }),
      capability: "lgpd.delete_account",
      now,
    });
    expect(decisao.kind).toBe("needsReauth");
  });

  it("owner também cai em needsReauth para lgpd.delete_account", () => {
    const decisao = authorize({ actor: actor(["owner"]), capability: "lgpd.delete_account", now });
    expect(decisao.kind).toBe("needsReauth");
  });
});

describe("política de refund", () => {
  it("abaixo do limiar é permitido", () => {
    const decisao = authorize({
      actor: actor(["finance"]),
      capability: "subscription.refund",
      context: { amountCents: REFUND_APPROVAL_THRESHOLD_CENTS - 1 },
    });
    expect(decisao).toEqual({ kind: "allowed" });
  });

  it("acima do limiar exige aprovação", () => {
    const decisao = authorize({
      actor: actor(["finance"]),
      capability: "subscription.refund",
      context: { amountCents: REFUND_APPROVAL_THRESHOLD_CENTS + 1 },
    });
    expect(decisao).toEqual({ kind: "needsApproval", approverCapability: "subscription.refund" });
  });

  it("sem amountCents é negado", () => {
    const decisao = authorize({ actor: actor(["finance"]), capability: "subscription.refund" });
    expect(decisao.kind).toBe("denied");
  });
});

describe("impersonação sempre exige aprovação", () => {
  it("support pede, owner aprova", () => {
    const decisao = authorize({ actor: actor(["support"]), capability: "impersonate.request" });
    expect(decisao).toEqual({ kind: "needsApproval", approverCapability: "impersonate.approve" });
  });
});

describe("staff.manage exige reauth", () => {
  it("stale exige reauth mesmo para owner", () => {
    const decisao = authorize({
      actor: actor(["owner"], { reauthenticatedAt: null }),
      capability: "staff.manage",
    });
    expect(decisao.kind).toBe("needsReauth");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/core exec vitest run src/authorization/authorize.test.ts`

Expected: FAIL com `Cannot find module './index'` (nenhum arquivo do módulo existe ainda).

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/core/src/authorization/types.ts
export type Capability =
  | "analytics.platform.read" | "accounts.read" | "accounts.pii.reveal" | "events.read"
  | "tickets.read" | "tickets.write" | "tickets.assign"
  | "subscription.read" | "subscription.mutate" | "subscription.refund"
  | "lgpd.dsar.read" | "lgpd.dsar.execute" | "lgpd.delete_account"
  | "retention.read" | "impersonate.request" | "impersonate.approve"
  | "staff.manage" | "audit.read" | "security.read";

export type StaffRole = "owner" | "support" | "finance" | "compliance" | "engineering";

export type Actor = {
  staffUserId: string;
  roles: readonly StaffRole[];
  sessionId: string;
  requestId: string;
  reauthenticatedAt: Date | null;
};

export type Decision =
  | { kind: "allowed" }
  | { kind: "denied"; reason: string }
  | { kind: "needsApproval"; approverCapability: Capability }
  | { kind: "needsReauth"; maxAgeSeconds: number };

export type AuthorizationRequest = {
  actor: Actor;
  capability: Capability;
  resource?: { kind: string; id: string };
  context?: Record<string, unknown>;
  now?: Date;
};

export type Policy = (req: AuthorizationRequest) => Decision;
```

```ts
// packages/core/src/authorization/roles.ts
import type { Capability, StaffRole } from "./types";

const OWNER_CAPABILITIES = [
  "analytics.platform.read", "accounts.read", "accounts.pii.reveal", "events.read",
  "tickets.read", "tickets.write", "tickets.assign",
  "subscription.read", "subscription.mutate", "subscription.refund",
  "lgpd.dsar.read", "lgpd.dsar.execute", "lgpd.delete_account",
  "retention.read", "impersonate.request", "impersonate.approve",
  "staff.manage", "audit.read", "security.read",
] as const satisfies readonly Capability[];

// Se `Capability` ganhar um membro sem entrar aqui, esta linha para de
// compilar — owner precisa ser "todas", não "todas as que alguém lembrou".
type AssertaCompleto<T extends readonly Capability[]> = Capability extends T[number] ? T : never;
const OWNER_COMPLETO: AssertaCompleto<typeof OWNER_CAPABILITIES> = OWNER_CAPABILITIES;

export const ROLE_CAPABILITIES: Readonly<Record<StaffRole, readonly Capability[]>> = {
  owner: OWNER_COMPLETO,
  support: [
    "analytics.platform.read", "accounts.read", "accounts.pii.reveal", "events.read",
    "tickets.read", "tickets.write", "tickets.assign",
    "subscription.read", "impersonate.request",
  ],
  finance: [
    "analytics.platform.read", "accounts.read",
    "subscription.read", "subscription.mutate", "subscription.refund",
    "tickets.read",
  ],
  compliance: [
    "accounts.read", "accounts.pii.reveal",
    "lgpd.dsar.read", "lgpd.dsar.execute", "lgpd.delete_account",
    "retention.read", "audit.read", "security.read", "events.read",
  ],
  engineering: [
    "analytics.platform.read", "events.read", "retention.read", "tickets.read", "security.read",
  ],
};
```

```ts
// packages/core/src/authorization/capabilities.ts
import type { Capability, StaffRole } from "./types";
import { ROLE_CAPABILITIES } from "./roles";

export const ALL_CAPABILITIES: readonly Capability[] = ROLE_CAPABILITIES.owner;

export function hasCapability(roles: readonly StaffRole[], capability: Capability): boolean {
  return roles.some((role) => ROLE_CAPABILITIES[role].includes(capability));
}
```

```ts
// packages/core/src/authorization/policies.ts
import type { AuthorizationRequest, Capability, Decision, Policy } from "./types";

export const REAUTH_MAX_AGE_SECONDS = 900;
// Limiar provisório — o valor definitivo é decisão de negócio da Onda C (ADR 0016, "Fica em aberto").
export const REFUND_APPROVAL_THRESHOLD_CENTS = 50_000;

function reauthPolicy(): Policy {
  return (req: AuthorizationRequest): Decision => {
    const now = req.now ?? new Date();
    const at = req.actor.reauthenticatedAt;
    if (!at || now.getTime() - at.getTime() > REAUTH_MAX_AGE_SECONDS * 1000) {
      return { kind: "needsReauth", maxAgeSeconds: REAUTH_MAX_AGE_SECONDS };
    }
    return { kind: "allowed" };
  };
}

function impersonateRequestPolicy(): Policy {
  return (): Decision => ({ kind: "needsApproval", approverCapability: "impersonate.approve" });
}

function refundPolicy(): Policy {
  return (req: AuthorizationRequest): Decision => {
    const amountCents = req.context?.["amountCents"];
    if (typeof amountCents !== "number") {
      return { kind: "denied", reason: "valor do reembolso é obrigatório" };
    }
    if (amountCents > REFUND_APPROVAL_THRESHOLD_CENTS) {
      return { kind: "needsApproval", approverCapability: "subscription.refund" };
    }
    return { kind: "allowed" };
  };
}

export const POLICIES: Partial<Record<Capability, Policy>> = {
  "lgpd.delete_account": reauthPolicy(),
  "staff.manage": reauthPolicy(),
  "impersonate.request": impersonateRequestPolicy(),
  "subscription.refund": refundPolicy(),
};
```

```ts
// packages/core/src/authorization/authorize.ts
import { hasCapability } from "./capabilities";
import { POLICIES } from "./policies";
import type { AuthorizationRequest, Decision } from "./types";

export function authorize(req: AuthorizationRequest): Decision {
  if (!hasCapability(req.actor.roles, req.capability)) {
    return { kind: "denied", reason: `ator sem a capacidade ${req.capability}` };
  }
  const policy = POLICIES[req.capability];
  if (!policy) return { kind: "allowed" };
  return policy(req);
}
```

```ts
// packages/core/src/authorization/index.ts
export type { Actor, AuthorizationRequest, Capability, Decision, Policy, StaffRole } from "./types";
export { ALL_CAPABILITIES, hasCapability } from "./capabilities";
export { ROLE_CAPABILITIES } from "./roles";
export { POLICIES, REAUTH_MAX_AGE_SECONDS, REFUND_APPROVAL_THRESHOLD_CENTS } from "./policies";
export { authorize } from "./authorize";
```

Modificar `packages/core/src/index.ts` — adicionar ao final:

```ts
export type { Actor, AuthorizationRequest, Capability, Decision, Policy, StaffRole } from "./authorization";
export {
  ALL_CAPABILITIES,
  authorize,
  hasCapability,
  POLICIES,
  REAUTH_MAX_AGE_SECONDS,
  REFUND_APPROVAL_THRESHOLD_CENTS,
  ROLE_CAPABILITIES,
} from "./authorization";
export { logger } from "./structured-logging";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/core exec vitest run src/authorization/authorize.test.ts && pnpm --filter @albora/core typecheck`

Expected: PASS — todos os `it`/`it.each` verdes, `tsc --noEmit` sem erro.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/core/src/authorization packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): autorização por capacidade e política

authorize(actor, capability, resource?, context?) -> Decision com quatro
saídas (allowed/denied/needsApproval/needsReauth). Papel->capacidade em
código (ROLE_CAPABILITIES), quem-tem-qual-papel fica no banco (T4).
owner não escapa de política de reauth (ADR 0016 §4).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Repositório de identidade de staff em `packages/db`

**Files:**
- Create: `packages/db/src/staff.ts`
- Test: `packages/db/src/staff.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Consumes: schema de T1 (`staff_users`, `staff_magic_links`, `staff_sessions`, `staff_role_assignments`).
- Produces: `StaffUserRow`, `ResolvedStaffSession`, e as 13 funções abaixo — T9 e T10 as importam de `@albora/db`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/staff.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import {
  assignStaffRole,
  consumeStaffMagicLink,
  createStaffMagicLink,
  createStaffSession,
  createStaffUser,
  findSessionEvenIfRevoked,
  findStaffByEmail,
  resolveStaffSession,
  revokeSessionChain,
  revokeStaffSession,
  touchStaffSession,
} from "./staff";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

function tokenHash(): string {
  return createHash("sha256").update(randomBytes(16)).digest("hex");
}

describe("magic link de staff", () => {
  it("consumo duplo do mesmo link retorna null na segunda vez", async () => {
    const staff = await createStaffUser(admin, { email: "duplo@equipe.test", name: "Duplo" });
    const hash = tokenHash();
    await createStaffMagicLink(admin, {
      staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 900_000),
    });

    const primeiro = await consumeStaffMagicLink(admin, hash);
    expect(primeiro).toBe(staff.id);

    const segundo = await consumeStaffMagicLink(admin, hash);
    expect(segundo).toBeNull();
  });
});

describe("resolveStaffSession", () => {
  it("sessão expirada resolve null", async () => {
    const staff = await createStaffUser(admin, { email: "expirada@equipe.test", name: "Expirada" });
    await assignStaffRole(admin, staff.id, "support");
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() - 1000) });
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("sessão ociosa resolve null", async () => {
    const staff = await createStaffUser(admin, { email: "ociosa@equipe.test", name: "Ociosa" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await admin.query("UPDATE staff_sessions SET last_used_at = now() - interval '1 hour' WHERE token_hash = $1", [hash]);
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("sessão revogada resolve null", async () => {
    const staff = await createStaffUser(admin, { email: "revogada@equipe.test", name: "Revogada" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await revokeStaffSession(admin, hash);
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("usuário suspended resolve null mesmo com sessão válida", async () => {
    const staff = await createStaffUser(admin, { email: "suspenso@equipe.test", name: "Suspenso" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await admin.query("UPDATE staff_users SET status = 'suspended' WHERE id = $1", [staff.id]);
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("sessão válida resolve staffUserId e reauthenticatedAt", async () => {
    const staff = await createStaffUser(admin, { email: "valida@equipe.test", name: "Valida" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    const resolvida = await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 });
    expect(resolvida?.staffUserId).toBe(staff.id);
    expect(resolvida?.reauthenticatedAt).toBeNull();
  });
});

describe("revokeSessionChain", () => {
  it("rotação encadeada revoga toda a cadeia", async () => {
    const staff = await createStaffUser(admin, { email: "cadeia@equipe.test", name: "Cadeia" });
    const h1 = tokenHash();
    const h2 = tokenHash();
    const h3 = tokenHash();

    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: h1, expiresAt: new Date(Date.now() + 3_600_000) });
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: h2, expiresAt: new Date(Date.now() + 3_600_000), rotatedFrom: h1 });
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: h3, expiresAt: new Date(Date.now() + 3_600_000), rotatedFrom: h2 });

    const revogadas = await revokeSessionChain(admin, h1);
    expect(revogadas).toBe(3);

    for (const h of [h1, h2, h3]) {
      const linha = await findSessionEvenIfRevoked(admin, h);
      expect(linha?.revokedAt).not.toBeNull();
    }
  });
});

describe("touchStaffSession", () => {
  it("atualiza last_used_at", async () => {
    const staff = await createStaffUser(admin, { email: "toque@equipe.test", name: "Toque" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await admin.query("UPDATE staff_sessions SET last_used_at = now() - interval '10 minutes' WHERE token_hash = $1", [hash]);
    await touchStaffSession(admin, hash);
    const { rows } = await admin.query<{ last_used_at: Date }>("SELECT last_used_at FROM staff_sessions WHERE token_hash = $1", [hash]);
    expect(Date.now() - rows[0]!.last_used_at.getTime()).toBeLessThan(5000);
  });
});

describe("findStaffByEmail", () => {
  it("normaliza e-mail em minúsculas", async () => {
    await createStaffUser(admin, { email: "Maiuscula@Equipe.test", name: "Maiuscula" });
    const achado = await findStaffByEmail(admin, "MAIUSCULA@equipe.TEST");
    expect(achado?.email).toBe("maiuscula@equipe.test");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/staff.test.ts`

Expected: FAIL com `Cannot find module './staff'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/staff.ts
import type { Pool, PoolClient } from "pg";

export type StaffRole = "owner" | "support" | "finance" | "compliance" | "engineering";
export type StaffUserStatus = "active" | "suspended";

export type StaffUserRow = {
  id: string;
  email: string;
  name: string;
  status: StaffUserStatus;
  createdAt: Date;
  lastSeenAt: Date | null;
};

export type ResolvedStaffSession = {
  staffUserId: string;
  reauthenticatedAt: Date | null;
  createdAt: Date;
};

type Queryable = Pool | PoolClient;

type StaffUserDbRow = {
  id: string; email: string; name: string; status: StaffUserStatus;
  created_at: Date; last_seen_at: Date | null;
};

function rowToStaffUser(row: StaffUserDbRow): StaffUserRow {
  return {
    id: row.id, email: row.email, name: row.name, status: row.status,
    createdAt: row.created_at, lastSeenAt: row.last_seen_at,
  };
}

const SELECT_STAFF_USER = "SELECT id, email, name, status, created_at, last_seen_at FROM staff_users";

export async function createStaffUser(
  db: Queryable,
  entrada: { email: string; name: string },
): Promise<StaffUserRow> {
  const { rows } = await db.query<StaffUserDbRow>(
    `INSERT INTO staff_users (email, name) VALUES ($1, $2)
     RETURNING id, email, name, status, created_at, last_seen_at`,
    [entrada.email.trim().toLowerCase(), entrada.name],
  );
  return rowToStaffUser(rows[0]!);
}

export async function findStaffByEmail(db: Queryable, email: string): Promise<StaffUserRow | null> {
  const { rows } = await db.query<StaffUserDbRow>(`${SELECT_STAFF_USER} WHERE email = $1`, [
    email.trim().toLowerCase(),
  ]);
  const row = rows[0];
  return row ? rowToStaffUser(row) : null;
}

export async function findStaffById(db: Queryable, id: string): Promise<StaffUserRow | null> {
  const { rows } = await db.query<StaffUserDbRow>(`${SELECT_STAFF_USER} WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? rowToStaffUser(row) : null;
}

export async function listStaffRoles(db: Queryable, staffUserId: string): Promise<StaffRole[]> {
  const { rows } = await db.query<{ role: StaffRole }>(
    "SELECT role FROM staff_role_assignments WHERE staff_user_id = $1 ORDER BY role",
    [staffUserId],
  );
  return rows.map((r) => r.role);
}

export async function assignStaffRole(db: Queryable, staffUserId: string, role: StaffRole): Promise<void> {
  await db.query(
    `INSERT INTO staff_role_assignments (staff_user_id, role) VALUES ($1, $2)
     ON CONFLICT (staff_user_id, role) DO NOTHING`,
    [staffUserId, role],
  );
}

export async function removeStaffRole(db: Queryable, staffUserId: string, role: StaffRole): Promise<void> {
  await db.query("DELETE FROM staff_role_assignments WHERE staff_user_id = $1 AND role = $2", [staffUserId, role]);
}

export async function createStaffMagicLink(
  db: Queryable,
  entrada: { staffUserId: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db.query(
    "INSERT INTO staff_magic_links (token_hash, staff_user_id, expires_at) VALUES ($1, $2, $3)",
    [entrada.tokenHash, entrada.staffUserId, entrada.expiresAt],
  );
}

/** Consome e marca usado em UM statement — dois cliques simultâneos no mesmo link não podem consumir ambos. */
export async function consumeStaffMagicLink(db: Queryable, tokenHash: string): Promise<string | null> {
  const { rows } = await db.query<{ staff_user_id: string }>(
    `UPDATE staff_magic_links SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING staff_user_id`,
    [tokenHash],
  );
  return rows[0]?.staff_user_id ?? null;
}

export async function createStaffSession(
  db: Queryable,
  entrada: { staffUserId: string; tokenHash: string; expiresAt: Date; rotatedFrom?: string },
): Promise<void> {
  await db.query(
    "INSERT INTO staff_sessions (token_hash, staff_user_id, expires_at, rotated_from) VALUES ($1, $2, $3, $4)",
    [entrada.tokenHash, entrada.staffUserId, entrada.expiresAt, entrada.rotatedFrom ?? null],
  );
}

/** Junta com staff_users exigindo status='active'; filtra expirada, revogada e ociosa além do TTL informado. */
export async function resolveStaffSession(
  db: Queryable,
  tokenHash: string,
  opts: { idleMaxSeconds: number; now?: Date },
): Promise<ResolvedStaffSession | null> {
  const now = opts.now ?? new Date();
  const { rows } = await db.query<{ staff_user_id: string; reauthenticated_at: Date | null; created_at: Date }>(
    `SELECT s.staff_user_id, s.reauthenticated_at, s.created_at
       FROM staff_sessions s JOIN staff_users u ON u.id = s.staff_user_id
      WHERE s.token_hash = $1
        AND u.status = 'active'
        AND s.expires_at > $2
        AND s.revoked_at IS NULL
        AND s.last_used_at > $2 - make_interval(secs => $3)`,
    [tokenHash, now, opts.idleMaxSeconds],
  );
  const row = rows[0];
  return row
    ? { staffUserId: row.staff_user_id, reauthenticatedAt: row.reauthenticated_at, createdAt: row.created_at }
    : null;
}

export async function touchStaffSession(db: Queryable, tokenHash: string): Promise<void> {
  await db.query("UPDATE staff_sessions SET last_used_at = now() WHERE token_hash = $1", [tokenHash]);
}

export async function revokeStaffSession(db: Queryable, tokenHash: string): Promise<void> {
  await db.query(
    "UPDATE staff_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [tokenHash],
  );
}

/** Sobe/desce a cadeia por rotated_from via CTE recursiva (ambas as direções) e revoga tudo. */
export async function revokeSessionChain(db: Queryable, tokenHash: string): Promise<number> {
  const { rows } = await db.query<{ token_hash: string }>(
    `WITH RECURSIVE cadeia AS (
       SELECT token_hash, rotated_from FROM staff_sessions WHERE token_hash = $1
       UNION
       SELECT s.token_hash, s.rotated_from FROM staff_sessions s JOIN cadeia c ON s.token_hash = c.rotated_from
       UNION
       SELECT s.token_hash, s.rotated_from FROM staff_sessions s JOIN cadeia c ON s.rotated_from = c.token_hash
     )
     UPDATE staff_sessions SET revoked_at = now()
      WHERE token_hash IN (SELECT token_hash FROM cadeia) AND revoked_at IS NULL
      RETURNING token_hash`,
    [tokenHash],
  );
  return rows.length;
}

export async function findSessionEvenIfRevoked(
  db: Queryable,
  tokenHash: string,
): Promise<{ revokedAt: Date | null } | null> {
  const { rows } = await db.query<{ revoked_at: Date | null }>(
    "SELECT revoked_at FROM staff_sessions WHERE token_hash = $1",
    [tokenHash],
  );
  const row = rows[0];
  return row ? { revokedAt: row.revoked_at } : null;
}

export async function markReauthenticated(db: Queryable, tokenHash: string): Promise<void> {
  await db.query("UPDATE staff_sessions SET reauthenticated_at = now() WHERE token_hash = $1", [tokenHash]);
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type { ResolvedStaffSession, StaffRole, StaffUserRow, StaffUserStatus } from "./staff";
export {
  assignStaffRole,
  consumeStaffMagicLink,
  createStaffMagicLink,
  createStaffSession,
  createStaffUser,
  findSessionEvenIfRevoked,
  findStaffByEmail,
  findStaffById,
  listStaffRoles,
  markReauthenticated,
  removeStaffRole,
  resolveStaffSession,
  revokeSessionChain,
  revokeStaffSession,
  touchStaffSession,
} from "./staff";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/staff.test.ts && pnpm --filter @albora/db typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/staff.ts packages/db/src/staff.test.ts packages/db/src/index.ts
git commit -m "$(cat <<'EOF'
feat(db): repositório de identidade de staff

Magic link de uso único (consumo e marcação num só statement), sessão
com expiry/idade/ociosidade, rotação em cadeia revogável via CTE
recursiva. Hash em text (sha256 hex), não bytea — schema de 0059 já
define assim, diferente do host (HMAC + bytea).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Auditoria e eventos de segurança em `packages/db`

**Files:**
- Create: `packages/db/src/audit.ts`
- Test: `packages/db/src/audit.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Consumes: `logger` de `@albora/core` (T3); tabelas de T2; `pools.app` de `prepararBanco()` (conecta como `albora_app`, sem `BYPASSRLS` — é o que prova o GRANT append-only de verdade).
- Produces: `AuditEntry`, `AuditRow`, `AuditLogFilter`, `SecurityEvent`, `SecurityEventRow`, `insertAuditLog`, `listAuditLog`, `insertSecurityEvent`, `listSecurityEvents` — T6 e T7 importam `insertAuditLog`/`insertSecurityEvent`/`listSecurityEvents` de `@albora/db`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/audit.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertAuditLog, insertSecurityEvent, listAuditLog, listSecurityEvents } from "./audit";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

describe("audit_log é append-only por GRANT", () => {
  it("UPDATE lança quando conectado como o papel da aplicação", async () => {
    const client = await app.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "staff", action: "test.append_only", targetKind: "platform", reason: "prova de append-only",
      });
      await expect(client.query("UPDATE audit_log SET reason = 'alterado'")).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it("DELETE lança quando conectado como o papel da aplicação", async () => {
    const client = await app.connect();
    try {
      await expect(client.query("DELETE FROM audit_log")).rejects.toThrow();
    } finally {
      client.release();
    }
  });
});

describe("reason vazio viola o CHECK", () => {
  it("string vazia lança", async () => {
    const client = await app.connect();
    try {
      await expect(
        insertAuditLog(client, { actorKind: "system", action: "x", targetKind: "platform", reason: "" }),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it("só espaço lança", async () => {
    const client = await app.connect();
    try {
      await expect(
        insertAuditLog(client, { actorKind: "system", action: "x", targetKind: "platform", reason: "   " }),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });
});

describe("caminho feliz", () => {
  it("grava e lista por target_kind", async () => {
    const client = await app.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "staff", action: "subscription.refund", targetKind: "subscription",
        targetId: "sub-1", reason: "reembolso solicitado pelo cliente",
      });
    } finally {
      client.release();
    }
    const { rows } = await listAuditLog(app, { targetKind: "subscription", limit: 10 });
    expect(rows.some((r) => r.action === "subscription.refund")).toBe(true);
  });
});

describe("security_events nunca lança", () => {
  it("insere normalmente e lista por kind", async () => {
    await expect(insertSecurityEvent(app, { kind: "login.failed" })).resolves.toBeUndefined();
    const { rows } = await listSecurityEvents(app, { kind: "login.failed", limit: 10 });
    expect(rows.some((r) => r.kind === "login.failed")).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/audit.test.ts`

Expected: FAIL com `Cannot find module './audit'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/audit.ts
import type { Pool, PoolClient } from "pg";
import { logger } from "@albora/core";

export type AuditActorKind = "staff" | "system" | "host";
export type AuditTargetKind = "account" | "event" | "ticket" | "subscription" | "staff_user" | "platform";

export type AuditEntry = {
  actorKind: AuditActorKind;
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  targetKind: AuditTargetKind;
  targetId?: string | null;
  reason: string;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  ipHash?: string | null;
};

export type AuditRow = {
  id: string;
  at: Date;
  actorKind: AuditActorKind;
  actorId: string | null;
  actorLabel: string | null;
  action: string;
  targetKind: AuditTargetKind;
  targetId: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  requestId: string | null;
  ipHash: string | null;
};

export type SecurityEventKind =
  | "login.failed" | "magic_link.abuse" | "capability.denied"
  | "rate_limit.exceeded" | "session.reuse" | "reauth.failed";

export type SecurityEvent = {
  kind: SecurityEventKind;
  actorKind?: string | null;
  actorId?: string | null;
  ipHash?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
};

export type SecurityEventRow = {
  id: string;
  at: Date;
  kind: SecurityEventKind;
  actorKind: string | null;
  actorId: string | null;
  ipHash: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
};

type Cursor = { at: string; id: string };

function encodeCursor(at: Date, id: string): string {
  return Buffer.from(JSON.stringify({ at: at.toISOString(), id } satisfies Cursor)).toString("base64url");
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
}

/** Recebe PoolClient de propósito — é o que permite a auditoria participar da transação do comando (ADR 0016 §2). */
export async function insertAuditLog(client: PoolClient, entry: AuditEntry): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO audit_log
       (actor_kind, actor_id, actor_label, action, target_kind, target_id, reason, metadata, request_id, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
     RETURNING id`,
    [
      entry.actorKind,
      entry.actorId ?? null,
      entry.actorLabel ?? null,
      entry.action,
      entry.targetKind,
      entry.targetId ?? null,
      entry.reason,
      JSON.stringify(entry.metadata ?? {}),
      entry.requestId ?? null,
      entry.ipHash ?? null,
    ],
  );
  return rows[0]!.id;
}

export type AuditLogFilter = {
  actorId?: string;
  targetKind?: AuditTargetKind;
  targetId?: string;
  action?: string;
  since?: Date;
  limit: number;
  cursor?: string;
};

type AuditDbRow = {
  id: string; at: Date; actor_kind: AuditActorKind; actor_id: string | null;
  actor_label: string | null; action: string; target_kind: AuditTargetKind;
  target_id: string | null; reason: string; metadata: Record<string, unknown>;
  request_id: string | null; ip_hash: string | null;
};

export async function listAuditLog(
  pool: Pool,
  filter: AuditLogFilter,
): Promise<{ rows: AuditRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.actorId) { params.push(filter.actorId); clauses.push(`actor_id = $${params.length}`); }
  if (filter.targetKind) { params.push(filter.targetKind); clauses.push(`target_kind = $${params.length}`); }
  if (filter.targetId) { params.push(filter.targetId); clauses.push(`target_id = $${params.length}`); }
  if (filter.action) { params.push(filter.action); clauses.push(`action = $${params.length}`); }
  if (filter.since) { params.push(filter.since); clauses.push(`at >= $${params.length}`); }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.at, c.id);
    clauses.push(`(at, id) < ($${params.length - 1}, $${params.length})`);
  }

  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<AuditDbRow>(
    `SELECT id, at, actor_kind, actor_id, actor_label, action, target_kind, target_id, reason, metadata, request_id, ip_hash
       FROM audit_log
       ${where}
      ORDER BY at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );

  const mapped: AuditRow[] = rows.map((r) => ({
    id: r.id, at: r.at, actorKind: r.actor_kind, actorId: r.actor_id, actorLabel: r.actor_label,
    action: r.action, targetKind: r.target_kind, targetId: r.target_id, reason: r.reason,
    metadata: r.metadata, requestId: r.request_id, ipHash: r.ip_hash,
  }));

  const last = mapped[mapped.length - 1];
  const nextCursor = mapped.length === filter.limit && last ? encodeCursor(last.at, last.id) : null;
  return { rows: mapped, nextCursor };
}

/** Caminho não-crítico: nunca derruba login (ou qualquer chamador) por falha de escrita de segurança. */
export async function insertSecurityEvent(pool: Pool, event: SecurityEvent): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO security_events (kind, actor_kind, actor_id, ip_hash, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        event.kind,
        event.actorKind ?? null,
        event.actorId ?? null,
        event.ipHash ?? null,
        event.requestId ?? null,
        JSON.stringify(event.metadata ?? {}),
      ],
    );
  } catch (erro) {
    logger.error("security_events.insercao_falhou", erro, { kind: event.kind });
  }
}

export type SecurityEventFilter = {
  kind?: SecurityEventKind;
  actorId?: string;
  since?: Date;
  limit: number;
  cursor?: string;
};

type SecurityEventDbRow = {
  id: string; at: Date; kind: SecurityEventKind; actor_kind: string | null;
  actor_id: string | null; ip_hash: string | null; request_id: string | null;
  metadata: Record<string, unknown>;
};

export async function listSecurityEvents(
  pool: Pool,
  filter: SecurityEventFilter,
): Promise<{ rows: SecurityEventRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.kind) { params.push(filter.kind); clauses.push(`kind = $${params.length}`); }
  if (filter.actorId) { params.push(filter.actorId); clauses.push(`actor_id = $${params.length}`); }
  if (filter.since) { params.push(filter.since); clauses.push(`at >= $${params.length}`); }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.at, c.id);
    clauses.push(`(at, id) < ($${params.length - 1}, $${params.length})`);
  }

  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<SecurityEventDbRow>(
    `SELECT id, at, kind, actor_kind, actor_id, ip_hash, request_id, metadata
       FROM security_events
       ${where}
      ORDER BY at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );

  const mapped: SecurityEventRow[] = rows.map((r) => ({
    id: r.id, at: r.at, kind: r.kind, actorKind: r.actor_kind, actorId: r.actor_id,
    ipHash: r.ip_hash, requestId: r.request_id, metadata: r.metadata,
  }));

  const last = mapped[mapped.length - 1];
  const nextCursor = mapped.length === filter.limit && last ? encodeCursor(last.at, last.id) : null;
  return { rows: mapped, nextCursor };
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type {
  AuditActorKind, AuditEntry, AuditLogFilter, AuditRow, AuditTargetKind,
  SecurityEvent, SecurityEventFilter, SecurityEventKind, SecurityEventRow,
} from "./audit";
export { insertAuditLog, insertSecurityEvent, listAuditLog, listSecurityEvents } from "./audit";
```

**Ruling aplicado:** `packages/db/src/testes/banco.ts` já devolve `app` conectado como `albora_app` sem `BYPASSRLS` (comentário no próprio arquivo: "`app` conecta como `albora_app`"). O teste de append-only usa esse pool diretamente — nenhum `it.skip` necessário.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/audit.test.ts && pnpm --filter @albora/db typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/audit.ts packages/db/src/audit.test.ts packages/db/src/index.ts
git commit -m "$(cat <<'EOF'
feat(db): repositório de audit_log e security_events

insertAuditLog recebe PoolClient de propósito (participa da tx do
comando). insertSecurityEvent nunca lança — captura e loga via
logger.error com masking de PII. Append-only provado contra o papel
albora_app de verdade, não superuser.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Pacote `packages/application` — envelopes de comando e consulta

**Files:**
- Create: `packages/application/package.json`
- Create: `packages/application/tsconfig.json`
- Create: `packages/application/src/envelope/types.ts`
- Create: `packages/application/src/envelope/errors.ts`
- Create: `packages/application/src/envelope/command.ts`
- Create: `packages/application/src/envelope/query.ts`
- Create: `packages/application/src/index.ts`
- Test: `packages/application/src/envelope/command.test.ts`
- Test: `packages/application/src/envelope/query.test.ts`
- Modify: `packages/db/package.json` (subpath `./testes/banco`)
- Modify: `tsconfig.json` (raiz)
- Modify: `vitest.config.ts` (raiz)

**Interfaces:**
- Consumes: `authorize`, `Actor`, `Capability` de `@albora/core` (T3); `insertAuditLog`, `insertSecurityEvent`, `AuditEntry` de `@albora/db` (T5); `prepararBanco` de `@albora/db/testes/banco`.
- Produces: `executeCommand`, `executeQuery`, `CommandDeniedError`, `ReauthRequiredError`, `ApprovalRequiredError`, `ExecuteCommandInput<T>`, `ExecuteQueryInput<T>` — T7, T10 e T14 importam de `@albora/application`.

- [ ] **Step 1: Escrever o teste que falha**

Scaffold primeiro (sem isso nada compila):

```json
// packages/application/package.json
{
  "name": "@albora/application",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc --build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@albora/core": "workspace:*",
    "@albora/db": "workspace:*",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@types/pg": "^8.11.10"
  }
}
```

```json
// packages/application/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
```

Modificar `packages/db/package.json` — adicionar ao `exports`:

```json
"./testes/banco": "./src/testes/banco.ts"
```

Modificar `tsconfig.json` (raiz) — adicionar referência logo após `packages/db`:

```json
{ "path": "packages/application" }
```

Modificar `vitest.config.ts` (raiz) — em `test.server.deps.inline`, adicionar `"@albora/application"`:

```ts
inline: ["@albora/core", "@albora/db", "@albora/application", "@albora/packs", "zod"],
```

Agora o teste que prova o rollback (o mais importante da onda):

```ts
// packages/application/src/envelope/command.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { prepararBanco } from "@albora/db/testes/banco";
import { executeCommand } from "./command";
import { ApprovalRequiredError, CommandDeniedError, ReauthRequiredError } from "./errors";

let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await app?.end();
});

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: ["finance"],
    sessionId: "sess-1",
    requestId: "req-1",
    reauthenticatedAt: null,
    ...overrides,
  };
}

describe("executeCommand", () => {
  it("reason vazio rejeita antes de tocar o banco", async () => {
    await expect(
      executeCommand({ pool: app }, {
        actor: actor(), capability: "subscription.refund", reason: "  ",
        target: { kind: "subscription" }, action: "subscription.refund",
        run: async () => { throw new Error("não deveria rodar"); },
      }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("capacidade negada não abre transação", async () => {
    let rodou = false;
    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["engineering"] }), capability: "subscription.refund",
        reason: "tentativa sem capacidade", target: { kind: "subscription" }, action: "subscription.refund",
        run: async () => { rodou = true; return null; },
      }),
    ).rejects.toThrow(CommandDeniedError);
    expect(rodou).toBe(false);
  });

  it("needsReauth vira ReauthRequiredError", async () => {
    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["compliance"] }), capability: "lgpd.delete_account",
        reason: "pedido do titular", target: { kind: "account" }, action: "lgpd.delete_account",
        run: async () => null,
      }),
    ).rejects.toThrow(ReauthRequiredError);
  });

  it("needsApproval vira ApprovalRequiredError", async () => {
    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["support"] }), capability: "impersonate.request",
        reason: "cliente pediu ajuda visual", target: { kind: "account" }, action: "impersonate.request",
        run: async () => null,
      }),
    ).rejects.toThrow(ApprovalRequiredError);
  });

  it("caminho feliz grava exatamente uma linha em audit_log", async () => {
    const antes = await app.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'test.happy_path'",
    );
    const resultado = await executeCommand({ pool: app }, {
      actor: actor({ roles: ["finance"], reauthenticatedAt: new Date() }),
      capability: "subscription.mutate",
      reason: "troca de plano solicitada pelo cliente",
      target: { kind: "subscription", id: "sub-42" },
      action: "test.happy_path",
      run: async () => "efeito-aplicado",
    });
    expect(resultado).toBe("efeito-aplicado");
    const depois = await app.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_log WHERE action = 'test.happy_path'",
    );
    expect(Number(depois.rows[0]!.n) - Number(antes.rows[0]!.n)).toBe(1);
  });

  it("auditoria que falha desfaz o efeito de run — prova do rollback", async () => {
    await app.query("CREATE TABLE IF NOT EXISTS scratch_rollback_marker (id serial PRIMARY KEY, note text)");
    await app.query("DELETE FROM scratch_rollback_marker");

    await expect(
      executeCommand({ pool: app }, {
        actor: actor({ roles: ["finance"] }),
        capability: "subscription.mutate",
        reason: "marca o efeito e força a auditoria a falhar",
        // target_kind inválido viola o CHECK de audit_log dentro da MESMA
        // transação do INSERT em scratch_rollback_marker — prova que
        // auditoria e efeito de `run` sobem e descem juntos.
        target: { kind: "bogus_target_kind" as never, id: null },
        action: "test.rollback_proof",
        run: async (tx) => {
          await tx.query("INSERT INTO scratch_rollback_marker (note) VALUES ('marcado')");
        },
      }),
    ).rejects.toThrow();

    const { rows } = await app.query<{ n: string }>("SELECT count(*)::text AS n FROM scratch_rollback_marker");
    expect(rows[0]?.n).toBe("0");
  });
});
```

```ts
// packages/application/src/envelope/query.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { listSecurityEvents } from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "./errors";
import { executeQuery } from "./query";

let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await app?.end();
});

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "22222222-2222-2222-2222-222222222222",
    roles: ["support"], sessionId: "sess-2", requestId: "req-2", reauthenticatedAt: null,
    ...overrides,
  };
}

describe("executeQuery", () => {
  it("caminho feliz roda e devolve o resultado do run", async () => {
    const resultado = await executeQuery({ pool: app }, {
      actor: actor(), capability: "accounts.read", run: async () => "ok",
    });
    expect(resultado).toBe("ok");
  });

  it("negado grava security_events e lança sem esperar a leitura", async () => {
    await expect(
      executeQuery({ pool: app }, {
        actor: actor({ roles: ["engineering"] }), capability: "accounts.pii.reveal",
        run: async () => { throw new Error("não deveria rodar"); },
      }),
    ).rejects.toThrow(CommandDeniedError);

    await new Promise((r) => setTimeout(r, 50));
    const { rows } = await listSecurityEvents(app, { kind: "capability.denied", limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm install && pnpm --filter @albora/application exec vitest run`

Expected: FAIL com `Cannot find module './command'` / `./query` / `./errors`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/envelope/types.ts
import type { PoolClient } from "pg";
import type { Actor, Capability } from "@albora/core";
import type { AuditEntry } from "@albora/db";

export type ExecuteCommandInput<T> = {
  actor: Actor;
  capability: Capability;
  reason: string;
  target: { kind: AuditEntry["targetKind"]; id?: string | null };
  action: string;
  context?: Record<string, unknown>;
  resource?: { kind: string; id: string };
  metadata?: Record<string, unknown>;
  run: (tx: PoolClient) => Promise<T>;
};

export type ExecuteQueryInput<T> = {
  actor: Actor;
  capability: Capability;
  run: () => Promise<T>;
};
```

```ts
// packages/application/src/envelope/errors.ts
import type { Capability } from "@albora/core";

export class CommandDeniedError extends Error {
  constructor(public readonly capability: Capability, reason: string) {
    super(reason);
    this.name = "CommandDeniedError";
  }
}

export class ReauthRequiredError extends Error {
  constructor(public readonly capability: Capability, public readonly maxAgeSeconds: number) {
    super(`reautenticação recente exigida para ${capability}`);
    this.name = "ReauthRequiredError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor(public readonly capability: Capability, public readonly approverCapability: Capability) {
    super(`${capability} exige aprovação de ${approverCapability}`);
    this.name = "ApprovalRequiredError";
  }
}
```

```ts
// packages/application/src/envelope/command.ts
import type { Pool } from "pg";
import { authorize } from "@albora/core";
import { insertAuditLog } from "@albora/db";
import { ApprovalRequiredError, CommandDeniedError, ReauthRequiredError } from "./errors";
import type { ExecuteCommandInput } from "./types";

export async function executeCommand<T>(
  deps: { pool: Pool },
  input: ExecuteCommandInput<T>,
): Promise<T> {
  if (!input.reason.trim()) {
    throw new CommandDeniedError(input.capability, "motivo é obrigatório para qualquer mutação do console");
  }

  const decision = authorize({
    actor: input.actor,
    capability: input.capability,
    ...(input.resource ? { resource: input.resource } : {}),
    ...(input.context ? { context: input.context } : {}),
  });

  if (decision.kind === "denied") throw new CommandDeniedError(input.capability, decision.reason);
  if (decision.kind === "needsReauth") throw new ReauthRequiredError(input.capability, decision.maxAgeSeconds);
  if (decision.kind === "needsApproval") throw new ApprovalRequiredError(input.capability, decision.approverCapability);

  const client = await deps.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await input.run(client);
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: input.actor.staffUserId,
      action: input.action,
      targetKind: input.target.kind,
      targetId: input.target.id ?? null,
      reason: input.reason,
      metadata: input.metadata ?? {},
      requestId: input.actor.requestId,
    });
    await client.query("COMMIT");
    return result;
  } catch (erro) {
    await client.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
}
```

```ts
// packages/application/src/envelope/query.ts
import type { Pool } from "pg";
import { authorize } from "@albora/core";
import { insertSecurityEvent } from "@albora/db";
import { CommandDeniedError } from "./errors";
import type { ExecuteQueryInput } from "./types";

export async function executeQuery<T>(deps: { pool: Pool }, input: ExecuteQueryInput<T>): Promise<T> {
  const decision = authorize({ actor: input.actor, capability: input.capability });

  if (decision.kind !== "allowed") {
    void insertSecurityEvent(deps.pool, {
      kind: "capability.denied",
      actorKind: "staff",
      actorId: input.actor.staffUserId,
      requestId: input.actor.requestId,
      metadata: { capability: input.capability },
    });
    const reason = decision.kind === "denied" ? decision.reason : `autorização exige ${decision.kind}`;
    throw new CommandDeniedError(input.capability, reason);
  }

  return input.run();
}
```

```ts
// packages/application/src/index.ts
export type { ExecuteCommandInput, ExecuteQueryInput } from "./envelope/types";
export { ApprovalRequiredError, CommandDeniedError, ReauthRequiredError } from "./envelope/errors";
export { executeCommand } from "./envelope/command";
export { executeQuery } from "./envelope/query";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run && pnpm --filter @albora/application typecheck`

Expected: PASS — em especial "auditoria que falha desfaz o efeito de run".

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application packages/db/package.json tsconfig.json vitest.config.ts
git commit -m "$(cat <<'EOF'
feat(application): pacote novo com executeCommand/executeQuery

Ordem fixa: reason não-vazio -> authorize -> BEGIN -> run(tx) ->
INSERT audit_log NA MESMA TX -> COMMIT. Provado com CHECK real de
target_kind forçando rollback, sem mock (ADR 0016 §2).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `withPlatformAggregation`

**Files:**
- Create: `packages/application/src/platform/aggregation.ts`
- Test: `packages/application/src/platform/aggregation.test.ts`
- Modify: `packages/application/src/index.ts`

**Interfaces:**
- Consumes: `comAgregacao`, `insertAuditLog` de `@albora/db`; `authorize` de `@albora/core`; `CommandDeniedError` de T6.
- Produces: `withPlatformAggregation`, `WithPlatformAggregationInput<T>` — usado pelo T14 (portal de agregação, ondas futuras) e disponível para qualquer leitura cross-tenant.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/platform/aggregation.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { prepararBanco } from "@albora/db/testes/banco";
import { withPlatformAggregation } from "./aggregation";

let app: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await app?.end();
  await agregador?.end();
});

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    staffUserId: "33333333-3333-3333-3333-333333333333",
    roles: ["owner"], sessionId: "sess-3", requestId: "req-3", reauthenticatedAt: null,
    ...overrides,
  };
}

describe("withPlatformAggregation", () => {
  it("reason vazio rejeita antes de conectar", async () => {
    await expect(
      withPlatformAggregation({ pool: app, aggregatorPool: agregador }, {
        actor: actor(), capability: "analytics.platform.read", reason: "  ",
        run: async () => { throw new Error("não deveria conectar"); },
      }),
    ).rejects.toThrow();
  });

  it("ator sem analytics.platform.read é negado", async () => {
    // compliance não tem analytics.platform.read na tabela de capacidades (§5.2 da spec)
    await expect(
      withPlatformAggregation({ pool: app, aggregatorPool: agregador }, {
        actor: actor({ roles: ["compliance"] }), capability: "analytics.platform.read",
        reason: "tentativa sem capacidade",
        run: async () => { throw new Error("não deveria conectar"); },
      }),
    ).rejects.toThrow();
  });

  it("caminho feliz grava linha de auditoria com target_kind platform", async () => {
    const resultado = await withPlatformAggregation({ pool: app, aggregatorPool: agregador }, {
      actor: actor(), capability: "analytics.platform.read", reason: "dashboard do dono",
      run: async (client) => {
        const { rows } = await client.query<{ n: string }>("SELECT count(*)::text AS n FROM events");
        return rows[0]?.n ?? "0";
      },
    });
    expect(typeof resultado).toBe("string");

    const { rows } = await app.query<{ target_kind: string }>(
      "SELECT target_kind FROM audit_log WHERE action = 'aggregation.read' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.target_kind).toBe("platform");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/platform/aggregation.test.ts`

Expected: FAIL com `Cannot find module './aggregation'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/platform/aggregation.ts
import type { Pool, PoolClient } from "pg";
import { authorize, type Actor, type Capability } from "@albora/core";
import { comAgregacao, insertAuditLog } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";

export type WithPlatformAggregationInput<T> = {
  actor: Actor;
  capability: Capability;
  reason: string;
  action?: string;
  run: (client: PoolClient) => Promise<T>;
};

/**
 * `comAgregacao` chama `auditar` de forma SÍNCRONA, antes do BEGIN (ver
 * packages/db/src/event.ts). A auditoria usa o pool do papel da aplicação
 * (dono do GRANT em audit_log), nunca o aggregatorPool (BYPASSRLS, sem
 * INSERT em audit_log) — por isso a escrita roda em conexão à parte e é
 * esperada depois que `comAgregacao` retorna, não dentro do callback.
 */
export async function withPlatformAggregation<T>(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: WithPlatformAggregationInput<T>,
): Promise<T> {
  if (!input.reason.trim()) {
    throw new CommandDeniedError(input.capability, "motivo é obrigatório para agregação cross-tenant");
  }

  const decision = authorize({ actor: input.actor, capability: input.capability });
  if (decision.kind !== "allowed") {
    const reason = decision.kind === "denied" ? decision.reason : `autorização exige ${decision.kind}`;
    throw new CommandDeniedError(input.capability, reason);
  }

  let auditWrite: Promise<void> = Promise.resolve();
  const result = await comAgregacao(
    deps.aggregatorPool,
    input.reason,
    (registro) => {
      auditWrite = writeAggregationAudit(deps.pool, input.actor, input.action ?? "aggregation.read", registro.motivo);
    },
    input.run,
  );
  await auditWrite;
  return result;
}

async function writeAggregationAudit(pool: Pool, actor: Actor, action: string, reason: string): Promise<void> {
  const client = await pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: actor.staffUserId,
      action,
      targetKind: "platform",
      targetId: null,
      reason,
      requestId: actor.requestId,
    });
  } finally {
    client.release();
  }
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { WithPlatformAggregationInput } from "./platform/aggregation";
export { withPlatformAggregation } from "./platform/aggregation";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run && pnpm --filter @albora/application typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application/src/platform packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(application): withPlatformAggregation sobre comAgregacao

Ponte entre o auditar síncrono do primitivo (packages/db) e o
insertAuditLog assíncrono, escrito no pool do papel da aplicação —
nunca no aggregatorPool (BYPASSRLS, sem GRANT em audit_log).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Guard de camadas

**Files:**
- Create: `tools/guards/camadas.mjs`
- Create: `tools/guards/fixtures/camadas/packages/core/src/violador-db.ts`
- Create: `tools/guards/fixtures/camadas/packages/core/src/violador-application.ts`
- Create: `tools/guards/fixtures/camadas/packages/core/src/violador-next.ts`
- Create: `tools/guards/fixtures/camadas/packages/core/src/sub/violador-relativo.ts`
- Create: `tools/guards/fixtures/camadas/apps/web/app/console/violador-rota.tsx`
- Create: `tools/guards/fixtures/camadas/apps/web/features/console/violador-role.ts`
- Modify: `tools/guards/todos.mjs`
- Modify: `tools/guards/guards.test.mjs`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `arquivos`, `cli`, `linhasDeCodigo`, `violacao` de `./util.mjs` (mesmo molde de `dominio.mjs`/`packs.mjs`).
- Produces: `verificar(raiz)` — usado por `todos.mjs`, `guards.test.mjs` e pelo step de CI.

- [ ] **Step 1: Escrever o teste que falha**

Fixtures primeiro (o teste em si é o `describe.each` já existente em `guards.test.mjs`, ao qual adicionamos uma linha):

```ts
// tools/guards/fixtures/camadas/packages/core/src/violador-db.ts
import { comEvento } from "@albora/db";

export function usar() {
  return comEvento;
}
```

```ts
// tools/guards/fixtures/camadas/packages/core/src/violador-application.ts
import { executeCommand } from "@albora/application";

export function usar() {
  return executeCommand;
}
```

```ts
// tools/guards/fixtures/camadas/packages/core/src/violador-next.ts
import { cookies } from "next/headers";

export function usar() {
  return cookies;
}
```

```ts
// tools/guards/fixtures/camadas/packages/core/src/sub/violador-relativo.ts
import { migrar } from "../../../db/src/migrar";

export function usar() {
  return migrar;
}
```

```tsx
// tools/guards/fixtures/camadas/apps/web/app/console/violador-rota.tsx
import { comEvento } from "@albora/db";

export function Rota() {
  return comEvento ? null : null;
}
```

```ts
// tools/guards/fixtures/camadas/apps/web/features/console/violador-role.ts
export function podeGerenciar(role: string): boolean {
  return role === "owner";
}
```

Modificar `tools/guards/guards.test.mjs` — adicionar import e entrada no array `GUARDS`:

```ts
import { verificar as camadas } from "./camadas.mjs";
// ... dentro do array GUARDS, junto às outras entradas:
["camadas", camadas],
```

Modificar `tools/guards/todos.mjs` — adicionar import e entrada no objeto `GUARDS`:

```ts
import { verificar as camadas } from "./camadas.mjs";
// ... dentro do objeto GUARDS:
camadas,
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run tools/guards/guards.test.mjs`

Expected: FAIL com `Cannot find module './camadas.mjs'`.

- [ ] **Step 3: Implementar o mínimo**

```js
// tools/guards/camadas.mjs
import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de camadas — ADR 0016.
 *
 * `core` é domínio puro: nunca importa `db`, `application` nem `next`, e
 * nenhum import relativo escapa de `packages/core/src`. A rota do console
 * fala só com `application`, nunca direto com `db`. E permissão passa por
 * capacidade, não por comparação de papel espalhada pelo código.
 *
 * A regra 3 varre só as superfícies que este projeto cria — não o repo
 * inteiro. `role === "owner"` já existe legitimamente fora daqui (ex.:
 * apps/web/features/admin/data/load-event-page.ts, onde `role` é
 * HostEventRole, não StaffRole) e varrer tudo reprovaria código correto.
 */

const CORE = "packages/core/src";
const CORE_AUTHORIZATION = `${CORE}/authorization`;
const CONSOLE_ROTA = "apps/web/app/console";

const SUPERFICIES_DE_PAPEL = [
  "apps/web/app/console",
  "apps/web/features/console",
  "apps/web/lib/console",
  "packages/application",
  CORE,
];

const IMPORT_RE = /from\s+["']([^"']+)["']/;
const PAPEL_LITERAL = /\b(role|papel)\s*===\s*["'](owner|support|finance|compliance|engineering)["']/;

export function verificar(raiz) {
  const violacoes = [];

  for (const caminho of arquivos(`${raiz}/${CORE}`, [".ts", ".tsx"])) {
    linhasDeCodigo(caminho).forEach((linha, i) => {
      const m = IMPORT_RE.exec(linha);
      if (!m) return;
      const especificador = m[1];

      if (/^@albora\/db(\/|$)/.test(especificador)) {
        violacoes.push(violacao(raiz, caminho, i, linha, "packages/core importando @albora/db — core é domínio puro, nunca toca banco"));
      } else if (/^@albora\/application(\/|$)/.test(especificador)) {
        violacoes.push(violacao(raiz, caminho, i, linha, "packages/core importando @albora/application — a dependência é application → core, nunca o contrário"));
      } else if (especificador === "next" || especificador.startsWith("next/")) {
        violacoes.push(violacao(raiz, caminho, i, linha, "packages/core importando next — core não conhece o framework de rota"));
      } else if (especificador.startsWith(".")) {
        const alvo = resolve(dirname(caminho), especificador);
        const raizCore = resolve(raiz, CORE);
        if (relative(raizCore, alvo).startsWith("..")) {
          violacoes.push(violacao(raiz, caminho, i, linha, "import relativo saindo de packages/core/src"));
        }
      }
    });
  }

  const consoleDir = `${raiz}/${CONSOLE_ROTA}`;
  if (existsSync(consoleDir)) {
    for (const caminho of arquivos(consoleDir, [".ts", ".tsx"])) {
      linhasDeCodigo(caminho).forEach((linha, i) => {
        const m = IMPORT_RE.exec(linha);
        if (m && /^@albora\/db(\/|$)/.test(m[1])) {
          violacoes.push(violacao(raiz, caminho, i, linha, "apps/web/app/console importando @albora/db direto — a rota fala só com @albora/application"));
        }
      });
    }
  }

  const raizAuthorization = resolve(raiz, CORE_AUTHORIZATION);
  for (const superficie of SUPERFICIES_DE_PAPEL) {
    for (const caminho of arquivos(`${raiz}/${superficie}`, [".ts", ".tsx"])) {
      if (resolve(caminho).startsWith(`${raizAuthorization}/`)) continue;
      linhasDeCodigo(caminho).forEach((linha, i) => {
        if (PAPEL_LITERAL.test(linha)) {
          violacoes.push(violacao(raiz, caminho, i, linha, "comparação de papel fora de packages/core/src/authorization — permissão passa por capacidade, não por role ==="));
        }
      });
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("camadas", verificar);
```

Modificar `.github/workflows/ci.yml` — adicionar ao final dos steps do job `guards`:

```yaml
      - name: camadas
        run: node tools/guards/camadas.mjs
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node tools/guards/camadas.mjs && pnpm exec vitest run tools/guards/guards.test.mjs`

Expected: PASS — `node tools/guards/camadas.mjs` roda contra o repo real (sem argumento, raiz = `process.cwd()`) e imprime `✓ guard camadas`; a suíte confirma que a fixture reprova (as 6 violações, uma por arquivo) e que o código real passa limpo.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add tools/guards/camadas.mjs tools/guards/fixtures/camadas tools/guards/todos.mjs tools/guards/guards.test.mjs .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
feat(guards): guard de camadas (ADR 0016)

core não importa db/application/next nem escapa de packages/core/src
por caminho relativo; console/app não importa db direto; role === "..."
fica confinado a packages/core/src/authorization. Regra 3 escopada às
superfícies deste projeto — role === "owner" já existe legitimamente
em HostEventRole fora daqui.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Sessão de staff em `apps/web/lib/console`

**Files:**
- Create: `apps/web/lib/console/staff-session.ts`
- Test: `apps/web/lib/console/staff-session.test.ts`
- Create: `apps/web/lib/console/actor.ts`
- Test: `apps/web/lib/console/actor.test.ts`

**Interfaces:**
- Consumes: `createStaffSession`, `resolveStaffSession`, `touchStaffSession`, `revokeStaffSession`, `revokeSessionChain`, `findSessionEvenIfRevoked`, `findStaffById`, `listStaffRoles`, `markReauthenticated`, `insertSecurityEvent` de `@albora/db` (T4/T5); `Actor`, `StaffRole` de `@albora/core` (T3); `getPool` de `@/lib/db`.
- Produces: `STAFF_COOKIE`, `ABSOLUTE_TTL_SECONDS`, `IDLE_TTL_SECONDS`, `issueStaffSession`, `resolveActor`, `clearStaffSession`, `markStaffReauthenticated` — T10 e T14 importam.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/lib/console/staff-session.test.ts
import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { assignStaffRole, createStaffUser } from "@albora/db";

const { poolRef, cookieStore } = vi.hoisted(() => ({
  poolRef: { current: null as pg.Pool | null },
  cookieStore: new Map<string, string>(),
}));

vi.mock("@/lib/db", () => ({ getPool: () => poolRef.current }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined),
    set: (name: string, value: string) => { cookieStore.set(name, value); },
    delete: (name: string) => { cookieStore.delete(name); },
  }),
}));

import { ABSOLUTE_TTL_SECONDS, STAFF_COOKIE, issueStaffSession, resolveActor } from "./staff-session";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  poolRef.current = app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

beforeEach(() => {
  cookieStore.clear();
});

async function criarStaff(email: string) {
  const staff = await createStaffUser(admin, { email, name: "Equipe" });
  await assignStaffRole(admin, staff.id, "owner");
  return staff;
}

describe("resolveActor", () => {
  it("sem cookie devolve null", async () => {
    expect(await resolveActor()).toBeNull();
  });

  it("sessão válida resolve o ator", async () => {
    const staff = await criarStaff("valida@equipe.test");
    await issueStaffSession(staff.id);
    const actor = await resolveActor();
    expect(actor?.staffUserId).toBe(staff.id);
    expect(actor?.roles).toContain("owner");
  });

  it("sessão expirada resolve null", async () => {
    const staff = await criarStaff("expirada@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_sessions SET expires_at = now() - interval '1 hour' WHERE staff_user_id = $1", [staff.id]);
    expect(await resolveActor()).toBeNull();
  });

  it("sessão ociosa resolve null", async () => {
    const staff = await criarStaff("ociosa@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_sessions SET last_used_at = now() - interval '1 hour' WHERE staff_user_id = $1", [staff.id]);
    expect(await resolveActor()).toBeNull();
  });

  it("usuário suspended resolve null mesmo com sessão válida", async () => {
    const staff = await criarStaff("suspenso@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_users SET status = 'suspended' WHERE id = $1", [staff.id]);
    expect(await resolveActor()).toBeNull();
  });

  it("sessão revogada dispara detecção de reuso e revoga a cadeia", async () => {
    const staff = await criarStaff("reuso@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_sessions SET revoked_at = now() WHERE staff_user_id = $1", [staff.id]);

    expect(await resolveActor()).toBeNull();

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM security_events WHERE kind = 'session.reuse'",
    );
    expect(Number(rows[0]?.n)).toBeGreaterThan(0);
  });

  it("rotação troca o token quando passa de metade do TTL absoluto", async () => {
    const staff = await criarStaff("rotaciona@equipe.test");
    await issueStaffSession(staff.id);
    const tokenAntigo = cookieStore.get(STAFF_COOKIE);

    await admin.query(
      "UPDATE staff_sessions SET created_at = now() - make_interval(secs => $1) WHERE staff_user_id = $2",
      [ABSOLUTE_TTL_SECONDS / 2 + 60, staff.id],
    );

    await resolveActor();
    const tokenNovo = cookieStore.get(STAFF_COOKIE);
    expect(tokenNovo).toBeDefined();
    expect(tokenNovo).not.toBe(tokenAntigo);
  });
});
```

```ts
// apps/web/lib/console/actor.test.ts
import { describe, expect, it } from "vitest";
import * as actorModule from "./actor";

describe("actor barrel", () => {
  it("reexporta resolveActor", () => {
    expect(typeof actorModule.resolveActor).toBe("function");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web/lib/console`

Expected: FAIL com `Cannot find module './staff-session'` / `./actor`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// apps/web/lib/console/staff-session.ts
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { Actor, StaffRole } from "@albora/core";
import {
  createStaffSession,
  findSessionEvenIfRevoked,
  findStaffById,
  insertSecurityEvent,
  listStaffRoles,
  markReauthenticated,
  resolveStaffSession,
  revokeSessionChain,
  revokeStaffSession,
  touchStaffSession,
} from "@albora/db";
import { getPool } from "@/lib/db";

export const STAFF_COOKIE = "albora_staff";
export const ABSOLUTE_TTL_SECONDS = 12 * 60 * 60;
export const IDLE_TTL_SECONDS = 30 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function issueStaffSession(staffUserId: string, rotatedFrom?: string): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ABSOLUTE_TTL_SECONDS * 1000);

  await createStaffSession(getPool(), {
    staffUserId, tokenHash, expiresAt,
    ...(rotatedFrom ? { rotatedFrom } : {}),
  });

  const jar = await cookies();
  jar.set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.APP_ENV !== "dev",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_TTL_SECONDS,
  });
}

export async function clearStaffSession(): Promise<void> {
  const jar = await cookies();
  jar.set(STAFF_COOKIE, "", {
    httpOnly: true, secure: process.env.APP_ENV !== "dev", sameSite: "lax", path: "/", maxAge: 0,
  });
}

export async function markStaffReauthenticated(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (!token) return;
  await markReauthenticated(getPool(), hashToken(token));
}

/** Rotaciona quando a sessão passou de metade do TTL absoluto — nova linha com rotated_from, revoga a antiga, troca o cookie. */
async function rotateIfNeeded(tokenHash: string, staffUserId: string, createdAt: Date): Promise<void> {
  const age = Date.now() - createdAt.getTime();
  if (age < (ABSOLUTE_TTL_SECONDS * 1000) / 2) return;

  await revokeStaffSession(getPool(), tokenHash);
  await issueStaffSession(staffUserId, tokenHash);
}

export async function resolveActor(): Promise<Actor | null> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const pool = getPool();
  const resolved = await resolveStaffSession(pool, tokenHash, { idleMaxSeconds: IDLE_TTL_SECONDS });

  if (!resolved) {
    // Sessão não resolveu: se a linha existe e está revogada, é reuso de um
    // token já rotacionado — revoga a cadeia inteira e registra o incidente.
    const evenRevoked = await findSessionEvenIfRevoked(pool, tokenHash);
    if (evenRevoked?.revokedAt) {
      const quantas = await revokeSessionChain(pool, tokenHash);
      await insertSecurityEvent(pool, {
        kind: "session.reuse",
        actorKind: "staff",
        metadata: { revokedCount: quantas },
      });
    }
    return null;
  }

  await touchStaffSession(pool, tokenHash);
  await rotateIfNeeded(tokenHash, resolved.staffUserId, resolved.createdAt);

  const staffUser = await findStaffById(pool, resolved.staffUserId);
  if (!staffUser) return null;
  const roles = await listStaffRoles(pool, resolved.staffUserId);

  return {
    staffUserId: resolved.staffUserId,
    roles: roles as StaffRole[],
    sessionId: tokenHash,
    requestId: randomUUID(),
    reauthenticatedAt: resolved.reauthenticatedAt,
  };
}
```

```ts
// apps/web/lib/console/actor.ts
export type { Actor } from "@albora/core";
export { resolveActor } from "./staff-session";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web/lib/console`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/lib/console
git commit -m "$(cat <<'EOF'
feat(console): sessão de staff endurecida

Cookie albora_staff (HttpOnly, Secure em prod, SameSite=Lax), TTL
absoluto de 12h e ociosidade de 30min, rotação em metade do TTL,
detecção de reuso de token rotacionado com revogação de cadeia +
security_events.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Login por magic link de staff

**Files:**
- Create: `packages/application/src/staff/rate-limit.ts`
- Create: `packages/application/src/staff/token.ts`
- Create: `packages/application/src/staff/request-login.ts`
- Test: `packages/application/src/staff/request-login.test.ts`
- Create: `packages/application/src/staff/complete-login.ts`
- Test: `packages/application/src/staff/complete-login.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/login/page.tsx`
- Create: `apps/web/app/console/login/actions.ts`
- Create: `apps/web/features/console/components/client/login-form.tsx`

**Interfaces:**
- Consumes: `findStaffByEmail`, `createStaffMagicLink`, `consumeStaffMagicLink`, `insertSecurityEvent`, `insertAuditLog` de `@albora/db`; `issueStaffSession` de T9; `sendHostEmail` de `@/lib/email` (transporte reusado do magic link de `accounts`, ver `apps/web/lib/application/use-cases/admin/issue-magic-link.ts`).
- Produces: `requestStaffLogin`, `completeStaffLogin` — consumidos por `apps/web/app/console/login/actions.ts`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/staff/request-login.test.ts
import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createStaffUser, listSecurityEvents } from "@albora/db";
import { requestStaffLogin } from "./request-login";
import { resetRateLimit } from "./rate-limit";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

beforeEach(() => {
  resetRateLimit();
});

describe("requestStaffLogin", () => {
  it("e-mail inexistente devolve a mesma resposta que um e-mail existente", async () => {
    await createStaffUser(admin, { email: "existe@equipe.test", name: "Existe" });

    const enviosRecebidos: string[] = [];
    const sendEmail = async ({ to }: { to: string; token: string }) => { enviosRecebidos.push(to); };

    const respostaExistente = await requestStaffLogin(app, { email: "existe@equipe.test", ipHash: "ip-1", sendEmail });
    const respostaInexistente = await requestStaffLogin(app, { email: "naoexiste@equipe.test", ipHash: "ip-2", sendEmail });

    expect(respostaExistente).toEqual(respostaInexistente);
    expect(enviosRecebidos).toEqual(["existe@equipe.test"]);
  });

  it("estouro de rate limit grava evento de segurança e ainda devolve a mesma resposta", async () => {
    const sendEmail = async () => {};
    for (let i = 0; i < 5; i++) {
      await requestStaffLogin(app, { email: `flood-${i}@equipe.test`, ipHash: "ip-flood", sendEmail });
    }
    const resposta = await requestStaffLogin(app, { email: "flood-extra@equipe.test", ipHash: "ip-flood", sendEmail });
    expect(resposta).toEqual({ sent: true });

    const { rows } = await listSecurityEvents(app, { kind: "rate_limit.exceeded", limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
  });
});
```

```ts
// packages/application/src/staff/complete-login.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createStaffUser } from "@albora/db";
import { completeStaffLogin } from "./complete-login";
import { requestStaffLogin } from "./request-login";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

describe("completeStaffLogin", () => {
  it("dois usos do mesmo token — o segundo falha", async () => {
    const staff = await createStaffUser(admin, { email: "duplo-login@equipe.test", name: "Duplo" });
    let capturedToken = "";
    await requestStaffLogin(app, {
      email: staff.email, ipHash: "ip-x",
      sendEmail: ({ token }) => { capturedToken = token; },
    });

    const primeira = await completeStaffLogin(app, { token: capturedToken, ipHash: "ip-x" });
    expect(primeira.ok).toBe(true);

    const segunda = await completeStaffLogin(app, { token: capturedToken, ipHash: "ip-x" });
    expect(segunda.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/staff`

Expected: FAIL com `Cannot find module './request-login'` / `./complete-login`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/staff/rate-limit.ts
/** Limitador em memória local — não cruza para apps/web/lib (application não pode importar de app). */
type Window = { until: number; uses: number };
const windows = new Map<string, Window>();

export function consumeRateLimit(key: string, max: number, windowSec: number, now = Date.now()): boolean {
  const current = windows.get(key);
  if (!current || now >= current.until) {
    windows.set(key, { until: now + windowSec * 1000, uses: 1 });
    return true;
  }
  current.uses += 1;
  return current.uses <= max;
}

export function resetRateLimit(): void {
  windows.clear();
}
```

```ts
// packages/application/src/staff/token.ts
import { createHash, randomBytes } from "node:crypto";

export function generateStaffToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashStaffToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

```ts
// packages/application/src/staff/request-login.ts
import type { Pool } from "pg";
import { createStaffMagicLink, findStaffByEmail, insertSecurityEvent } from "@albora/db";
import { consumeRateLimit } from "./rate-limit";
import { generateStaffToken, hashStaffToken } from "./token";

export const MAGIC_LINK_TTL_MINUTES = 15;
const MAX_POR_EMAIL_POR_HORA = 5;
const MAX_POR_IP_POR_HORA = 20;

export type RequestStaffLoginInput = {
  email: string;
  ipHash: string;
  sendEmail: (input: { to: string; token: string }) => Promise<void> | void;
};

export type RequestStaffLoginResult = { sent: true };

/** Resposta idêntica exista ou não o e-mail — anti-enumeração. */
export async function requestStaffLogin(pool: Pool, input: RequestStaffLoginInput): Promise<RequestStaffLoginResult> {
  const email = input.email.trim().toLowerCase();

  const dentroDoLimite =
    consumeRateLimit(`email:${email}`, MAX_POR_EMAIL_POR_HORA, 3600) &&
    consumeRateLimit(`ip:${input.ipHash}`, MAX_POR_IP_POR_HORA, 3600);

  if (!dentroDoLimite) {
    await insertSecurityEvent(pool, {
      kind: "rate_limit.exceeded",
      ipHash: input.ipHash,
      metadata: { surface: "staff_login" },
    });
    return { sent: true };
  }

  const staff = await findStaffByEmail(pool, email);
  if (staff && staff.status === "active") {
    const token = generateStaffToken();
    const tokenHash = hashStaffToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

    await createStaffMagicLink(pool, { staffUserId: staff.id, tokenHash, expiresAt });
    await input.sendEmail({ to: email, token });
  }

  return { sent: true };
}
```

```ts
// packages/application/src/staff/complete-login.ts
import type { Pool } from "pg";
import { consumeStaffMagicLink, insertAuditLog, insertSecurityEvent } from "@albora/db";
import { hashStaffToken } from "./token";

export type CompleteStaffLoginInput = { token: string; ipHash: string };
export type CompleteStaffLoginResult = { ok: true; staffUserId: string } | { ok: false };

export async function completeStaffLogin(pool: Pool, input: CompleteStaffLoginInput): Promise<CompleteStaffLoginResult> {
  const tokenHash = hashStaffToken(input.token);
  const staffUserId = await consumeStaffMagicLink(pool, tokenHash);

  if (!staffUserId) {
    await insertSecurityEvent(pool, {
      kind: "login.failed",
      ipHash: input.ipHash,
      metadata: { surface: "staff_login" },
    });
    return { ok: false };
  }

  const client = await pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: staffUserId,
      action: "staff.login",
      targetKind: "staff_user",
      targetId: staffUserId,
      reason: "login por magic link",
    });
  } finally {
    client.release();
  }

  return { ok: true, staffUserId };
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { CompleteStaffLoginInput, CompleteStaffLoginResult } from "./staff/complete-login";
export { completeStaffLogin } from "./staff/complete-login";
export { resetRateLimit } from "./staff/rate-limit";
export type { RequestStaffLoginInput, RequestStaffLoginResult } from "./staff/request-login";
export { requestStaffLogin } from "./staff/request-login";
```

```tsx
// apps/web/app/console/login/actions.ts
"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { completeStaffLogin, requestStaffLogin } from "@albora/application";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { issueStaffSession } from "@/lib/console/staff-session";

function ipHashFromHeaders(raw: string | null): string {
  return createHash("sha256").update(raw ?? "unknown").digest("hex");
}

export async function requestLoginAction(email: string): Promise<{ sent: boolean }> {
  const jar = await headers();
  const ip = jar.get("x-forwarded-for");
  const origin = jar.get("origin") ?? "";

  await requestStaffLogin(getPool(), {
    email,
    ipHash: ipHashFromHeaders(ip),
    sendEmail: async ({ to, token }) => {
      void sendHostEmail({
        to,
        subject: "Seu link para entrar no console",
        text: [
          "Para entrar no console, abra este link (válido por poucos minutos):",
          "",
          `${origin}/console/login?m=${token}`,
        ].join("\n"),
      });
    },
  });

  return { sent: true };
}

export async function completeLoginAction(token: string): Promise<{ ok: boolean }> {
  const ip = (await headers()).get("x-forwarded-for");
  const result = await completeStaffLogin(getPool(), { token, ipHash: ipHashFromHeaders(ip) });
  if (!result.ok) return { ok: false };

  await issueStaffSession(result.staffUserId);
  return { ok: true };
}
```

```tsx
// apps/web/features/console/components/client/login-form.tsx
"use client";

import { useState, useTransition } from "react";
import { PrimaryButton, TextField } from "@albora/ui-web";
import { completeLoginAction, requestLoginAction } from "@/app/console/login/actions";

export function LoginForm({ magic }: { magic: string | null }) {
  return magic ? <Confirm token={magic} /> : <RequestLink />;
}

function RequestLink() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"editing" | "sent">("editing");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        {status === "sent" ? (
          <p className="tipo-body m-0 text-ink-2">
            Se houver uma conta de equipe com esse e-mail, o link já está a caminho.
          </p>
        ) : (
          <>
            <h1 className="tipo-title m-0">Entrar no console</h1>
            <TextField
              id="staff-email"
              label="E-mail da equipe"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
            <PrimaryButton
              disabled={pending || !email.trim()}
              onClick={() =>
                startTransition(async () => {
                  await requestLoginAction(email.trim());
                  setStatus("sent");
                })
              }
            >
              {pending ? "Enviando…" : "Enviar link"}
            </PrimaryButton>
          </>
        )}
      </div>
    </main>
  );
}

function Confirm({ token }: { token: string }) {
  const [status, setStatus] = useState<"ready" | "error">("ready");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        <h1 className="tipo-title m-0">Confirmar acesso</h1>
        {status === "error" && (
          <p role="alert" className="tipo-caption m-0 text-critico">
            Este link está inválido ou expirou.
          </p>
        )}
        <PrimaryButton
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await completeLoginAction(token);
              if (result.ok) window.location.assign("/console");
              else setStatus("error");
            })
          }
        >
          {pending ? "Entrando…" : "Entrar no console"}
        </PrimaryButton>
      </div>
    </main>
  );
}
```

```tsx
// apps/web/app/console/login/page.tsx
import { LoginForm } from "@/features/console/components/client/login-form";

export const dynamic = "force-dynamic";

export default async function ConsoleLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  return <LoginForm magic={m ?? null} />;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/staff && pnpm --filter @albora/application typecheck`

Expected: PASS. (Não roda `next build`/`next start` — `page.tsx`/`actions.ts`/`login-form.tsx` são verificados por `pnpm typecheck` em T15, não por teste de renderização nesta task.)

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application/src/staff packages/application/src/index.ts apps/web/app/console/login apps/web/features/console/components/client/login-form.tsx
git commit -m "$(cat <<'EOF'
feat(console): login de staff por magic link

Resposta idêntica exista ou não o e-mail (anti-enumeração), rate
limit por e-mail e IP (limitador local em packages/application — o
existente em apps/web/lib está na camada errada para ser reusado
daqui), uso único do token, staff.login em audit_log.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Migração de legado — `platform_operators` → `staff_users`

**Files:**
- Create: `packages/db/migrations/0061_migrar_operadores_para_staff.sql`

**Interfaces:**
- Consumes: schema de `platform_operators` (migration 0030) e `accounts.email`.
- Produces: linhas em `staff_users`/`staff_role_assignments` para todo operador existente — não remove `platform_operators`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// prova mínima, descartável — roda uma vez para confirmar a falha
import { prepararBanco } from "packages/db/src/testes/banco";

async function verificar() {
  const { admin } = await prepararBanco();
  await admin.query(
    "INSERT INTO accounts (email) VALUES ('operador@exemplo.test') RETURNING id",
  );
  const { rows } = await admin.query(
    "SELECT 1 FROM staff_users WHERE email = 'operador@exemplo.test'",
  );
  if (rows.length !== 0) throw new Error("staff_users não deveria ter a linha ainda");
}

verificar();
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && cd packages/db && node --loader tsx --eval "$(cat <<'EOF'
import pg from 'pg';
import { migrar } from './src/migrar';
const admin = new pg.Pool({ connectionString: 'postgres://albora:albora@localhost:55432/albora' });
await admin.query('DROP SCHEMA public CASCADE'); await admin.query('CREATE SCHEMA public');
await migrar(admin, './migrations');
await admin.query(\"INSERT INTO accounts (email) VALUES ('op@exemplo.test')\");
const acc = await admin.query(\"SELECT id FROM accounts WHERE email='op@exemplo.test'\");
await admin.query('INSERT INTO platform_operators (account_id) VALUES ($1)', [acc.rows[0].id]);
const staff = await admin.query(\"SELECT 1 FROM staff_users WHERE email='op@exemplo.test'\");
console.log('staff rows:', staff.rows.length);
EOF
)"`

Expected: `staff rows: 0` (migration 0061 ainda não existe/roda).

- [ ] **Step 3: Implementar o mínimo**

```sql
-- 0061_migrar_operadores_para_staff.sql
--
-- MIGRAÇÃO DE LEGADO (ADR 0016 §4): owner é ponto de partida da migração de
-- platform_operators, não desenho final. Não remove nem altera
-- platform_operators — /ops segue no ar até a Onda D.

INSERT INTO staff_users (email, name)
SELECT a.email, a.email
  FROM platform_operators po
  JOIN accounts a ON a.id = po.account_id
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_role_assignments (staff_user_id, role)
SELECT su.id, 'owner'
  FROM platform_operators po
  JOIN accounts a ON a.id = po.account_id
  JOIN staff_users su ON su.email = a.email
ON CONFLICT (staff_user_id, role) DO NOTHING;
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/staff.test.ts` (a suíte de T4 continua passando, e a migration nova aplica sem erro dentro de `prepararBanco()` — que roda `migrar(admin, DIR_MIGRATIONS)` contra todas as `.sql` do diretório, incluindo a 0061).

Expected: PASS, sem erro de migration.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/migrations/0061_migrar_operadores_para_staff.sql
git commit -m "$(cat <<'EOF'
feat(db): migra platform_operators para staff_users (legado)

owner é ponto de partida, não desenho final (ADR 0016 §4).
platform_operators permanece intocada — /ops segue no ar até a Onda D.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: `DataTable` em `packages/ui-web`

**Files:**
- Create: `packages/ui-web/src/data-table.tsx`
- Test: `packages/ui-web/src/data-table.test.tsx`
- Modify: `packages/ui-web/src/index.ts`

**Interfaces:**
- Consumes: `cn` de `./variants`, `Skeleton` de `./skeleton` (já usa `skeleton-pulse`, não `animate-pulse`).
- Produces: `DataTable<T>`, `DataTableColumn<T>`, `DataTableProps<T>` — usados pelas telas de leitura da Onda B.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// packages/ui-web/src/data-table.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";

type Row = { id: string; name: string };

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Nome", render: (r) => r.name, sortable: true },
];

describe("DataTable", () => {
  it("aria-sort alterna ascending, descending e none", () => {
    render(<DataTable columns={columns} rows={[{ id: "1", name: "Ana" }]} rowKey={(r) => r.id} />);
    const th = screen.getByRole("columnheader", { name: "Nome" });
    expect(th).toHaveAttribute("aria-sort", "none");

    fireEvent.click(screen.getByRole("button", { name: "Nome" }));
    expect(th).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: "Nome" }));
    expect(th).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(screen.getByRole("button", { name: "Nome" }));
    expect(th).toHaveAttribute("aria-sort", "none");
  });

  it("estado vazio renderiza a mensagem dada", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} emptyMessage="Nenhum registro" />);
    expect(screen.getByText("Nenhum registro")).toBeInTheDocument();
  });

  it("paginação não passa dos limites", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} pageSize={20} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("cabeçalho ordenável é focável e responde a Enter/Espaço", () => {
    render(<DataTable columns={columns} rows={[{ id: "1", name: "Ana" }]} rowKey={(r) => r.id} />);
    const botao = screen.getByRole("button", { name: "Nome" });
    botao.focus();
    expect(botao).toHaveFocus();
    fireEvent.click(botao);
    expect(screen.getByRole("columnheader", { name: "Nome" })).toHaveAttribute("aria-sort", "ascending");
  });

  it("estado de carregamento usa o Skeleton (sem animate-pulse)", () => {
    const { container } = render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} loading />);
    expect(container.innerHTML).not.toMatch(/animate-pulse/);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/ui-web exec vitest run src/data-table.test.tsx`

Expected: FAIL com `Cannot find module './data-table'`.

- [ ] **Step 3: Implementar o mínimo**

```tsx
// packages/ui-web/src/data-table.tsx
"use client";

import { useState, type ReactNode } from "react";
import { cn } from "./variants";
import { Skeleton } from "./skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "start" | "end";
  width?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
};

type SortState = { key: string; direction: "ascending" | "descending" } | null;

export function DataTable<T>({
  columns, rows, rowKey, loading = false, emptyMessage = "Nada para mostrar", pageSize = 20,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const toggleSort = (key: string) => {
    setSort((atual) => {
      if (!atual || atual.key !== key) return { key, direction: "ascending" };
      if (atual.direction === "ascending") return { key, direction: "descending" };
      return null;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Carregando">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="tipo-body m-0 py-12 text-center text-ink-3">{emptyMessage}</p>;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginaSegura = Math.min(page, totalPaginas - 1);
  const visiveis = rows.slice(paginaSegura * pageSize, paginaSegura * pageSize + pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-linha">
              {columns.map((coluna) => (
                <th
                  key={coluna.key}
                  scope="col"
                  className={cn("tipo-label px-3 py-2.5 text-ink-3", coluna.align === "end" && "text-right")}
                  style={coluna.width ? { width: coluna.width } : undefined}
                  aria-sort={coluna.sortable ? (sort?.key === coluna.key ? sort.direction : "none") : undefined}
                >
                  {coluna.sortable ? (
                    <button
                      type="button"
                      className="flex min-h-[44px] w-full items-center gap-1 bg-transparent text-left font-inherit text-inherit"
                      onClick={() => toggleSort(coluna.key)}
                    >
                      {coluna.header}
                    </button>
                  ) : (
                    coluna.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((row) => (
              <tr key={rowKey(row)} className="border-b border-linha">
                {columns.map((coluna) => (
                  <td key={coluna.key} className={cn("px-3 py-2.5 tabular-nums", coluna.align === "end" && "text-right")}>
                    {coluna.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-superficie border border-linha px-3 disabled:opacity-40"
            disabled={paginaSegura === 0}
            onClick={() => setPage(paginaSegura - 1)}
          >
            Anterior
          </button>
          <span className="tipo-caption text-ink-3">
            Página {paginaSegura + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-superficie border border-linha px-3 disabled:opacity-40"
            disabled={paginaSegura >= totalPaginas - 1}
            onClick={() => setPage(paginaSegura + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
```

**Nota de escopo:** as colunas são `{ key, header, render(row), sortable?, align?, width? }` — sem acessor de valor para comparação (a espinha não pede um). `DataTable` gerencia só o estado visual de ordenação (`aria-sort`, teclado nativo via `<button>`); reordenar `rows` de fato é responsabilidade de quem chama (a Onda B decide se isso vira prop nova).

Modificar `packages/ui-web/src/index.ts` — adicionar:

```ts
export { DataTable, type DataTableColumn, type DataTableProps } from "./data-table";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/ui-web exec vitest run src/data-table.test.tsx && pnpm --filter @albora/ui-web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/ui-web/src/data-table.tsx packages/ui-web/src/data-table.test.tsx packages/ui-web/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui-web): DataTable genérico com ordenação, paginação e teclado

aria-sort ascending/descending/none, skeleton sem animate-pulse
(reusa Skeleton existente), tabular-nums, alvos >=44px, zero hex.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Gráficos e primitivos de página em `packages/ui-web`

**Files:**
- Create: `packages/ui-web/src/chart.tsx`
- Test: `packages/ui-web/src/chart.test.tsx`
- Create: `packages/ui-web/src/page-header.tsx`
- Create: `packages/ui-web/src/status-badge.tsx`
- Test: `packages/ui-web/src/status-badge.test.tsx`
- Create: `packages/ui-web/src/empty-state.tsx`
- Modify: `packages/ui-web/src/index.ts`

**Interfaces:**
- Consumes: `cva` de `./variants`; variáveis CSS reais `--acento`, `--ink-3`, `--critico`, `--linha` (confirmadas em `apps/web/app/tailwind.css` — SVG não é alcançado por classes Tailwind, então o token entra via `var(--acento)` direto no `fill`/`stroke`).
- Produces: `Sparkline`, `BarChart`, `Donut`, `PageHeader`, `StatusBadge`, `EmptyState` — usados pelas telas de leitura da Onda B.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// packages/ui-web/src/chart.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart, Donut, Sparkline } from "./chart";

describe("gráficos", () => {
  it("Sparkline exige aria-label", () => {
    const { getByRole } = render(<Sparkline points={[{ label: "a", value: 1 }]} label="Séries de teste" />);
    expect(getByRole("img", { name: "Séries de teste" })).toBeInTheDocument();
  });

  it("série vazia não quebra o Sparkline", () => {
    expect(() => render(<Sparkline points={[]} label="Vazio" />)).not.toThrow();
  });

  it("BarChart e Donut também exigem aria-label", () => {
    const { getByRole: getBar } = render(<BarChart points={[{ label: "a", value: 3 }]} label="Barras" />);
    expect(getBar("img", { name: "Barras" })).toBeInTheDocument();

    const { getByRole: getDonut } = render(<Donut points={[{ label: "a", value: 3 }]} label="Donut" />);
    expect(getDonut("img", { name: "Donut" })).toBeInTheDocument();
  });

  it("Donut com total zero não quebra", () => {
    expect(() => render(<Donut points={[{ label: "a", value: 0 }]} label="Zero" />)).not.toThrow();
  });
});
```

```tsx
// packages/ui-web/src/status-badge.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

const HEX = /#[0-9a-fA-F]{3,8}\b/;

describe("StatusBadge", () => {
  it("não usa hex em nenhum tom", () => {
    for (const tone of ["neutral", "positive", "atencao", "critico"] as const) {
      const { container, unmount } = render(<StatusBadge tone={tone}>Rótulo</StatusBadge>);
      expect(container.innerHTML).not.toMatch(HEX);
      unmount();
    }
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/ui-web exec vitest run src/chart.test.tsx src/status-badge.test.tsx`

Expected: FAIL com `Cannot find module './chart'` / `./status-badge`.

- [ ] **Step 3: Implementar o mínimo**

```tsx
// packages/ui-web/src/chart.tsx
export type ChartSeriesPoint = { label: string; value: number };

function VisuallyHiddenTable({ caption, points }: { caption: string; points: ChartSeriesPoint[] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr><th>Rótulo</th><th>Valor</th></tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.label}><td>{p.label}</td><td>{p.value}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export function Sparkline({
  points, label, width = 160, height = 40,
}: { points: ChartSeriesPoint[]; label: string; width?: number; height?: number }) {
  if (points.length === 0) {
    return <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} />;
  }

  const valores = points.map((p) => p.value);
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const range = max - min || 1;
  const passo = width / Math.max(points.length - 1, 1);

  const d = points
    .map((p, i) => {
      const x = i * passo;
      const y = height - ((p.value - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <>
      <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={d} fill="none" stroke="var(--acento)" strokeWidth="2" />
      </svg>
      <VisuallyHiddenTable caption={label} points={points} />
    </>
  );
}

export function BarChart({
  points, label, width = 240, height = 120,
}: { points: ChartSeriesPoint[]; label: string; width?: number; height?: number }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const largura = points.length > 0 ? width / points.length : width;

  return (
    <>
      <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {points.map((p, i) => {
          const alturaBarra = max > 0 ? (p.value / max) * height : 0;
          return (
            <rect
              key={p.label}
              x={i * largura + largura * 0.1}
              y={height - alturaBarra}
              width={largura * 0.8}
              height={alturaBarra}
              fill="var(--acento)"
            />
          );
        })}
      </svg>
      <VisuallyHiddenTable caption={label} points={points} />
    </>
  );
}

export function Donut({
  points, label, size = 120, thickness = 16,
}: { points: ChartSeriesPoint[]; label: string; size?: number; thickness?: number }) {
  const total = points.reduce((soma, p) => soma + p.value, 0);
  const raio = (size - thickness) / 2;
  const centro = size / 2;
  const circunferencia = 2 * Math.PI * raio;
  const cores = ["var(--acento)", "var(--ink-3)", "var(--critico)", "var(--linha)"];

  let acumulado = 0;

  return (
    <>
      <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={centro} cy={centro} r={raio} fill="none" stroke="var(--linha)" strokeWidth={thickness} />
        ) : (
          points.map((p, i) => {
            const fatia = (p.value / total) * circunferencia;
            const dashoffset = -acumulado;
            acumulado += fatia;
            return (
              <circle
                key={p.label}
                cx={centro}
                cy={centro}
                r={raio}
                fill="none"
                stroke={cores[i % cores.length]}
                strokeWidth={thickness}
                strokeDasharray={`${fatia} ${circunferencia - fatia}`}
                strokeDashoffset={dashoffset}
                transform={`rotate(-90 ${centro} ${centro})`}
              />
            );
          })
        )}
      </svg>
      <VisuallyHiddenTable caption={label} points={points} />
    </>
  );
}
```

```tsx
// packages/ui-web/src/page-header.tsx
import type { ReactNode } from "react";

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="tipo-title m-0">{title}</h1>
        {description && <p className="tipo-caption m-0 text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
```

```tsx
// packages/ui-web/src/status-badge.tsx
import type { ReactNode } from "react";
import { cva } from "./variants";

export type StatusBadgeTone = "neutral" | "positive" | "atencao" | "critico";

const statusBadgeVariants = cva({
  base: "inline-flex items-center gap-1.5 rounded-pilula px-3 py-1.5 text-[0.78125rem] whitespace-nowrap",
  variants: {
    tone: {
      neutral: "bg-superficie-alta text-ink-2",
      positive: "border border-acento bg-acento/10 text-acento-texto",
      atencao: "border border-linha bg-superficie-alta text-ink",
      critico: "border border-critico bg-critico/10 text-critico",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function StatusBadge({ tone, children }: { tone?: StatusBadgeTone; children: ReactNode }) {
  return <span className={statusBadgeVariants({ tone })}>{children}</span>;
}
```

```tsx
// packages/ui-web/src/empty-state.tsx
import type { ReactNode } from "react";

export function EmptyState({
  title, description, action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h2 className="tipo-title m-0">{title}</h2>
      {description && <p className="tipo-body m-0 max-w-[32rem] text-ink-3">{description}</p>}
      {action}
    </div>
  );
}
```

Modificar `packages/ui-web/src/index.ts` — adicionar:

```ts
export { BarChart, Donut, Sparkline, type ChartSeriesPoint } from "./chart";
export { PageHeader } from "./page-header";
export { StatusBadge, type StatusBadgeTone } from "./status-badge";
export { EmptyState } from "./empty-state";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/ui-web exec vitest run src/chart.test.tsx src/status-badge.test.tsx && pnpm --filter @albora/ui-web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/ui-web/src/chart.tsx packages/ui-web/src/chart.test.tsx packages/ui-web/src/page-header.tsx packages/ui-web/src/status-badge.tsx packages/ui-web/src/status-badge.test.tsx packages/ui-web/src/empty-state.tsx packages/ui-web/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui-web): gráficos SVG e primitivos de página do console

Sparkline/BarChart/Donut com role=img + aria-label obrigatório e
tabela oculta para leitor de tela; cor por var(--acento)/var(--ink-3)/
var(--critico) (SVG não é alcançado por classe Tailwind). PageHeader,
StatusBadge e EmptyState via token, zero hex.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Shell do console e navegação filtrada por capacidade

**Files:**
- Create: `apps/web/features/console/components/server/console-nav.tsx`
- Test: `apps/web/features/console/components/server/console-nav.test.ts`
- Create: `apps/web/features/console/components/server/console-shell.tsx`
- Create: `apps/web/app/console/layout.tsx`
- Test: `apps/web/app/console/layout.test.ts`
- Create: `apps/web/app/console/page.tsx`

**Interfaces:**
- Consumes: `resolveActor` de `@/lib/console/actor` (T9); `hasCapability`, `Actor`, `Capability` de `@albora/core` (T3); `adminVars` de `@/features/admin/components/server/admin-shell` (light mode já pronto, ver `docs/architecture.md`/admin-shell.tsx).
- Produces: `ConsoleShell`, `ConsoleNav`, `CONSOLE_NAV_ITEMS`, `visibleNavItems` — consumidos pela Onda B (cada rota de leitura entra dentro do layout).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/features/console/components/server/console-nav.test.ts
import { describe, expect, it } from "vitest";
import type { Actor } from "@albora/core";
import { visibleNavItems } from "./console-nav";

function actor(roles: Actor["roles"]): Actor {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("visibleNavItems", () => {
  it("nav de support não mostra Auditoria nem Equipe", () => {
    const labels = visibleNavItems(actor(["support"])).map((i) => i.label);
    expect(labels).not.toContain("Auditoria");
    expect(labels).not.toContain("Equipe");
  });

  it("nav de owner mostra tudo", () => {
    const labels = visibleNavItems(actor(["owner"])).map((i) => i.label);
    expect(labels.length).toBe(9);
  });

  it("nav de engineering não mostra Contas nem Assinaturas", () => {
    const labels = visibleNavItems(actor(["engineering"])).map((i) => i.label);
    expect(labels).not.toContain("Contas");
    expect(labels).not.toContain("Assinaturas");
  });
});
```

```ts
// apps/web/app/console/layout.test.ts
import { describe, expect, it, vi } from "vitest";

const { redirectMock, resolveActorMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  resolveActorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/features/console/components/server/console-shell", () => ({
  ConsoleShell: ({ children }: { children: unknown }) => children,
}));

import ConsoleLayout from "./layout";

describe("ConsoleLayout", () => {
  it("sem ator redireciona para /console/login", async () => {
    resolveActorMock.mockResolvedValueOnce(null);
    await ConsoleLayout({ children: null });
    expect(redirectMock).toHaveBeenCalledWith("/console/login");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web/features/console apps/web/app/console/layout.test.ts`

Expected: FAIL com `Cannot find module './console-nav'` / `./layout`.

- [ ] **Step 3: Implementar o mínimo**

```tsx
// apps/web/features/console/components/server/console-nav.tsx
import Link from "next/link";
import { hasCapability, type Actor, type Capability } from "@albora/core";

export type ConsoleNavItem = { href: string; label: string; capability: Capability };

export const CONSOLE_NAV_ITEMS: readonly ConsoleNavItem[] = [
  { href: "/console", label: "Visão geral", capability: "analytics.platform.read" },
  { href: "/console/accounts", label: "Contas", capability: "accounts.read" },
  { href: "/console/events", label: "Eventos", capability: "events.read" },
  { href: "/console/subscriptions", label: "Assinaturas", capability: "subscription.read" },
  { href: "/console/support", label: "Suporte", capability: "tickets.read" },
  { href: "/console/lgpd", label: "LGPD", capability: "lgpd.dsar.read" },
  { href: "/console/audit", label: "Auditoria", capability: "audit.read" },
  { href: "/console/security", label: "Segurança", capability: "security.read" },
  { href: "/console/staff", label: "Equipe", capability: "staff.manage" },
];

export function visibleNavItems(actor: Actor): ConsoleNavItem[] {
  return CONSOLE_NAV_ITEMS.filter((item) => hasCapability(actor.roles, item.capability));
}

export function ConsoleNav({ actor }: { actor: Actor }) {
  const items = visibleNavItems(actor);
  return (
    <nav aria-label="Navegação do console" className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="tipo-label min-h-[44px] rounded-superficie px-3 py-2.5 text-ink-2 no-underline transition-colors hover:bg-superficie-alta hover:text-ink"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

```tsx
// apps/web/features/console/components/server/console-shell.tsx
import type { ReactNode } from "react";
import type { Actor } from "@albora/core";
import { adminVars } from "@/features/admin/components/server/admin-shell";
import { ConsoleNav } from "./console-nav";

/** Modo Operate: densidade alta, admin em modo claro (adminVars sem override — evento pode ser dark, console nunca). */
export function ConsoleShell({ actor, children }: { actor: Actor; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-[16rem_1fr] font-[family-name:var(--fonte-corpo)] text-ink" style={adminVars()}>
      <aside className="border-r border-linha bg-superficie px-4 py-6">
        <ConsoleNav actor={actor} />
      </aside>
      <main className="overflow-y-auto p-[clamp(1.5rem,4vw,3rem)]">{children}</main>
    </div>
  );
}
```

```tsx
// apps/web/app/console/layout.tsx
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolveActor } from "@/lib/console/actor";
import { ConsoleShell } from "@/features/console/components/server/console-shell";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  return <ConsoleShell actor={actor}>{children}</ConsoleShell>;
}
```

```tsx
// apps/web/app/console/page.tsx
export default function ConsolePage() {
  return <p className="tipo-body m-0 text-ink-3">Visão geral chega na Onda B.</p>;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm exec vitest run apps/web/features/console apps/web/app/console/layout.test.ts && pnpm exec tsc -p apps/web --noEmit`

Expected: PASS. (Nenhum `next build`/`next start` — verificação é Vitest + `tsc --noEmit`.)

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/features/console apps/web/app/console/layout.tsx apps/web/app/console/layout.test.ts apps/web/app/console/page.tsx
git commit -m "$(cat <<'EOF'
feat(console): shell e navegação filtrada por capacidade

Sidebar (Visão geral, Contas, Eventos, Assinaturas, Suporte, LGPD,
Auditoria, Segurança, Equipe) com item->capacidade num único array
tipado. Sem ator, layout redireciona para /console/login. page.tsx é
placeholder honesto, não dashboard com número inventado.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Verificação da onda (rodada pelo controller, sem subagente)

Não gera commit próprio — é checagem final sobre o que as Tasks 2–14 produziram.

Run, na ordem:

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm install
pnpm typecheck
pnpm lint
pnpm test
node tools/guards/nomenclatura.mjs
node tools/guards/tokens.mjs
node tools/guards/dominio.mjs
node tools/guards/packs.mjs
node tools/guards/sessao.mjs
node tools/guards/features.mjs
node tools/guards/api-routes.mjs
node tools/guards/camadas.mjs
```

Conferir manualmente:
- Nenhum `next build`/`next start` foi executado em nenhuma task.
- `grep -rn "role === \"owner\"\|papel === " packages/core apps/web/app/console apps/web/features/console apps/web/lib/console packages/application` não retorna nada fora de `packages/core/src/authorization/`.
- Nenhum hex novo (`grep -rn "#[0-9a-fA-F]\{3,8\}" packages/ui-web/src/data-table.tsx packages/ui-web/src/chart.tsx packages/ui-web/src/status-badge.tsx packages/ui-web/src/page-header.tsx packages/ui-web/src/empty-state.tsx` — vazio).
- Nenhum `backdrop-blur` novo (mesmo grep nos arquivos acima e em `apps/web/features/console`, `apps/web/app/console`).
- `ls packages/db/migrations | tail -3` mostra `0059_staff_identidade.sql`, `0060_audit_e_security.sql`, `0061_migrar_operadores_para_staff.sql` em sequência, sem furo.
- `grep -rln "@albora/db\|@albora/application\|from \"next" packages/core/src` não retorna nada (domínio puro).

Expected: tudo verde. Se algum guard ou `pnpm test` reprovar, a onda não está pronta — voltar à task correspondente, não relaxar o guard (CLAUDE.md: "Rebaixar um gate para deixar o CI verde é violação não negociável").
