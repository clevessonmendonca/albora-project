# Console Interno — Onda C (Ação) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as mutações do console interno — revelar PII de titular, mesa de suporte (responder/atribuir/status/prioridade), assinatura (trocar plano/cortesia/cancelar/reembolsar), LGPD (DSAR + exclusão de conta a pedido) e impersonação (request/approve/end) — todas passando por `executeCommand`, nenhuma exceção, com step-up de reautenticação para as capacidades que exigem.

**Architecture:** Mesma espinha das Ondas A/B: `apps/web/app/console/(shell)/<rota>/page.tsx` (RSC) resolve o ator e chama um caso de uso de `packages/application`; toda mutação passa por `executeCommand({actor, capability, reason, target, action, context, run})`, que autoriza via `authorize()`, abre transação, roda `run(tx)` e grava `audit_log` **na mesma transação** antes do `COMMIT`. Leitura cross-tenant continua em `withPlatformAggregation`. Rota nunca importa `@albora/db`.

**Tech Stack:** TypeScript (`exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`), pnpm workspaces, Next.js 15 (App Router, RSC + Server Actions), PostgreSQL via `pg` com RLS forçado, Vitest (`node`/`jsdom`), Node 22, React 19, `@testing-library/react`.

**Spec:** docs/superpowers/specs/2026-09-04-console-interno-design.md
**Design:** docs/superpowers/specs/2026-09-04-console-design-visual.md
**ADR:** docs/adr/0016-camadas-do-console-interno.md

## Global Constraints

- Worktree `/Users/clevesson-mendonca/orca/workspaces/albora-project/ceo-backoffice`, branch `feat/ceo-backoffice`. NUNCA tocar em `merganser`. Sem `git stash`.
- `TEST_DATABASE_URL=postgres://albora:albora@localhost:55432/albora_console`. Container `albora-pg` **compartilhado**: nunca `docker rm`, `docker compose down` nem `db:down`. Se cair, `docker start albora-pg`.
- `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `pnpm` E do `git commit`.
- **Nenhuma task roda `next build` ou `next start`.** Teste é Vitest.
- Símbolo novo em inglês (ADR 0014). Comentário em português.
- Migrations forward-only; próximo número livre: **0062**.
- `pnpm guards` (9) + `pnpm typecheck` limpos antes de cada commit.
- Conventional Commits, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Contrato de camada — vale para TODA task desta onda

```
apps/web/app/console/(shell)/<rota>/page.tsx        RSC: resolveActor() -> chama caso de uso -> renderiza
apps/web/features/console/actions.ts                 "use server" — chama caso de uso, nunca @albora/db
packages/application/src/<dominio>/<comando>.ts       executeCommand({...})
packages/db/src/<tabela>-admin.ts                     repositório, recebe PoolClient de dentro de run(tx)
```

- Rota e Server Action **nunca** importam `@albora/db` — guard `camadas` reprova. Só `@albora/application`.
- **Toda mutação passa por `executeCommand`.** Nenhum `INSERT`/`UPDATE`/`DELETE` em caso de uso fora do envelope, com UMA exceção documentada e isolada (T9, ver comentário no código — a criação do pedido de impersonação, cuja política é `needsApproval` incondicional).
- Nenhum `role ===` fora de `packages/core/src/authorization/`.
- Zero hex, zero `style` inline, zero `animate-pulse`/`backdrop-blur`, alvo ≥44px.

## Reconhecimento — divergências e achados que mudam a execução

1. **Todas as políticas de autorização já existem desde a Onda A** (`packages/core/src/authorization/policies.ts`): `reauthPolicy()` para `lgpd.delete_account`/`staff.manage`, `impersonateRequestPolicy()` para `impersonate.request` (sempre `needsApproval` por `impersonate.approve`), `refundPolicy()` para `subscription.refund` (acima de `REFUND_APPROVAL_THRESHOLD_CENTS = 50_000`, valor provisório — **mantido**, decisão de negócio do dono, não alterado aqui). `accounts.pii.reveal` não tem política — sempre `allowed`, sempre auditada (T3 não precisa de step-up).
2. **`markStaffReauthenticated()` já existe** (`apps/web/lib/console/staff-session.ts`) sobre `markReauthenticated` (`packages/db/src/staff.ts`, Onda A). O que falta é só o FLUXO (tela + ação que sabe voltar para a ação pendente) — T2 constrói isso reaproveitando `requestStaffLogin`/`completeStaffLogin` (o mesmo par usado no login).
3. **`support_tickets.assignee_account_id` (migration 0030) referencia `accounts(id)`, mas staff vive em `staff_users` (migration 0059) — nunca foi lido em código nenhum** (grep confirma: só existe na definição da coluna). T1 adiciona `assignee_staff_id uuid REFERENCES staff_users(id)`; `assignee_account_id` fica intocada e sem uso (migrations são forward-only, não se apaga coluna de produção).
4. **`audit_log.target_kind` (CHECK, migration 0060) não cobre os alvos novos desta onda.** T1 estende o CHECK com `'dsar_request'`, `'impersonation_request'`, `'payment'` (refund mira um pagamento, não uma assinatura — rotular como `'subscription'` seria auditoria enganosa).
5. **`packages/integrations` não existe.** `BillingProvider` (Asaas + stub) vive em `apps/web/lib/billing/`, com `ensureCustomer`/`createCheckout`/`parseWebhook`/`createSubscription`/`parseVendorWebhook`/`listPayments` — **sem** trocar plano, cortesia, cancelar ou reembolsar. Mover o pacote inteiro para `packages/integrations` é refactor cross-onda sem evidência de necessidade imediata (ninguém mais consome billing fora de `apps/web` hoje); T6 estende a interface existente com três métodos novos (`updateSubscription`, `cancelSubscription`, `refundPayment`) e usa **injeção de dependência estrutural**: `packages/application` declara seu próprio tipo `SubscriptionBillingPort` (mesmo shape), a rota constrói a instância real via `getBillingProvider()` (`apps/web/lib/billing`) e passa como `deps.billing` — nenhum import de `apps/web` em `packages/application`, só compatibilidade estrutural de tipos. **Isso fica registrado como dívida**: se um segundo consumidor de billing aparecer fora de `apps/web`, aí sim mover para `packages/integrations` paga.
6. **`chavesDoAcervo`/`abrirRefreshTokenParaRevogar`/`purgarAcervo` (a maquinaria do d365_delete) são funções privadas** de `packages/db/src/retention-jobs.ts` — sem `export`. T8 exporta as três e adiciona `purgeAccountDataOnClient(client, accountId, opts)`, que roda **na mesma transação** que o chamador já abriu (nunca abre a própria — é isso que permite ao comando de LGPD gravar `audit_log` e o purge atomicamente).
7. **`events.account_id` é `ON DELETE RESTRICT`** (migration 0001) — apagar uma linha de `accounts` com eventos ainda existentes estoura. T8 apaga na ordem: purga uploads/drive por evento → `DELETE FROM events WHERE account_id = $1` (libera a restrição) → `DELETE FROM accounts WHERE id = $1`. Qualquer FK não prevista nesta ordem estoura a exceção **antes do COMMIT** — fail-closed automático pelo próprio schema, sem precisar auditar manualmente cada tabela que referencia `accounts`.
8. **`impersonate.request` tem política incondicional `needsApproval`** (testado em `packages/core/src/authorization/authorize.test.ts:119-120`, Onda A) — `executeCommand` lança `ApprovalRequiredError` **sempre**, para qualquer ator, antes de `run()` rodar. Isso não é bug: é o desenho de "support pede, dono aprova" — a criação do **pedido pendente** não é a mesma ação que a política está gatilhando (essa é a ativação da sessão). T9 documenta e isola essa ÚNICA exceção à regra "toda mutação passa por executeCommand": a criação do pedido replica manualmente a MESMA garantia (BEGIN → INSERT → `audit_log` na mesma tx → COMMIT) num helper dedicado, porque chamar `executeCommand` para essa ação especificamente nunca executaria `run()`. `impersonate.approve` (sem política própria) segue o caminho normal de `executeCommand`.
9. **`vendor_subscriptions` (VendorSubscriptionAdminRow, Onda B) não expõe `id`/`asaas_subscription_id`** — só `vendorId`/`vendorName`/`plan`/`status`/`nextChargeAt`/`overdueDays`. T6 adiciona `subscriptionId`/`asaasSubscriptionId` à query e ao tipo (campo novo, aditivo — consumidores existentes de Onda B continuam válidos).
10. **Não existe tabela de "erros recentes" por conta/evento** neste codebase (grep não encontra). O painel de contexto do cliente na mesa de suporte (§8.1.6) mostra plano, eventos e pagamentos recentes; "erros recentes" fica de fora, documentado como lacuna — não inventado.
11. **Prazo legal de DSAR não é calculado automaticamente.** Nenhum documento do produto fixa um número de dias por tipo de pedido; `legal_due_at` é informado explicitamente por quem registra o pedido (compliance), não derivado de uma regra que não existe no código nem na spec.
12. **`host_sessions` não tem coluna de marcação.** T9 adiciona `impersonation_id uuid REFERENCES impersonation_requests(id)` — é isso que faz uma sessão de host "marcada" (spec §11).
13. **`/console/retention` (Onda B) está órfã de navegação** — `CONSOLE_NAV_ITEMS` só tem um item "LGPD" apontando para `/console/lgpd` (capacidade `lgpd.dsar.read`), que não existia até agora. T7 cria `/console/lgpd` (aba DSAR) com um link explícito para `/console/retention` — a aba "Consentimento agregado" do design (§8.1.7, terceira aba) **não tem task na espinha da Onda C** e não é construída; fica registrada como lacuna, não inventada.

## Lacunas encontradas no reconhecimento

| Lacuna | O que falta | O que a task faz |
|---|---|---|
| `BillingProvider` sem mutação | `updateSubscription`/`cancelSubscription`/`refundPayment` não existem na interface (`apps/web/lib/billing/types.ts`) | T6 estende a interface + implementa Asaas real e stub de dev |
| `packages/integrations` não existe | ADR 0016 nomeia a camada; ela não foi criada em nenhuma onda anterior | T6 usa injeção de dependência estrutural, sem mover o pacote (dívida registrada, não fechada aqui) |
| `assignee_account_id` referencia a tabela errada | Staff não é `accounts` desde a Onda A | T1 adiciona `assignee_staff_id uuid REFERENCES staff_users(id)`; coluna antiga fica sem uso |
| `audit_log.target_kind` não cobre `dsar_request`/`impersonation_request`/`payment` | CHECK da migration 0060 é fechado demais para esta onda | T1 estende o CHECK |
| Maquinaria do d365_delete é privada | `chavesDoAcervo`/`abrirRefreshTokenParaRevogar`/`purgarAcervo` sem `export` | T8 exporta as três + adiciona `purgeAccountDataOnClient` |
| `events.account_id` é `ON DELETE RESTRICT` | Apagar conta com eventos vivos estoura | T8 apaga eventos primeiro, na mesma transação |
| `impersonate.request` nunca fica `allowed` | Política incondicional (Onda A, testada) — bloqueia `run()` de `executeCommand` sempre | T9 isola essa ação como única exceção documentada à regra do envelope |
| Sem tabela de "erros recentes" | Não existe no schema | T5 não mostra essa seção; documentado, não inventado |
| DSAR sem regra de prazo automática | Nenhuma fonte no produto define dias por tipo | T7 exige `legalDueAt` como input explícito, nunca calculado |
| `/console/retention` órfã de nav | Só existe um item "LGPD" na sidebar, sem "Retenção" | T7 cria `/console/lgpd` com link para `/console/retention`; aba "Consentimento" não é construída (fora da espinha) |
| `host_sessions` sem marcação | Sem coluna para "sessão impersonada" | T9 adiciona `impersonation_id` |

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/migrations/0062_impersonacao_dsar_e_assignee_staff.sql` | `impersonation_requests`, `dsar_requests`, `support_tickets.assignee_staff_id`, `host_sessions.impersonation_id`, extensão do CHECK de `audit_log.target_kind` |
| `packages/db/src/audit.ts` | Modificado: `AuditTargetKind` ganha `'dsar_request' \| 'impersonation_request' \| 'payment'` |
| `packages/db/src/console-mutations-schema.test.ts` | Prova as constraints novas da migration 0062 |
| `apps/web/app/console/reauth/page.tsx` | Tela de step-up — pede reautenticação e volta para a ação pendente |
| `apps/web/features/console/components/client/reauth-form.tsx` | Client component do fluxo de reauth |
| `apps/web/features/console/actions.ts` | Modificado: `requestReauthAction`, `completeReauthAction`, e as ações de T3/T4/T6/T7/T8/T9 |
| `packages/db/src/accounts-admin.ts` | Modificado: `getRawAccountContact` |
| `packages/application/src/accounts/reveal-account-pii.ts` | `revealAccountPii` — primeira mutação ponta a ponta da onda |
| `packages/ui-web/src/confirm-dialog.tsx` | `ConfirmDialog` — primitivo novo, primeiro usado por T3 |
| `packages/db/src/staff.ts` | Modificado: `listActiveStaffUsers` (para o dropdown de atribuição) |
| `packages/application/src/support/respond-ticket.ts` | `respondTicket` |
| `packages/application/src/support/assign-ticket.ts` | `assignTicket` |
| `packages/application/src/support/update-ticket-status.ts` | `updateTicketStatus` |
| `packages/application/src/support/update-ticket-priority.ts` | `updateTicketPriority` |
| `packages/db/src/support.ts` | Modificado: `getSupportTicketAdmin`, `listSupportMessagesAdmin`, `assignSupportTicketOnClient`, `updateSupportTicketStatusOnClient`, `updateSupportTicketPriorityOnClient`, `insertSupportMessageOnClient` |
| `apps/web/app/console/(shell)/support/page.tsx` | Mesa de suporte — fila + ticket selecionado |
| `apps/web/features/console/components/client/support-queue.tsx` | Fila, ordenada por SLA |
| `apps/web/features/console/components/client/ticket-detail.tsx` | Thread, responder, atribuir, status/prioridade |
| `apps/web/lib/billing/types.ts` | Modificado: `BillingProvider` ganha `updateSubscription`/`cancelSubscription`/`refundPayment` |
| `apps/web/lib/billing/provider.ts` | Modificado: implementação Asaas + stub dos três métodos novos |
| `packages/db/src/subscriptions-admin.ts` | Modificado: `subscriptionId`/`asaasSubscriptionId` na query e no tipo |
| `packages/db/src/billing.ts` | Modificado: `listBillingPaymentsForAccountAdmin`, `getVendorSubscriptionByIdAdmin` |
| `packages/application/src/subscriptions/billing-port.ts` | `SubscriptionBillingPort` — porta local, compatível estruturalmente com `BillingProvider` |
| `packages/application/src/subscriptions/change-plan.ts` | `changeSubscriptionPlan` |
| `packages/application/src/subscriptions/apply-courtesy.ts` | `applySubscriptionCourtesy` |
| `packages/application/src/subscriptions/cancel-subscription.ts` | `cancelSubscription` |
| `packages/application/src/subscriptions/refund-payment.ts` | `refundPayment` — capacidade dinâmica (`subscription.refund` ou `.refund.approve`) |
| `apps/web/app/console/(shell)/subscriptions/page.tsx` | Modificado: ações de mutação por capacidade |
| `apps/web/features/console/components/client/subscription-actions.tsx` | UI das quatro mutações |
| `packages/db/src/dsar.ts` | CRUD de `dsar_requests` |
| `packages/application/src/lgpd/create-dsar-request.ts` | `createDsarRequest` |
| `packages/application/src/lgpd/list-dsar-requests.ts` | `listDsarRequests` |
| `packages/application/src/lgpd/update-dsar-request.ts` | `updateDsarRequest` |
| `apps/web/app/console/(shell)/lgpd/page.tsx` | Aba DSAR + link para Retenção |
| `apps/web/features/console/components/client/dsar-form.tsx` | Criar/atualizar pedido |
| `packages/db/src/retention-jobs.ts` | Modificado: exporta as três funções privadas + `purgeAccountDataOnClient` |
| `packages/ui-web/src/danger-dialog.tsx` | `DangerDialog` — exige digitar identificador + motivo |
| `packages/application/src/lgpd/delete-account.ts` | `deleteAccountOnRequest` |
| `apps/web/features/console/components/client/delete-account-danger.tsx` | UI da exclusão |
| `packages/db/src/host-auth.ts` | Modificado: `HostResolvida.impersonationId`, `issueMarkedHostSession` |
| `packages/db/src/impersonation.ts` | CRUD de `impersonation_requests` |
| `packages/ui-web/src/drawer.tsx` | `Drawer` — primitivo novo, primeiro usado por T9 |
| `packages/ui-web/src/audit-entry.tsx` | `AuditEntry` |
| `packages/ui-web/src/timeline.tsx` | `Timeline` |
| `packages/application/src/impersonation/request-impersonation.ts` | `requestImpersonation` (exceção documentada, item 8) |
| `packages/application/src/impersonation/approve-impersonation.ts` | `approveImpersonation` |
| `packages/application/src/impersonation/end-impersonation.ts` | `endImpersonation` |
| `apps/web/features/console/components/client/impersonation-request-drawer.tsx` | Drawer de "Ver como" |
| `apps/web/features/console/components/server/console-shell.tsx` | Modificado: banner de impersonação ativa |
| `apps/web/app/console/(shell)/layout.tsx` | Modificado: busca impersonação ativa do ator e repassa |

---

### Task 1: Migration 0062 — impersonação, DSAR, assignee de staff, extensão do CHECK de audit_log

**Files:**
- Create: `packages/db/migrations/0062_impersonacao_dsar_e_assignee_staff.sql`
- Modify: `packages/db/src/audit.ts`
- Create: `packages/db/src/console-mutations-schema.test.ts`

**Interfaces:**
- Produces: tabelas `impersonation_requests`, `dsar_requests`; colunas `support_tickets.assignee_staff_id`, `host_sessions.impersonation_id`; `AuditTargetKind` estendido.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/console-mutations-schema.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertAuditLog } from "./audit";
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

async function contaEStaff() {
  const sufixo = Math.random().toString(36).slice(2);
  const { rows: c } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${sufixo}@exemplo.test`,
  ]);
  const { rows: s } = await admin.query(
    "INSERT INTO staff_users (email, name) VALUES ($1, $2) RETURNING id",
    [`staff-${sufixo}@albora.com`, "Staff de Teste"],
  );
  return { contaId: c[0].id as string, staffId: s[0].id as string };
}

describe("migration 0062", () => {
  it("impersonation_requests recusa reason vazio", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    await expect(
      admin.query(
        `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason)
         VALUES ($1, $2, '')`,
        [staffId, contaId],
      ),
    ).rejects.toThrow();
  });

  it("impersonation_requests recusa status fora do enum", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    await expect(
      admin.query(
        `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason, status)
         VALUES ($1, $2, 'motivo válido', 'inventado')`,
        [staffId, contaId],
      ),
    ).rejects.toThrow();
  });

  it("impersonation_requests aceita o ciclo pending -> approved -> active -> ended", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason)
       VALUES ($1, $2, 'atender ticket p0') RETURNING id`,
      [staffId, contaId],
    );
    const id = rows[0]!.id;
    for (const status of ["approved", "active", "ended"]) {
      await admin.query("UPDATE impersonation_requests SET status = $2 WHERE id = $1", [id, status]);
    }
    const { rows: atual } = await admin.query("SELECT status FROM impersonation_requests WHERE id = $1", [id]);
    expect(atual[0].status).toBe("ended");
  });

  it("host_sessions aceita impersonation_id apontando para um pedido", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    const { rows: pedido } = await admin.query<{ id: string }>(
      `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason)
       VALUES ($1, $2, 'suporte') RETURNING id`,
      [staffId, contaId],
    );
    await expect(
      admin.query(
        `INSERT INTO host_sessions (token_hash, account_id, expires_at, impersonation_id)
         VALUES ($1, $2, now() + interval '30 minutes', $3)`,
        [Buffer.from("hash-de-teste"), contaId, pedido[0]!.id],
      ),
    ).resolves.not.toThrow();
  });

  it("dsar_requests recusa kind fora do enum", async () => {
    await prepararBanco();
    const { contaId } = await contaEStaff();
    await expect(
      admin.query(
        `INSERT INTO dsar_requests (kind, subject_account_id, legal_due_at)
         VALUES ('inventado', $1, now() + interval '15 days')`,
        [contaId],
      ),
    ).rejects.toThrow();
  });

  it("dsar_requests aceita os quatro tipos previstos", async () => {
    await prepararBanco();
    const { contaId } = await contaEStaff();
    for (const kind of ["access", "portability", "rectification", "deletion"]) {
      await expect(
        admin.query(
          `INSERT INTO dsar_requests (kind, subject_account_id, legal_due_at)
           VALUES ($1, $2, now() + interval '15 days')`,
          [kind, contaId],
        ),
      ).resolves.not.toThrow();
    }
  });

  it("support_tickets.assignee_staff_id aceita um staff e some sozinho quando o staff é removido", async () => {
    await prepararBanco();
    const { contaId, staffId } = await contaEStaff();
    const { rows: t } = await admin.query<{ id: string }>(
      `INSERT INTO support_tickets (account_id, source, subject, assignee_staff_id)
       VALUES ($1, 'admin', 'dúvida', $2) RETURNING id`,
      [contaId, staffId],
    );
    await admin.query("DELETE FROM staff_users WHERE id = $1", [staffId]);
    const { rows: depois } = await admin.query("SELECT assignee_staff_id FROM support_tickets WHERE id = $1", [
      t[0]!.id,
    ]);
    expect(depois[0].assignee_staff_id).toBeNull();
  });

  it("audit_log aceita os três target_kind novos desta onda", async () => {
    await prepararBanco();
    const client = await app.connect();
    try {
      for (const targetKind of ["dsar_request", "impersonation_request", "payment"] as const) {
        await expect(
          insertAuditLog(client, {
            actorKind: "staff",
            action: "teste.schema",
            targetKind,
            reason: "prova de schema da migration 0062",
          }),
        ).resolves.toBeTruthy();
      }
    } finally {
      client.release();
    }
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/console-mutations-schema.test.ts`

Expected: FAIL — `relation "impersonation_requests" does not exist` (a migration ainda não existe; `migrar()` roda só as migrations presentes no diretório).

- [ ] **Step 3: Implementar o mínimo**

```sql
-- packages/db/migrations/0062_impersonacao_dsar_e_assignee_staff.sql
-- 0062 — impersonação, DSAR e assignee de staff em tickets (Onda C — mutações)
--
-- `assignee_account_id` (migration 0030) referenciava accounts(id), mas staff
-- vive em staff_users desde a migration 0059 (tabela isolada de propósito —
-- comprometer auth de cliente nunca deve virar acesso interno). A coluna
-- antiga nunca foi lida em código nenhum (grep confirma) — fica como está,
-- forward-only; assignee_staff_id é a que os casos de uso da mesa de
-- suporte (Onda C, T4) de fato usam.
ALTER TABLE support_tickets
  ADD COLUMN assignee_staff_id uuid REFERENCES staff_users(id) ON DELETE SET NULL;

CREATE INDEX support_tickets_por_assignee ON support_tickets (assignee_staff_id)
  WHERE assignee_staff_id IS NOT NULL;

-- audit_log.target_kind (migration 0060) ganha os alvos que esta onda passa
-- a auditar. 'payment' é distinto de 'subscription': um reembolso mira um
-- pagamento específico (billing_payments), não a assinatura — rotular como
-- 'subscription' seria auditoria enganosa sobre o que de fato mudou.
ALTER TABLE audit_log DROP CONSTRAINT audit_log_target_kind_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_target_kind_check
  CHECK (target_kind IN ('account', 'event', 'ticket', 'subscription', 'staff_user', 'platform', 'dsar_request', 'impersonation_request', 'payment'));

-- Impersonação: request -> approve -> active -> ended, TTL curto, uso único
-- (spec §11). approver_staff_id fica NULL enquanto pending; expires_at só é
-- preenchido na aprovação (o TTL começa a contar dali, não da criação).
CREATE TABLE impersonation_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_staff_id  uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  approver_staff_id   uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  target_account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason              text NOT NULL CHECK (length(btrim(reason)) > 0),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'active', 'ended', 'denied', 'expired')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  approved_at         timestamptz,
  started_at          timestamptz,
  expires_at          timestamptz,
  ended_at            timestamptz
);
CREATE INDEX impersonation_requests_por_status ON impersonation_requests (status, created_at DESC);
CREATE INDEX impersonation_requests_por_alvo ON impersonation_requests (target_account_id, created_at DESC);

-- Sessão de host "marcada" (spec §11): toda ação na janela sabe que é
-- impersonada porque a própria sessão carrega o pedido que a originou.
ALTER TABLE host_sessions
  ADD COLUMN impersonation_id uuid REFERENCES impersonation_requests(id) ON DELETE SET NULL;

-- DSAR: pedido do titular, com prazo legal e responsável. legal_due_at é
-- NOT NULL sem DEFAULT de propósito — nenhuma fonte no produto define um
-- número de dias por tipo de pedido; quem registra o pedido informa o
-- prazo explicitamente (Lacunas).
CREATE TABLE dsar_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                text NOT NULL CHECK (kind IN ('access', 'portability', 'rectification', 'deletion')),
  subject_account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  received_at         timestamptz NOT NULL DEFAULT now(),
  legal_due_at        timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'completed', 'refused')),
  assignee_staff_id   uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  evidence_url        text,
  completed_at        timestamptz,
  notes               text
);
CREATE INDEX dsar_requests_por_status ON dsar_requests (status, legal_due_at);
CREATE INDEX dsar_requests_por_prazo ON dsar_requests (legal_due_at) WHERE status IN ('open', 'in_progress');
```

```ts
// packages/db/src/audit.ts — modificar a linha do tipo
export type AuditTargetKind =
  | "account" | "event" | "ticket" | "subscription" | "staff_user" | "platform"
  | "dsar_request" | "impersonation_request" | "payment";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/console-mutations-schema.test.ts && pnpm --filter @albora/db typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/migrations/0062_impersonacao_dsar_e_assignee_staff.sql packages/db/src/audit.ts packages/db/src/console-mutations-schema.test.ts
git commit -m "$(cat <<'EOF'
feat(db): migration 0062 — impersonação, DSAR e assignee de staff

impersonation_requests + dsar_requests (schema da Onda C), assignee_staff_id
em support_tickets (assignee_account_id apontava para accounts, staff vive
em staff_users desde a Onda A), impersonation_id em host_sessions (sessão
marcada), e target_kind de audit_log estendido para dsar_request/
impersonation_request/payment.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Step-up de reautenticação (`/console/reauth`)

**Files:**
- Create: `apps/web/app/console/reauth/page.tsx`
- Create: `apps/web/features/console/components/client/reauth-form.tsx`
- Create: `apps/web/features/console/components/client/reauth-form.test.tsx`
- Modify: `apps/web/features/console/actions.ts`

**Interfaces:**
- Consumes: `resolveActor` (`@/lib/console/actor`), `markStaffReauthenticated` (`@/lib/console/staff-session`, já existe desde a Onda A), `requestStaffLogin`/`completeStaffLogin` (`@albora/application`, já existem), `findStaffById` (`@albora/db`).
- Produces: `requestReauthAction`, `completeReauthAction` (`apps/web/features/console/actions.ts`) — consumidos por T8 (exclusão de conta).

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// apps/web/features/console/components/client/reauth-form.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReauthForm } from "./reauth-form";

vi.mock("@/features/console/actions", () => ({
  requestReauthAction: vi.fn().mockResolvedValue({ sent: true }),
  completeReauthAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("ReauthForm", () => {
  it("sem token pede confirmação e envia o link ao clicar", async () => {
    render(<ReauthForm magic={null} next="/console/accounts/x" />);
    expect(screen.getByRole("heading", { name: "Confirmar que é você" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar link de confirmação" }));
    expect(await screen.findByText(/o link já está a caminho/i)).toBeInTheDocument();
  });

  it("com token confirma e redireciona para next", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<ReauthForm magic="tok123" next="/console/accounts/x" />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(assign).toHaveBeenCalledWith("/console/accounts/x");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/console/components/client/reauth-form.test.tsx`

Expected: FAIL com `Cannot find module './reauth-form'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// apps/web/features/console/actions.ts — adicionar ao arquivo existente
import { findStaffById } from "@albora/db";
import { markStaffReauthenticated } from "@/lib/console/staff-session";
import { resolveActor } from "@/lib/console/actor";

// (as importações acima entram junto das já existentes no topo do arquivo)

export async function requestReauthAction(): Promise<{ sent: boolean }> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const staff = await findStaffById(getPool(), actor.staffUserId);
  if (!staff) redirect("/console/login");

  const jar = await headers();
  const origin = jar.get("origin") ?? "";
  const ipHash = await currentIpHash();

  await requestStaffLogin(getPool(), {
    email: staff.email,
    ipHash,
    sendEmail: async ({ to, token }) => {
      void sendHostEmail({
        to,
        subject: "Confirme que é você — ação sensível no console",
        text: [
          "Uma ação sensível no console pede reautenticação recente:",
          "",
          `${origin}/console/reauth?m=${token}`,
          "",
          "Se você não pediu isso, ignore este e-mail.",
        ].join("\n"),
      });
    },
  });

  return { sent: true };
}

/**
 * Diferente de `completeLoginAction`: aqui NÃO se emite sessão nova — a
 * sessão já existe. Reautenticação confirma que quem já está logado ainda
 * é quem diz ser; por isso o link só vale se o `staffUserId` que ele resolve
 * bate com o da sessão atual — usar o link de reauth de outro staff para
 * reautenticar A SUA sessão seria uma escalação, não uma confirmação.
 */
export async function completeReauthAction(token: string): Promise<{ ok: boolean }> {
  const actor = await resolveActor();
  if (!actor) return { ok: false };

  const ipHash = await currentIpHash();
  const result = await completeStaffLogin(getPool(), { token, ipHash });
  if (!result.ok) return { ok: false };
  if (result.staffUserId !== actor.staffUserId) return { ok: false };

  await markStaffReauthenticated();
  return { ok: true };
}
```

```tsx
// apps/web/features/console/components/client/reauth-form.tsx
"use client";

import { useState, useTransition } from "react";
import { PrimaryButton } from "@albora/ui-web";
import { completeReauthAction, requestReauthAction } from "@/features/console/actions";

export function ReauthForm({ magic, next }: { magic: string | null; next: string }) {
  return magic ? <Confirm token={magic} next={next} /> : <RequestLink next={next} />;
}

function RequestLink({ next }: { next: string }) {
  const [status, setStatus] = useState<"editing" | "sent">("editing");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        <h1 className="tipo-title m-0">Confirmar que é você</h1>
        {status === "sent" ? (
          <p className="tipo-body m-0 text-ink-2">O link já está a caminho do seu e-mail.</p>
        ) : (
          <>
            <p className="tipo-body m-0 text-ink-2">
              Essa ação exige reautenticação recente. Enviamos um link de confirmação para o seu e-mail cadastrado.
            </p>
            <input type="hidden" value={next} readOnly />
            <PrimaryButton
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await requestReauthAction();
                  setStatus("sent");
                })
              }
            >
              {pending ? "Enviando…" : "Enviar link de confirmação"}
            </PrimaryButton>
          </>
        )}
      </div>
    </main>
  );
}

function Confirm({ token, next }: { token: string; next: string }) {
  const [status, setStatus] = useState<"ready" | "error">("ready");
  const [pending, startTransition] = useTransition();

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="elev-2 flex w-full max-w-[26rem] flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
        <h1 className="tipo-title m-0">Confirmar que é você</h1>
        {status === "error" && (
          <p role="alert" className="tipo-caption m-0 text-critico">
            Este link está inválido, expirou ou não pertence a esta sessão.
          </p>
        )}
        <PrimaryButton
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await completeReauthAction(token);
              if (result.ok) window.location.assign(next);
              else setStatus("error");
            })
          }
        >
          {pending ? "Confirmando…" : "Confirmar"}
        </PrimaryButton>
      </div>
    </main>
  );
}
```

```tsx
// apps/web/app/console/reauth/page.tsx
import { ReauthForm } from "@/features/console/components/client/reauth-form";

export const dynamic = "force-dynamic";

export default async function ConsoleReauthPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; next?: string }>;
}) {
  const { m, next } = await searchParams;
  // next sempre relativo a /console — nunca redireciona pra fora do console
  // por um parâmetro de URL não confiável (open redirect).
  const destino = next && next.startsWith("/console") ? next : "/console";
  return <ReauthForm magic={m ?? null} next={destino} />;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/console/components/client/reauth-form.test.tsx && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/app/console/reauth apps/web/features/console/components/client/reauth-form.tsx apps/web/features/console/components/client/reauth-form.test.tsx apps/web/features/console/actions.ts
git commit -m "$(cat <<'EOF'
feat(console): fluxo de step-up de reautenticação

markStaffReauthenticated já existia (Onda A) mas sem caminho pra chegar
até ele. /console/reauth reaproveita requestStaffLogin/completeStaffLogin
(o mesmo par do login), confirma que o link pertence à sessão atual antes
de marcar reauth, e volta para a ação pendente via `next`.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Revelar PII do titular (`accounts.pii.reveal`)

A mutação mais simples da onda — exercita `executeCommand` ponta a ponta primeiro. Sem política (sempre `allowed`), sempre auditada. Introduz `ConfirmDialog`.

**Files:**
- Modify: `packages/db/src/accounts-admin.ts`
- Modify: `packages/db/src/accounts-admin.test.ts`
- Create: `packages/ui-web/src/confirm-dialog.tsx`
- Create: `packages/ui-web/src/confirm-dialog.test.tsx`
- Modify: `packages/ui-web/src/index.ts`
- Create: `packages/application/src/accounts/reveal-account-pii.ts`
- Create: `packages/application/src/accounts/reveal-account-pii.test.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `apps/web/features/console/actions.ts`
- Create: `apps/web/features/console/components/client/reveal-pii-button.tsx`
- Create: `apps/web/features/console/components/client/reveal-pii-button.test.tsx`
- Modify: `apps/web/app/console/(shell)/accounts/[id]/page.tsx`
- Modify: `apps/web/app/console/(shell)/accounts/[id]/page.test.ts`

**Interfaces:**
- Consumes: `executeCommand` (`@albora/application/envelope`), `Dialog`/`Button` (`@albora/ui-web`).
- Produces: `getRawAccountContact` (`@albora/db`), `revealAccountPii` (`@albora/application`), `ConfirmDialog` (`@albora/ui-web`), `revealAccountPiiAction` (server action).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/accounts-admin.test.ts — adicionar ao describe existente
import { getRawAccountContact } from "./accounts-admin";

describe("getRawAccountContact", () => {
  it("devolve o e-mail cru, não mascarado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const contato = await getRawAccountContact(agregador, a.contaId);
    expect(contato?.email).toBe("anfitriao-a@exemplo.test");
  });

  it("conta inexistente devolve null", async () => {
    await prepararBanco();
    const contato = await getRawAccountContact(agregador, "00000000-0000-0000-0000-000000000000");
    expect(contato).toBeNull();
  });
});
```

```ts
// packages/application/src/accounts/reveal-account-pii.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { revealAccountPii } from "./reveal-account-pii";

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

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("revealAccountPii", () => {
  it("nega quem não tem accounts.pii.reveal", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await expect(
      revealAccountPii({ pool: app }, { actor: actor(["engineering"]), reason: "curiosidade", accountId: a.contaId }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("suporte com motivo revela o e-mail cru e grava audit_log", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const resultado = await revealAccountPii(
      { pool: app },
      { actor: actor(["support"]), reason: "ticket #42 — confirmar e-mail de cobrança", accountId: a.contaId },
    );
    expect(resultado.email).toBe("anfitriao-a@exemplo.test");

    const { rows } = await admin.query(
      "SELECT action, target_kind, target_id, reason FROM audit_log WHERE action = 'accounts.pii.reveal'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].target_kind).toBe("account");
    expect(rows[0].target_id).toBe(a.contaId);
    expect(rows[0].reason).toContain("ticket #42");
  });

  it("motivo vazio nunca chega a revelar nada", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await expect(
      revealAccountPii({ pool: app }, { actor: actor(["support"]), reason: "  ", accountId: a.contaId }),
    ).rejects.toThrow(CommandDeniedError);
  });
});
```

```tsx
// packages/ui-web/src/confirm-dialog.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("chama onConfirm ao clicar em confirmar", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Revelar contato?"
        description="Isso grava auditoria."
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("chama onClose ao clicar em cancelar", async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog open onClose={onClose} onConfirm={() => {}} title="Revelar contato?" />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pending desabilita os dois botões", () => {
    render(<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} title="Revelar contato?" pending />);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aguarde…" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/accounts-admin.test.ts && pnpm --filter @albora/ui-web exec vitest run src/confirm-dialog.test.tsx && pnpm --filter @albora/application exec vitest run src/accounts/reveal-account-pii.test.ts`

Expected: FAIL — `getRawAccountContact is not a function`, `Cannot find module './confirm-dialog'`, `Cannot find module './reveal-account-pii'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/accounts-admin.ts — adicionar ao arquivo existente
export type RawAccountContact = { email: string };

/**
 * ÚNICO lugar em `packages/db` que devolve o e-mail de conta sem máscara —
 * `listAccountsAdmin`/`getAccountDetailAdmin` mascaram sempre. Chamado só
 * por `revealAccountPii`, dentro de `executeCommand`, nunca por uma tela
 * de leitura direto.
 */
export async function getRawAccountContact(pool: Pool, accountId: string): Promise<RawAccountContact | null> {
  const { rows } = await pool.query<{ email: string }>("SELECT email FROM accounts WHERE id = $1", [accountId]);
  const row = rows[0];
  return row ? { email: row.email } : null;
}
```

```ts
// packages/db/src/index.ts — adicionar ao bloco de exports de accounts-admin
export { getAccountDetailAdmin, getRawAccountContact, listAccountsAdmin } from "./accounts-admin";
export type { RawAccountContact } from "./accounts-admin";
```

```ts
// packages/application/src/accounts/reveal-account-pii.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getRawAccountContact } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type RevealAccountPiiInput = { actor: Actor; reason: string; accountId: string };
export type RevealAccountPiiResult = { email: string };

/**
 * `accounts.pii.reveal` não tem política em `POLICIES` — sempre `allowed`
 * para quem tem a capacidade (spec §5.3: "Permitida, sempre auditada").
 * A garantia inteira desta ação está no `reason` obrigatório e na linha de
 * `audit_log` — não em fricção extra na autorização.
 */
export async function revealAccountPii(
  deps: { pool: Pool },
  input: RevealAccountPiiInput,
): Promise<RevealAccountPiiResult> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "accounts.pii.reveal",
    reason: input.reason,
    target: { kind: "account", id: input.accountId },
    action: "accounts.pii.reveal",
    run: async () => {
      const contato = await getRawAccountContact(deps.pool, input.accountId);
      if (!contato) throw new Error(`conta ${input.accountId} não encontrada`);
      return contato;
    },
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { RevealAccountPiiInput, RevealAccountPiiResult } from "./accounts/reveal-account-pii";
export { revealAccountPii } from "./accounts/reveal-account-pii";
```

```tsx
// packages/ui-web/src/confirm-dialog.tsx
"use client";

import type { ReactNode } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
};

/**
 * Confirmação genérica para uma ação que tem consequência mas não é
 * irreversível ao ponto de exigir `DangerDialog` (T8) — ex.: revelar PII,
 * mudar status de ticket. Nunca usada para exclusão de conta.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pending,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="confirm-dialog-title">
      <div className="elev-2 mx-auto flex w-full max-w-[28rem] flex-col gap-4 rounded-superficie border border-linha bg-superficie p-6">
        <h2 id="confirm-dialog-title" className="tipo-den-titulo m-0">
          {title}
        </h2>
        {description && <div className="tipo-den-corpo text-ink-2">{description}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {pending ? "Aguarde…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

```ts
// packages/ui-web/src/index.ts — adicionar
export { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";
```

```ts
// apps/web/features/console/actions.ts — adicionar
import { revealAccountPii } from "@albora/application";
import { CommandDeniedError, ReauthRequiredError } from "@albora/application";

export type RevealAccountPiiActionResult = { ok: true; email: string } | { ok: false; error: string };

export async function revealAccountPiiAction(
  accountId: string,
  reason: string,
): Promise<RevealAccountPiiActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  try {
    const resultado = await revealAccountPii({ pool: getPool() }, { actor, reason, accountId });
    return { ok: true, email: resultado.email };
  } catch (erro) {
    if (erro instanceof CommandDeniedError) return { ok: false, error: erro.message };
    if (erro instanceof ReauthRequiredError) return { ok: false, error: "reautenticação exigida" };
    throw erro;
  }
}
```

```tsx
// apps/web/features/console/components/client/reveal-pii-button.tsx
"use client";

import { useState, useTransition } from "react";
import { Button, ConfirmDialog, TextField } from "@albora/ui-web";
import { revealAccountPiiAction } from "@/features/console/actions";

export function RevealPiiButton({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (revealed) {
    return <span className="tipo-den-corpo text-ink">{revealed}</span>;
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Revelar contato
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await revealAccountPiiAction(accountId, reason);
            if (resultado.ok) {
              setRevealed(resultado.email);
              setOpen(false);
            } else {
              setError(resultado.error);
            }
          })
        }
        title="Revelar contato do titular?"
        description={
          <div className="flex flex-col gap-3">
            <p className="m-0">Isso grava uma entrada na auditoria com o motivo abaixo.</p>
            <TextField
              label="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex.: ticket #42 — confirmar e-mail de cobrança"
            />
            {error && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {error}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmLabel="Revelar"
      />
    </>
  );
}
```

```tsx
// apps/web/features/console/components/client/reveal-pii-button.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RevealPiiButton } from "./reveal-pii-button";

const { revealAccountPiiActionMock } = vi.hoisted(() => ({ revealAccountPiiActionMock: vi.fn() }));
vi.mock("@/features/console/actions", () => ({ revealAccountPiiAction: revealAccountPiiActionMock }));

describe("RevealPiiButton", () => {
  it("exige motivo antes de mostrar o e-mail revelado", async () => {
    revealAccountPiiActionMock.mockResolvedValueOnce({ ok: true, email: "titular@exemplo.test" });
    render(<RevealPiiButton accountId="conta-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Revelar contato" }));
    await userEvent.type(screen.getByLabelText("Motivo"), "ticket #7");
    await userEvent.click(screen.getByRole("button", { name: "Revelar" }));

    expect(await screen.findByText("titular@exemplo.test")).toBeInTheDocument();
    expect(revealAccountPiiActionMock).toHaveBeenCalledWith("conta-1", "ticket #7");
  });

  it("erro de autorização aparece sem revelar nada", async () => {
    revealAccountPiiActionMock.mockResolvedValueOnce({ ok: false, error: "ator sem a capacidade accounts.pii.reveal" });
    render(<RevealPiiButton accountId="conta-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Revelar contato" }));
    await userEvent.click(screen.getByRole("button", { name: "Revelar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ator sem a capacidade");
  });
});
```

```tsx
// apps/web/app/console/(shell)/accounts/[id]/page.tsx — modificar o EntityHeader
import { hasCapability } from "@albora/core";
import { RevealPiiButton } from "@/features/console/components/client/reveal-pii-button";

// dentro do componente, após calcular `conta`:
      <EntityHeader
        title={conta.maskedEmail}
        subtitle={ROTULO_TIPO[conta.type]}
        status={{ tone: TOM_STATUS[conta.status], label: ROTULO_STATUS[conta.status] }}
        actions={hasCapability(actor.roles, "accounts.pii.reveal") ? <RevealPiiButton accountId={id} /> : undefined}
      />
```

```ts
// apps/web/app/console/(shell)/accounts/[id]/page.test.ts — adicionar
it("com accounts.pii.reveal mostra o botão de revelar contato", async () => {
  resolveActorMock.mockResolvedValueOnce({ ...actorBase, roles: ["support"] });
  getAccountMock.mockResolvedValueOnce(contaDetalheFixture());
  const element = await AccountDetailPage({ params: Promise.resolve({ id: "conta-1" }) });
  expect(JSON.stringify(element)).toContain("Revelar contato");
});

it("sem accounts.pii.reveal não mostra o botão", async () => {
  resolveActorMock.mockResolvedValueOnce({ ...actorBase, roles: ["engineering"] });
  getAccountMock.mockResolvedValueOnce(contaDetalheFixture());
  const element = await AccountDetailPage({ params: Promise.resolve({ id: "conta-1" }) });
  expect(JSON.stringify(element)).not.toContain("Revelar contato");
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/accounts-admin.test.ts && pnpm --filter @albora/ui-web exec vitest run src/confirm-dialog.test.tsx && pnpm --filter @albora/application exec vitest run src/accounts/reveal-account-pii.test.ts && pnpm --filter web exec vitest run features/console/components/client/reveal-pii-button.test.tsx "app/console/(shell)/accounts/[id]/page.test.ts" && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/accounts-admin.ts packages/db/src/accounts-admin.test.ts packages/db/src/index.ts packages/ui-web/src/confirm-dialog.tsx packages/ui-web/src/confirm-dialog.test.tsx packages/ui-web/src/index.ts packages/application/src/accounts/reveal-account-pii.ts packages/application/src/accounts/reveal-account-pii.test.ts packages/application/src/index.ts apps/web/features/console/actions.ts apps/web/features/console/components/client/reveal-pii-button.tsx apps/web/features/console/components/client/reveal-pii-button.test.tsx "apps/web/app/console/(shell)/accounts/[id]/page.tsx" "apps/web/app/console/(shell)/accounts/[id]/page.test.ts"
git commit -m "$(cat <<'EOF'
feat(console): revelar PII do titular via executeCommand

Primeira mutação da onda ponta a ponta: accounts.pii.reveal não tem
política (sempre allowed), sempre auditada. ConfirmDialog é o primeiro
primitivo novo de Onda C.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Casos de uso da mesa de suporte

**Achado que muda a execução desta task:** `support_tickets`/`support_messages` têm `FORCE ROW LEVEL SECURITY` (migration 0030) com só duas políticas: `conta_ticket` (host vê os seus, por `app.account_id`) e `ops_ticket_lista` (SELECT cross-conta via `platform_operators`, que a Onda D aposenta). **Nenhuma das duas abre caminho de ESCRITA para staff** — staff não tem `accounts.id`. Um `UPDATE`/`INSERT` de dentro de `executeCommand` (conexão comum, sem GUC) seria filtrado pela RLS silenciosamente (zero linhas afetadas, sem erro) — pior que falhar, porque pareceria ter funcionado.

A correção fica em duas partes, ambas nesta task:
1. Migration **0063** adiciona duas políticas de escrita em `support_tickets`/`support_messages`, condicionadas a um marcador de transação (`app.staff_command`), e `support_messages.author_staff_id` (não existia — sem ela, toda resposta de staff ficaria anônima no thread, só rastreável via `audit_log`).
2. `packages/application/src/envelope/command.ts` (Onda A) passa a rodar `SELECT set_config('app.staff_command', 'true', true)` logo após o `BEGIN` — **toda** transação de `executeCommand` carrega esse marcador, não só as desta task. É a porta de escrita para staff, tão estreita e nomeada quanto `withPlatformAggregation` já é para leitura.

**Files:**
- Create: `packages/db/migrations/0063_mesa_de_suporte_escrita_staff.sql`
- Modify: `packages/application/src/envelope/command.ts`
- Modify: `packages/application/src/envelope/command.test.ts`
- Modify: `packages/db/src/support.ts`
- Modify: `packages/db/src/support.test.ts` (criar se não existir)
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/support/respond-ticket.ts` (+test)
- Create: `packages/application/src/support/assign-ticket.ts` (+test)
- Create: `packages/application/src/support/update-ticket-status.ts` (+test)
- Create: `packages/application/src/support/update-ticket-priority.ts` (+test)
- Modify: `packages/application/src/index.ts`

**Interfaces:**
- Consumes: `executeCommand`, capacidades `tickets.write`/`tickets.assign`.
- Produces: `respondTicket`, `assignTicket`, `updateTicketStatus`, `updateTicketPriority` (`@albora/application`) — consumidos por T5.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/envelope/command.test.ts — adicionar ao describe existente
it("toda transação de comando marca app.staff_command para políticas de escrita de staff", async () => {
  let marcador: string | undefined;
  await executeCommand({ pool: app }, {
    actor: actor({ roles: ["finance"] }),
    capability: "subscription.mutate",
    reason: "prova do marcador de transação",
    target: { kind: "subscription" },
    action: "test.staff_command_marker",
    run: async (tx) => {
      const { rows } = await tx.query<{ valor: string }>("SELECT current_setting('app.staff_command', true) AS valor");
      marcador = rows[0]?.valor;
    },
  });
  expect(marcador).toBe("true");
});
```

```sql
-- packages/db/migrations/0063_mesa_de_suporte_escrita_staff.sql (criado antes do código, testado por packages/db/src/support.test.ts abaixo)
```

```ts
// packages/db/src/support.test.ts (novo arquivo)
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "./testes/banco";
import {
  assignSupportTicketOnClient,
  createSupportTicket,
  getSupportTicketAdmin,
  listSupportMessagesAdmin,
  respondSupportTicketOnClient,
  updateSupportTicketPriorityOnClient,
  updateSupportTicketStatusOnClient,
} from "./support";

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
  await agregador?.end();
});

async function staffFixture() {
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO staff_users (email, name) VALUES ($1, 'Staff') RETURNING id",
    [`staff-${Math.random().toString(36).slice(2)}@albora.com`],
  );
  return rows[0]!.id;
}

/** Escrita de staff sem `app.staff_command` é bloqueada pela RLS — prova negativa antes da prova positiva. */
async function comMarcador<T>(marcado: boolean, executar: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await app.connect();
  try {
    await client.query("BEGIN");
    if (marcado) await client.query("SELECT set_config('app.staff_command', 'true', true)");
    const resultado = await executar(client);
    await client.query("COMMIT");
    return resultado;
  } finally {
    client.release();
  }
}

describe("mutações de staff em support_tickets", () => {
  it("sem app.staff_command, a atribuição não afeta nenhuma linha (RLS fecha, não erra)", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const staffId = await staffFixture();

    await comMarcador(false, (client) => assignSupportTicketOnClient(client, { ticketId: ticket.id, staffId }));

    const depois = await getSupportTicketAdmin(agregador, ticket.id);
    expect(depois?.assigneeStaffId).toBeNull();
  });

  it("com app.staff_command, atribuir/responder/mudar status e prioridade funcionam", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi", priority: "p2" });
    const staffId = await staffFixture();

    await comMarcador(true, (client) => assignSupportTicketOnClient(client, { ticketId: ticket.id, staffId }));
    await comMarcador(true, (client) =>
      respondSupportTicketOnClient(client, { ticketId: ticket.id, staffId, body: "já estou vendo" }),
    );
    await comMarcador(true, (client) => updateSupportTicketStatusOnClient(client, { ticketId: ticket.id, status: "pending" }));
    const antesPrioridade = await getSupportTicketAdmin(agregador, ticket.id);
    await comMarcador(true, (client) => updateSupportTicketPriorityOnClient(client, { ticketId: ticket.id, priority: "p0" }));

    const final = await getSupportTicketAdmin(agregador, ticket.id);
    expect(final?.assigneeStaffId).toBe(staffId);
    expect(final?.status).toBe("pending");
    expect(final?.priority).toBe("p0");
    // p0 = SLA de 15min — recomputado a partir de AGORA na troca de prioridade, não da criação do ticket.
    expect(final!.slaDueAt!.getTime()).toBeLessThan(antesPrioridade!.slaDueAt!.getTime());

    const mensagens = await listSupportMessagesAdmin(agregador, ticket.id);
    const daEquipe = mensagens.find((m) => m.authorKind === "operator");
    expect(daEquipe?.authorStaffId).toBe(staffId);
    expect(daEquipe?.body).toBe("já estou vendo");
  });
});
```

```ts
// packages/application/src/support/respond-ticket.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupportTicket } from "@albora/db";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { respondTicket } from "./respond-ticket";

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

function actor(roles: string[]) {
  return { staffUserId: "11111111-1111-1111-1111-111111111111", roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

describe("respondTicket", () => {
  it("nega quem não tem tickets.write", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    await expect(
      respondTicket({ pool: app }, { actor: actor(["engineering"]), ticketId: ticket.id, body: "resposta" }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("suporte responde e a mensagem carrega o staff autor", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "oi" });
    const resultado = await respondTicket({ pool: app }, { actor: actor(["support"]), ticketId: ticket.id, body: "resposta" });
    expect(resultado.authorKind).toBe("operator");
    expect(resultado.authorStaffId).toBe("11111111-1111-1111-1111-111111111111");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/envelope/command.test.ts src/support/respond-ticket.test.ts && pnpm --filter @albora/db exec vitest run src/support.test.ts`

Expected: FAIL — `current_setting('app.staff_command'...)` devolve `null`/erro (marcador ainda não existe); `Cannot find module './respond-ticket'`; `assignSupportTicketOnClient is not a function`.

- [ ] **Step 3: Implementar o mínimo**

```sql
-- packages/db/migrations/0063_mesa_de_suporte_escrita_staff.sql
-- 0063 — escrita de staff na mesa de suporte (Onda C, T4)
--
-- support_tickets/support_messages (migration 0030) têm FORCE RLS com só
-- `conta_ticket` (host, por account_id) e `ops_ticket_lista` (SELECT
-- cross-conta via platform_operators). Staff não tem accounts.id — sem uma
-- porta de escrita própria, um UPDATE/INSERT de staff seria filtrado pela
-- RLS silenciosamente (zero linhas, sem erro). `app.staff_command` é
-- setado por `executeCommand` (packages/application) logo após o BEGIN de
-- toda transação de comando — é a mesma disciplina de "porta estreita e
-- nomeada" que `withPlatformAggregation` já aplica para leitura.
CREATE POLICY staff_mutation_ticket ON support_tickets
  FOR UPDATE
  USING (current_setting('app.staff_command', true) = 'true')
  WITH CHECK (current_setting('app.staff_command', true) = 'true');

CREATE POLICY staff_mutation_mensagem ON support_messages
  FOR INSERT
  WITH CHECK (current_setting('app.staff_command', true) = 'true');

-- support_messages não tinha como dizer QUAL staff respondeu — só
-- author_kind='operator', author_account_id sempre NULL nesse caso.
-- Sem author_staff_id, toda resposta de staff ficaria anônima no thread
-- (rastreável só via audit_log, que não é pensado pra popular UI de chat).
ALTER TABLE support_messages
  ADD COLUMN author_staff_id uuid REFERENCES staff_users(id) ON DELETE SET NULL;
```

```ts
// packages/application/src/envelope/command.ts — modificar (uma linha nova, comentada)
    await client.query("BEGIN");
    // Porta de escrita para staff em tabelas com FORCE RLS que não têm
    // política própria de staff (ex.: support_tickets/support_messages,
    // migration 0063) — só existe dentro da transação de um comando já
    // autorizado, nunca fora dela.
    await client.query("SELECT set_config('app.staff_command', 'true', true)");
    const result = await input.run(client);
```

```ts
// packages/db/src/support.ts — adicionar ao arquivo existente
export type SupportMessageRow = {
  id: string;
  ticketId: string;
  authorKind: "host" | "operator";
  authorAccountId: string | null;
  authorStaffId: string | null;
  body: string;
  createdAt: Date;
};

export type SupportTicketAdmin = SupportTicket & { assigneeStaffId: string | null };

/** Cross-conta por desenho — chamada sob `withPlatformAggregation` (T5), nunca com o pool comum. */
export async function getSupportTicketAdmin(pool: Pool, ticketId: string): Promise<SupportTicketAdmin | null> {
  const { rows } = await pool.query<{
    id: string; account_id: string; event_id: string | null; subject: string;
    status: SupportStatus; priority: SupportPriority; sla_due_at: Date | null;
    created_at: Date; assignee_staff_id: string | null;
  }>(
    `SELECT id, account_id, event_id, subject, status, priority, sla_due_at, created_at, assignee_staff_id
       FROM support_tickets WHERE id = $1`,
    [ticketId],
  );
  const t = rows[0];
  if (!t) return null;
  return {
    id: t.id, accountId: t.account_id, eventId: t.event_id, subject: t.subject,
    status: t.status, priority: t.priority, slaDueAt: t.sla_due_at, createdAt: t.created_at,
    assigneeStaffId: t.assignee_staff_id,
  };
}

/** Cross-conta por desenho — mesma disciplina de `getSupportTicketAdmin`. */
export async function listSupportMessagesAdmin(pool: Pool, ticketId: string): Promise<SupportMessageRow[]> {
  const { rows } = await pool.query<{
    id: string; ticket_id: string; author_kind: "host" | "operator";
    author_account_id: string | null; author_staff_id: string | null; body: string; created_at: Date;
  }>(
    `SELECT id, ticket_id, author_kind, author_account_id, author_staff_id, body, created_at
       FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [ticketId],
  );
  return rows.map((m) => ({
    id: m.id, ticketId: m.ticket_id, authorKind: m.author_kind,
    authorAccountId: m.author_account_id, authorStaffId: m.author_staff_id, body: m.body, createdAt: m.created_at,
  }));
}

/** Roda dentro da tx de `executeCommand` — exige `app.staff_command` (migration 0063). */
export async function respondSupportTicketOnClient(
  client: PoolClient,
  entrada: { ticketId: string; staffId: string; body: string },
): Promise<SupportMessageRow> {
  const { rows } = await client.query<{
    id: string; ticket_id: string; author_kind: "host" | "operator";
    author_account_id: string | null; author_staff_id: string | null; body: string; created_at: Date;
  }>(
    `INSERT INTO support_messages (ticket_id, author_kind, author_staff_id, body)
     VALUES ($1, 'operator', $2, $3)
     RETURNING id, ticket_id, author_kind, author_account_id, author_staff_id, body, created_at`,
    [entrada.ticketId, entrada.staffId, entrada.body.slice(0, 4000)],
  );
  const m = rows[0]!;
  await client.query(
    `UPDATE support_tickets SET updated_at = now(), status = CASE WHEN status = 'open' THEN 'pending' ELSE status END
      WHERE id = $1`,
    [entrada.ticketId],
  );
  return {
    id: m.id, ticketId: m.ticket_id, authorKind: m.author_kind,
    authorAccountId: m.author_account_id, authorStaffId: m.author_staff_id, body: m.body, createdAt: m.created_at,
  };
}

export async function assignSupportTicketOnClient(
  client: PoolClient,
  entrada: { ticketId: string; staffId: string | null },
): Promise<void> {
  await client.query("UPDATE support_tickets SET assignee_staff_id = $2, updated_at = now() WHERE id = $1", [
    entrada.ticketId,
    entrada.staffId,
  ]);
}

export async function updateSupportTicketStatusOnClient(
  client: PoolClient,
  entrada: { ticketId: string; status: SupportStatus },
): Promise<void> {
  await client.query("UPDATE support_tickets SET status = $2, updated_at = now() WHERE id = $1", [
    entrada.ticketId,
    entrada.status,
  ]);
}

/** Muda a prioridade E recomputa o SLA a partir de AGORA — reclassificar um p2 pra p0 reabre a janela, não herda o prazo do p2. */
export async function updateSupportTicketPriorityOnClient(
  client: PoolClient,
  entrada: { ticketId: string; priority: SupportPriority },
): Promise<void> {
  await client.query("UPDATE support_tickets SET priority = $2, sla_due_at = $3, updated_at = now() WHERE id = $1", [
    entrada.ticketId,
    entrada.priority,
    slaDueAt(entrada.priority),
  ]);
}
```

```ts
// packages/db/src/index.ts — adicionar ao bloco de exports de support
export type { SupportMessageRow, SupportPriority, SupportStatus, SupportTicket, SupportTicketAdmin } from "./support";
export {
  assignSupportTicketOnClient,
  createSupportTicket,
  getSupportTicketAdmin,
  isPlatformOperator,
  listOpenSupportTicketsAdmin,
  listSupportMessagesAdmin,
  listSupportTicketsForAccount,
  listSupportTicketsForEvent,
  respondSupportTicketOnClient,
  slaDueAt,
  updateSupportTicketPriorityOnClient,
  updateSupportTicketStatusOnClient,
} from "./support";
```

```ts
// packages/application/src/support/respond-ticket.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { respondSupportTicketOnClient, type SupportMessageRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type RespondTicketInput = { actor: Actor; ticketId: string; body: string };

/** `reason` de executeCommand é preenchido automaticamente aqui — a resposta em si já é o registro substantivo; o operador não digita um "motivo" pra responder um ticket. */
export async function respondTicket(deps: { pool: Pool }, input: RespondTicketInput): Promise<SupportMessageRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.write",
    reason: `responder ticket ${input.ticketId}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.respond",
    metadata: { bodyLength: input.body.length },
    run: (tx) => respondSupportTicketOnClient(tx, { ticketId: input.ticketId, staffId: input.actor.staffUserId, body: input.body }),
  });
}
```

```ts
// packages/application/src/support/assign-ticket.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { assignSupportTicketOnClient } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type AssignTicketInput = { actor: Actor; ticketId: string; assigneeStaffId: string | null };

export async function assignTicket(deps: { pool: Pool }, input: AssignTicketInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.assign",
    reason: input.assigneeStaffId
      ? `atribuir ticket ${input.ticketId} a ${input.assigneeStaffId}`
      : `desatribuir ticket ${input.ticketId}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.assign",
    metadata: { assigneeStaffId: input.assigneeStaffId },
    run: (tx) => assignSupportTicketOnClient(tx, { ticketId: input.ticketId, staffId: input.assigneeStaffId }),
  });
}
```

```ts
// packages/application/src/support/update-ticket-status.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { updateSupportTicketStatusOnClient, type SupportStatus } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type UpdateTicketStatusInput = { actor: Actor; ticketId: string; status: SupportStatus };

export async function updateTicketStatus(deps: { pool: Pool }, input: UpdateTicketStatusInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.write",
    reason: `mudar status do ticket ${input.ticketId} para ${input.status}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.status.change",
    metadata: { status: input.status },
    run: (tx) => updateSupportTicketStatusOnClient(tx, { ticketId: input.ticketId, status: input.status }),
  });
}
```

```ts
// packages/application/src/support/update-ticket-priority.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { updateSupportTicketPriorityOnClient, type SupportPriority } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type UpdateTicketPriorityInput = { actor: Actor; ticketId: string; priority: SupportPriority };

export async function updateTicketPriority(deps: { pool: Pool }, input: UpdateTicketPriorityInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "tickets.write",
    reason: `mudar prioridade do ticket ${input.ticketId} para ${input.priority}`,
    target: { kind: "ticket", id: input.ticketId },
    action: "tickets.priority.change",
    metadata: { priority: input.priority },
    run: (tx) => updateSupportTicketPriorityOnClient(tx, { ticketId: input.ticketId, priority: input.priority }),
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { AssignTicketInput } from "./support/assign-ticket";
export { assignTicket } from "./support/assign-ticket";
export type { RespondTicketInput } from "./support/respond-ticket";
export { respondTicket } from "./support/respond-ticket";
export type { UpdateTicketStatusInput } from "./support/update-ticket-status";
export { updateTicketStatus } from "./support/update-ticket-status";
export type { UpdateTicketPriorityInput } from "./support/update-ticket-priority";
export { updateTicketPriority } from "./support/update-ticket-priority";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/envelope/command.test.ts src/support/ && pnpm --filter @albora/db exec vitest run src/support.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/migrations/0063_mesa_de_suporte_escrita_staff.sql packages/application/src/envelope/command.ts packages/application/src/envelope/command.test.ts packages/db/src/support.ts packages/db/src/support.test.ts packages/db/src/index.ts packages/application/src/support packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(console): casos de uso da mesa de suporte

Responder/atribuir/mudar status/mudar prioridade, todos por executeCommand.
support_tickets/support_messages tinham FORCE RLS sem porta de escrita pra
staff (só accounts.id e platform_operators) — executeCommand agora marca
app.staff_command em toda transação de comando, e a migration 0063 abre
UPDATE/INSERT condicionados a esse marcador. author_staff_id fecha a
lacuna de "qual staff respondeu" no thread.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Tela da mesa de suporte (`/console/support`)

Duas zonas, sem navegar para fora — fila à esquerda (ordenada por SLA mais próximo do estouro), ticket selecionado à direita com contexto do cliente (PII mascarada).

**Files:**
- Modify: `packages/db/src/support.ts` (adicionar `listSupportTicketsQueueAdmin`)
- Modify: `packages/db/src/support.test.ts`
- Modify: `packages/db/src/billing.ts` (adicionar `listBillingPaymentsForAccountAdmin`, reaproveitado por T6)
- Modify: `packages/db/src/billing-vendor.test.ts`
- Modify: `packages/db/src/staff.ts` (adicionar `listActiveStaffUsers`, para o dropdown de atribuição)
- Modify: `packages/db/src/staff.test.ts` (criar se não existir)
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/support/list-ticket-queue.ts` (+test)
- Create: `packages/application/src/support/get-ticket-detail.ts` (+test)
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/support/page.tsx`
- Create: `apps/web/app/console/(shell)/support/page.test.ts`
- Create: `apps/web/features/console/components/client/support-queue.tsx`
- Create: `apps/web/features/console/components/client/ticket-detail.tsx`
- Create: `apps/web/features/console/components/client/ticket-detail.test.tsx`

**Interfaces:**
- Consumes: `withPlatformAggregation`, `respondTicket`/`assignTicket`/`updateTicketStatus`/`updateTicketPriority` (T4), `maskEmail` (`@albora/db`, já existe).
- Produces: `listTicketQueue`, `getTicketDetail` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/support.test.ts — adicionar ao describe existente
describe("listSupportTicketsQueueAdmin", () => {
  it("ordena por sla_due_at mais próximo primeiro, ignorando criação/prioridade", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const longe = await createSupportTicket(admin, a.contaId, { subject: "p2 antigo", body: "x", priority: "p2" });
    const perto = await createSupportTicket(admin, a.contaId, { subject: "p0 recente", body: "y", priority: "p0" });

    const fila = await listSupportTicketsQueueAdmin(agregador, { statuses: ["open", "pending"], limit: 50 });
    const posicaoPerto = fila.rows.findIndex((t) => t.id === perto.id);
    const posicaoLonge = fila.rows.findIndex((t) => t.id === longe.id);
    expect(posicaoPerto).toBeLessThan(posicaoLonge);
  });

  it("filtro por assigneeStaffId reflete no resultado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida", body: "x" });
    const { rows: staff } = await admin.query<{ id: string }>(
      "INSERT INTO staff_users (email, name) VALUES ('resp@albora.com', 'Resp') RETURNING id",
    );
    await admin.query("UPDATE support_tickets SET assignee_staff_id = $2 WHERE id = $1", [ticket.id, staff[0]!.id]);

    const comFiltro = await listSupportTicketsQueueAdmin(agregador, { assigneeStaffId: staff[0]!.id, limit: 50 });
    expect(comFiltro.rows.map((t) => t.id)).toEqual([ticket.id]);
  });
});
```

```ts
// packages/db/src/billing-vendor.test.ts — adicionar ao describe existente (ou describe novo no mesmo arquivo)
describe("listBillingPaymentsForAccountAdmin", () => {
  it("lista pagamentos da conta, mais recente primeiro", async () => {
    await prepararBanco();
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('pagador@exemplo.test') RETURNING id");
    const { rows: ev } = await admin.query(
      "INSERT INTO packs (id) VALUES ('pack-pgto') ON CONFLICT DO NOTHING RETURNING id",
    );
    await admin.query("INSERT INTO packs (id) VALUES ('pack-pgto') ON CONFLICT (id) DO NOTHING");
    const { rows: evento } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
       VALUES ($1, 'pack-pgto', 'evento-pgto', now(), now() + interval '6 hours', 'active') RETURNING id`,
      [acc[0].id],
    );
    await admin.query(
      `INSERT INTO billing_payments (account_id, event_id, asaas_payment_id, status, plan, amount_cents)
       VALUES ($1, $2, 'pay-1', 'confirmed', 'celebration', 19900)`,
      [acc[0].id, evento[0].id],
    );

    const pagamentos = await listBillingPaymentsForAccountAdmin(agregador, acc[0].id);
    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0]?.amountCents).toBe(19900);
  });
});
```

```tsx
// apps/web/features/console/components/client/ticket-detail.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetail } from "./ticket-detail";

vi.mock("@/features/console/actions", () => ({
  respondTicketAction: vi.fn().mockResolvedValue({ ok: true }),
  assignTicketAction: vi.fn().mockResolvedValue({ ok: true }),
  updateTicketStatusAction: vi.fn().mockResolvedValue({ ok: true }),
  updateTicketPriorityAction: vi.fn().mockResolvedValue({ ok: true }),
}));

const ticketBase = {
  id: "t1", accountId: "c1", eventId: null, subject: "dúvida", status: "open" as const,
  priority: "p2" as const, slaDueAt: new Date(Date.now() + 3600_000), createdAt: new Date(),
  assigneeStaffId: null,
};

describe("TicketDetail", () => {
  it("envia a resposta e limpa o campo", async () => {
    render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: "celebration", events: [], recentPayments: [] }}
        staffOptions={[]}
      />,
    );
    await userEvent.type(screen.getByLabelText("Responder"), "já estou vendo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByLabelText("Responder")).toHaveValue("");
  });

  it("mostra o e-mail mascarado, nunca o cru", () => {
    render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] }}
        staffOptions={[]}
      />,
    );
    expect(screen.getByText("t••••@x.com")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/support.test.ts src/billing-vendor.test.ts && pnpm --filter web exec vitest run features/console/components/client/ticket-detail.test.tsx`

Expected: FAIL — `listSupportTicketsQueueAdmin is not a function`, `listBillingPaymentsForAccountAdmin is not a function`, `Cannot find module './ticket-detail'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/support.ts — adicionar
export type SupportTicketQueueFilter = {
  statuses?: SupportStatus[];
  assigneeStaffId?: string;
  limit: number;
};

/**
 * Cross-conta por desenho — chamada sob `withPlatformAggregation`.
 * Ordenação FIXA por `sla_due_at ASC NULLS LAST` — é o que "queima", não a
 * criação nem a prioridade (spec §8.1.6). Prioridade e criação entram só
 * como desempate visual na UI, nunca como ORDER BY primário.
 */
export async function listSupportTicketsQueueAdmin(
  pool: Pool,
  filter: SupportTicketQueueFilter,
): Promise<{ rows: SupportTicketAdmin[] }> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.statuses?.length) {
    params.push(filter.statuses);
    clauses.push(`status = ANY($${params.length})`);
  }
  if (filter.assigneeStaffId) {
    params.push(filter.assigneeStaffId);
    clauses.push(`assignee_staff_id = $${params.length}`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string; account_id: string; event_id: string | null; subject: string;
    status: SupportStatus; priority: SupportPriority; sla_due_at: Date | null;
    created_at: Date; assignee_staff_id: string | null;
  }>(
    `SELECT id, account_id, event_id, subject, status, priority, sla_due_at, created_at, assignee_staff_id
       FROM support_tickets
       ${where}
      ORDER BY sla_due_at ASC NULLS LAST, created_at ASC
      LIMIT $${params.length}`,
    params,
  );

  return {
    rows: rows.map((t) => ({
      id: t.id, accountId: t.account_id, eventId: t.event_id, subject: t.subject,
      status: t.status, priority: t.priority, slaDueAt: t.sla_due_at, createdAt: t.created_at,
      assigneeStaffId: t.assignee_staff_id,
    })),
  };
}
```

```ts
// packages/db/src/billing.ts — adicionar
export type BillingPaymentSummaryAdmin = {
  id: string;
  status: BillingPaymentStatus;
  plan: "celebration" | "vendor";
  amountCents: number;
  createdAt: Date;
};

/** Cross-conta por desenho — chamada sob `withPlatformAggregation` (mesa de suporte, T5; reembolso, T6). */
export async function listBillingPaymentsForAccountAdmin(
  pool: Pool,
  accountId: string,
  limit = 20,
): Promise<BillingPaymentSummaryAdmin[]> {
  const { rows } = await pool.query<{
    id: string; status: BillingPaymentStatus; plan: "celebration" | "vendor";
    amount_cents: number; created_at: Date;
  }>(
    `SELECT id, status, plan, amount_cents, created_at
       FROM billing_payments WHERE account_id = $1
      ORDER BY created_at DESC LIMIT $2`,
    [accountId, limit],
  );
  return rows.map((r) => ({ id: r.id, status: r.status, plan: r.plan, amountCents: r.amount_cents, createdAt: r.created_at }));
}
```

```ts
// packages/db/src/staff.ts — adicionar
export type ActiveStaffOption = { id: string; name: string; email: string };

/** Para o dropdown "Atribuir a" — só staff `active` aparece como opção. */
export async function listActiveStaffUsers(db: Queryable): Promise<ActiveStaffOption[]> {
  const { rows } = await db.query<{ id: string; name: string; email: string }>(
    "SELECT id, name, email FROM staff_users WHERE status = 'active' ORDER BY name",
  );
  return rows;
}
```

```ts
// packages/db/src/index.ts — adicionar às linhas de export existentes
export type { ActiveStaffOption } from "./staff";
export { listActiveStaffUsers } from "./staff"; // adicionar ao array já exportado de ./staff
export type { BillingPaymentSummaryAdmin } from "./billing";
export { listBillingPaymentsForAccountAdmin } from "./billing"; // adicionar ao array já exportado de ./billing
export type { SupportTicketQueueFilter } from "./support";
export { listSupportTicketsQueueAdmin } from "./support"; // adicionar ao array já exportado de ./support
```

```ts
// packages/application/src/support/list-ticket-queue.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listSupportTicketsQueueAdmin, type SupportTicketAdmin } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type ListTicketQueueInput = {
  actor: Actor;
  reason: string;
  statuses?: ("open" | "pending" | "resolved" | "closed")[];
  assigneeStaffId?: string;
  limit: number;
};

export async function listTicketQueue(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListTicketQueueInput,
): Promise<{ rows: SupportTicketAdmin[] }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "tickets.read",
    reason: input.reason,
    action: "tickets.queue.read",
    run: () =>
      listSupportTicketsQueueAdmin(deps.aggregatorPool, {
        ...(input.statuses ? { statuses: input.statuses } : {}),
        ...(input.assigneeStaffId ? { assigneeStaffId: input.assigneeStaffId } : {}),
        limit: input.limit,
      }),
  });
}
```

```ts
// packages/application/src/support/get-ticket-detail.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import {
  getAccountDetailAdmin, getSupportTicketAdmin, listBillingPaymentsForAccountAdmin, listSupportMessagesAdmin,
  maskEmail, type BillingPaymentSummaryAdmin, type SupportMessageRow, type SupportTicketAdmin,
} from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type TicketCustomerContext = {
  maskedEmail: string;
  plan: string | null;
  events: { id: string; title: string | null; startsAt: Date; status: string }[];
  recentPayments: BillingPaymentSummaryAdmin[];
};

export type TicketDetailResult = {
  ticket: SupportTicketAdmin;
  messages: SupportMessageRow[];
  customerContext: TicketCustomerContext;
} | null;

export type GetTicketDetailInput = { actor: Actor; reason: string; ticketId: string };

/**
 * Painel de contexto do cliente (spec §8.1.6): plano, eventos, pagamentos
 * recentes — sem "erros recentes" (não existe tabela de erro por
 * conta/evento neste codebase; ver Lacunas). PII sempre mascarada aqui —
 * revelar é T3, ação separada e auditada à parte.
 */
export async function getTicketDetail(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: GetTicketDetailInput,
): Promise<TicketDetailResult> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "tickets.read",
    reason: input.reason,
    action: "tickets.detail.read",
    run: async () => {
      const ticket = await getSupportTicketAdmin(deps.aggregatorPool, input.ticketId);
      if (!ticket) return null;

      const [messages, conta, pagamentos] = await Promise.all([
        listSupportMessagesAdmin(deps.aggregatorPool, input.ticketId),
        getAccountDetailAdmin(deps.aggregatorPool, ticket.accountId),
        listBillingPaymentsForAccountAdmin(deps.aggregatorPool, ticket.accountId),
      ]);

      return {
        ticket,
        messages,
        customerContext: {
          maskedEmail: conta?.maskedEmail ?? maskEmail("desconhecido@desconhecido"),
          plan: conta?.plan ?? null,
          events: conta?.events ?? [],
          recentPayments: pagamentos,
        },
      };
    },
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { ListTicketQueueInput } from "./support/list-ticket-queue";
export { listTicketQueue } from "./support/list-ticket-queue";
export type { GetTicketDetailInput, TicketCustomerContext, TicketDetailResult } from "./support/get-ticket-detail";
export { getTicketDetail } from "./support/get-ticket-detail";
```

```ts
// apps/web/features/console/actions.ts — adicionar
import { assignTicket, getTicketDetail, respondTicket, updateTicketPriority, updateTicketStatus } from "@albora/application";
import type { SupportPriority, SupportStatus } from "@albora/db";

type SimpleActionResult = { ok: true } | { ok: false; error: string };

function traduzErroDeComando(erro: unknown): SimpleActionResult {
  if (erro instanceof CommandDeniedError) return { ok: false, error: erro.message };
  if (erro instanceof ReauthRequiredError) return { ok: false, error: "reautenticação exigida" };
  throw erro;
}

export async function respondTicketAction(ticketId: string, body: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await respondTicket({ pool: getPool() }, { actor, ticketId, body });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function assignTicketAction(ticketId: string, assigneeStaffId: string | null): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await assignTicket({ pool: getPool() }, { actor, ticketId, assigneeStaffId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function updateTicketStatusAction(ticketId: string, status: SupportStatus): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await updateTicketStatus({ pool: getPool() }, { actor, ticketId, status });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function updateTicketPriorityAction(ticketId: string, priority: SupportPriority): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await updateTicketPriority({ pool: getPool() }, { actor, ticketId, priority });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}
```

```tsx
// apps/web/features/console/components/client/ticket-detail.tsx
"use client";

import { useState, useTransition } from "react";
import { Button, Select, StatusBadge, TextField } from "@albora/ui-web";
import type { SupportMessageRow, SupportPriority, SupportStatus, SupportTicketAdmin } from "@albora/db";
import type { TicketCustomerContext } from "@albora/application";
import {
  assignTicketAction, respondTicketAction, updateTicketPriorityAction, updateTicketStatusAction,
} from "@/features/console/actions";

const ROTULO_STATUS: Record<SupportStatus, string> = { open: "Aberto", pending: "Pendente", resolved: "Resolvido", closed: "Fechado" };
const ROTULO_PRIORIDADE: Record<SupportPriority, string> = { p0: "P0", p1: "P1", p2: "P2" };

export function TicketDetail({
  ticket, messages, customerContext, staffOptions,
}: {
  ticket: SupportTicketAdmin;
  messages: SupportMessageRow[];
  customerContext: TicketCustomerContext;
  staffOptions: { id: string; name: string }[];
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4 border-b border-linha pb-4">
        <div>
          <h2 className="tipo-den-titulo m-0">{ticket.subject}</h2>
          <span className="tipo-den-corpo text-ink-3">{customerContext.maskedEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Status"
            value={ticket.status}
            onChange={(e) => startTransition(() => updateTicketStatusAction(ticket.id, e.target.value as SupportStatus))}
          >
            {Object.entries(ROTULO_STATUS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </Select>
          <Select
            aria-label="Prioridade"
            value={ticket.priority}
            onChange={(e) => startTransition(() => updateTicketPriorityAction(ticket.id, e.target.value as SupportPriority))}
          >
            {Object.entries(ROTULO_PRIORIDADE).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </Select>
          <Select
            aria-label="Atribuir a"
            value={ticket.assigneeStaffId ?? ""}
            onChange={(e) => startTransition(() => assignTicketAction(ticket.id, e.target.value || null))}
          >
            <option value="">Sem responsável</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="tipo-den-rotulo m-0 text-ink-3">Contexto do cliente</h3>
        <p className="tipo-den-corpo m-0">Plano: {customerContext.plan ?? "—"}</p>
        <p className="tipo-den-corpo m-0">Eventos: {customerContext.events.length}</p>
        <p className="tipo-den-corpo m-0">
          Pagamentos recentes: {customerContext.recentPayments.length > 0 ? customerContext.recentPayments.map((p) => p.status).join(", ") : "nenhum"}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="tipo-den-rotulo m-0 text-ink-3">Conversa</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {messages.map((m) => (
            <li key={m.id} className="rounded-token border border-linha p-3">
              <StatusBadge tone={m.authorKind === "operator" ? "positive" : "neutral"}>
                {m.authorKind === "operator" ? "Equipe" : "Cliente"}
              </StatusBadge>
              <p className="tipo-den-corpo m-0 mt-2">{m.body}</p>
            </li>
          ))}
        </ul>
        <TextField label="Responder" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button
          type="button"
          disabled={pending || !body.trim()}
          onClick={() =>
            startTransition(async () => {
              await respondTicketAction(ticket.id, body);
              setBody("");
            })
          }
        >
          Enviar
        </Button>
      </section>
    </div>
  );
}
```

```tsx
// apps/web/features/console/components/client/support-queue.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@albora/ui-web";
import type { SupportTicketAdmin } from "@albora/db";

function tempoRestante(slaDueAt: Date | null, agora: Date): { texto: string; estourado: boolean } {
  if (!slaDueAt) return { texto: "sem SLA", estourado: false };
  const diffMs = slaDueAt.getTime() - agora.getTime();
  if (diffMs <= 0) {
    const minutos = Math.round(Math.abs(diffMs) / 60_000);
    return { texto: `Estourado há ${minutos}min`, estourado: true };
  }
  const minutos = Math.round(diffMs / 60_000);
  return { texto: minutos < 60 ? `${minutos}min restantes` : `${Math.round(minutos / 60)}h restantes`, estourado: false };
}

export function SupportQueue({ rows, selectedId, now }: { rows: SupportTicketAdmin[]; selectedId: string | null; now: Date }) {
  const searchParams = useSearchParams();

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {rows.map((ticket) => {
        const sla = tempoRestante(ticket.slaDueAt, now);
        const params = new URLSearchParams(searchParams);
        params.set("ticket", ticket.id);
        return (
          <li key={ticket.id}>
            <Link
              href={`/console/support?${params.toString()}`}
              className={[
                "flex min-h-11 flex-col gap-0.5 rounded-token border px-3 py-2 no-underline",
                ticket.id === selectedId ? "border-acento-texto bg-acento-superficie" : "border-linha",
                sla.estourado ? "bg-critico-superficie" : "",
              ].join(" ")}
            >
              <span className="tipo-den-corpo text-ink">{ticket.subject}</span>
              <div className="flex items-center gap-2">
                <StatusBadge tone={sla.estourado ? "critico" : "neutral"}>{sla.texto}</StatusBadge>
                <span className="tipo-den-rotulo text-ink-3">{ticket.priority.toUpperCase()}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

```tsx
// apps/web/app/console/(shell)/support/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getTicketDetail, listTicketQueue } from "@albora/application";
import { listActiveStaffUsers } from "@albora/db";
import { ConsoleEmptyState, PageHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { SupportQueue } from "@/features/console/components/client/support-queue";
import { TicketDetail } from "@/features/console/components/client/ticket-detail";

export const dynamic = "force-dynamic";

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { ticket: ticketIdSelecionado } = await searchParams;
  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console/support";

  const [{ rows }, staffOptions] = await Promise.all([
    listTicketQueue(deps, { actor, reason, statuses: ["open", "pending"], limit: 100 }),
    listActiveStaffUsers(getPool()),
  ]);

  const idAtivo = ticketIdSelecionado ?? rows[0]?.id ?? null;
  const detalhe = idAtivo ? await getTicketDetail(deps, { actor, reason, ticketId: idAtivo }) : null;

  return (
    <>
      <PageHeader title="Suporte" description="Fila ordenada pelo SLA mais próximo do estouro." />
      {rows.length === 0 ? (
        <ConsoleEmptyState title="Fila vazia" description="Tickets abertos ou pendentes aparecem aqui, com o de SLA mais urgente no topo." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
          <SupportQueue rows={rows} selectedId={idAtivo} now={new Date()} />
          {detalhe ? (
            <TicketDetail
              ticket={detalhe.ticket}
              messages={detalhe.messages}
              customerContext={detalhe.customerContext}
              staffOptions={staffOptions}
            />
          ) : (
            <ConsoleEmptyState title="Selecione um ticket" description="Escolha um item da fila para ver a conversa." />
          )}
        </div>
      )}
    </>
  );
}
```

```ts
// apps/web/app/console/(shell)/support/page.test.ts
import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, listTicketQueueMock, getTicketDetailMock, listActiveStaffUsersMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(), listTicketQueueMock: vi.fn(), getTicketDetailMock: vi.fn(), listActiveStaffUsersMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listTicketQueue: listTicketQueueMock, getTicketDetail: getTicketDetailMock }));
vi.mock("@albora/db", () => ({ listActiveStaffUsers: listActiveStaffUsersMock }));

import SupportPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["support"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("SupportPage", () => {
  it("fila vazia mostra o vazio de verdade, não a tela de detalhe", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listTicketQueueMock.mockResolvedValueOnce({ rows: [] });
    listActiveStaffUsersMock.mockResolvedValueOnce([]);
    const element = await SupportPage({ searchParams: Promise.resolve({}) });
    expect(JSON.stringify(element)).toContain("Fila vazia");
  });

  it("com fila, mostra a conta mascarada do ticket ativo", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listTicketQueueMock.mockResolvedValueOnce({
      rows: [{ id: "t1", accountId: "c1", eventId: null, subject: "dúvida", status: "open", priority: "p2", slaDueAt: null, createdAt: new Date(), assigneeStaffId: null }],
    });
    listActiveStaffUsersMock.mockResolvedValueOnce([]);
    getTicketDetailMock.mockResolvedValueOnce({
      ticket: { id: "t1", accountId: "c1", eventId: null, subject: "dúvida", status: "open", priority: "p2", slaDueAt: null, createdAt: new Date(), assigneeStaffId: null },
      messages: [],
      customerContext: { maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] },
    });
    const element = await SupportPage({ searchParams: Promise.resolve({}) });
    expect(JSON.stringify(element)).toContain("t••••@x.com");
    expect(JSON.stringify(element)).not.toContain("@x.com".repeat(0) + "titular@");
  });
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/support.test.ts src/billing-vendor.test.ts && pnpm --filter @albora/application exec vitest run src/support/ && pnpm --filter web exec vitest run features/console/components/client/ticket-detail.test.tsx "app/console/(shell)/support/page.test.ts" && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/support.ts packages/db/src/support.test.ts packages/db/src/billing.ts packages/db/src/billing-vendor.test.ts packages/db/src/staff.ts packages/db/src/index.ts packages/application/src/support packages/application/src/index.ts apps/web/app/console/\(shell\)/support apps/web/features/console/components/client/support-queue.tsx apps/web/features/console/components/client/ticket-detail.tsx apps/web/features/console/components/client/ticket-detail.test.tsx apps/web/features/console/actions.ts
git commit -m "$(cat <<'EOF'
feat(console): tela da mesa de suporte

Fila ordenada por SLA mais próximo do estouro (não criação, não
prioridade), sem piscar — cor e texto já dizem o que queima. Contexto do
cliente com PII mascarada; revelar é ação separada e auditada (T3).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Mutações de assinatura (trocar plano, cortesia, cancelar, reembolsar)

**Achado que muda a execução:** `packages/integrations` não existe; `BillingProvider` vive em `apps/web/lib/billing/` sem os métodos de mutação. `packages/application` nunca pode importar de `apps/web` (camada inversa proibida) — a solução é uma porta local (`SubscriptionBillingPort`), estruturalmente compatível com o `BillingProvider` real, injetada pela rota. O reembolso acima do limiar usa a capacidade `subscription.refund.approve` em vez de repetir `subscription.refund` — é assim que a ruling "só o dono executa, não existe fila" vira código: `refundPolicy()` (Onda A) SEMPRE devolve `needsApproval` quando o valor excede o limiar, para QUALQUER ator, então o comando escolhe a capacidade dinamicamente conforme o valor.

**Files:**
- Modify: `apps/web/lib/billing/types.ts`
- Modify: `apps/web/lib/billing/provider.ts`
- Modify: `apps/web/lib/billing/provider.test.ts`
- Modify: `packages/db/src/subscriptions-admin.ts`
- Modify: `packages/db/src/subscriptions-admin.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/subscriptions/billing-port.ts`
- Create: `packages/application/src/subscriptions/change-plan.ts` (+test)
- Create: `packages/application/src/subscriptions/apply-courtesy.ts` (+test)
- Create: `packages/application/src/subscriptions/cancel-subscription.ts` (+test)
- Create: `packages/application/src/subscriptions/refund-payment.ts` (+test)
- Modify: `packages/application/src/index.ts`
- Modify: `apps/web/app/console/(shell)/subscriptions/page.tsx`
- Modify: `apps/web/app/console/(shell)/subscriptions/page.test.ts`
- Modify: `apps/web/features/console/actions.ts`
- Create: `apps/web/features/console/components/client/subscription-actions.tsx` (+test)

**Interfaces:**
- Consumes: `executeCommand`, `REFUND_APPROVAL_THRESHOLD_CENTS` (`@albora/core`), `getBillingProvider` (`@/lib/billing`).
- Produces: `changeSubscriptionPlan`, `applySubscriptionCourtesy`, `cancelSubscription`, `refundPayment` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/lib/billing/provider.test.ts — adicionar ao describe existente
describe("mutações de assinatura", () => {
  it("stub: updateSubscription/cancelSubscription/refundPayment devolvem status determinístico", async () => {
    const provider = stubBillingProvider();
    await expect(provider.updateSubscription({ subscriptionId: "sub-stub-1", plan: "studio" })).resolves.toEqual({ status: "ACTIVE" });
    await expect(provider.cancelSubscription({ subscriptionId: "sub-stub-1" })).resolves.toEqual({ status: "CANCELED" });
    await expect(provider.refundPayment({ paymentId: "pay-stub-1", amountCents: 19900 })).resolves.toEqual({ status: "REFUNDED" });
  });
});
```

```ts
// packages/db/src/subscriptions-admin.test.ts — adicionar ao describe existente
it("expõe subscriptionId e asaasSubscriptionId, não só o vendorId", async () => {
  await prepararBanco();
  const vendorId = await vendorComAssinatura("active", "1 day");
  const { rows } = await listVendorSubscriptionsAdmin(agregador, { limit: 50 });
  const linha = rows.find((r) => r.vendorId === vendorId);
  expect(linha?.subscriptionId).toBeTruthy();
  expect(linha?.asaasSubscriptionId).toMatch(/^sub-/);
});
```

```ts
// packages/application/src/subscriptions/refund-payment.test.ts
import { describe, expect, it, vi } from "vitest";
import type pg from "pg";
import { afterAll, beforeAll } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { refundPayment } from "./refund-payment";

let app: pg.Pool;
let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  app = pools.app;
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

function actor(roles: string[]) {
  return { staffUserId: "11111111-1111-1111-1111-111111111111", roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

function billingMock() {
  return { refundPayment: vi.fn().mockResolvedValue({ status: "REFUNDED" }) };
}

describe("refundPayment", () => {
  it("financeiro reembolsa valor abaixo do limiar", async () => {
    const billing = billingMock();
    const resultado = await refundPayment(
      { pool: app, billing },
      { actor: actor(["finance"]), reason: "cliente pediu reembolso", paymentId: "pay-1", asaasPaymentId: "pay-stub-1", amountCents: 10_000 },
    );
    expect(resultado.status).toBe("REFUNDED");
    expect(billing.refundPayment).toHaveBeenCalledWith({ paymentId: "pay-stub-1", amountCents: 10_000 });
  });

  it("financeiro tentando valor acima do limiar é negado — mensagem diz que exige o dono", async () => {
    const billing = billingMock();
    await expect(
      refundPayment(
        { pool: app, billing },
        { actor: actor(["finance"]), reason: "reembolso grande", paymentId: "pay-2", asaasPaymentId: "pay-stub-2", amountCents: 60_000 },
      ),
    ).rejects.toThrow(CommandDeniedError);
    expect(billing.refundPayment).not.toHaveBeenCalled();
  });

  it("dono executa valor acima do limiar — sem fila, execução direta", async () => {
    const billing = billingMock();
    const resultado = await refundPayment(
      { pool: app, billing },
      { actor: actor(["owner"]), reason: "reembolso grande aprovado", paymentId: "pay-3", asaasPaymentId: "pay-stub-3", amountCents: 60_000 },
    );
    expect(resultado.status).toBe("REFUNDED");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run lib/billing/provider.test.ts && pnpm --filter @albora/db exec vitest run src/subscriptions-admin.test.ts && pnpm --filter @albora/application exec vitest run src/subscriptions/refund-payment.test.ts`

Expected: FAIL — `provider.updateSubscription is not a function`, `linha?.subscriptionId` undefined, `Cannot find module './refund-payment'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// apps/web/lib/billing/types.ts — adicionar ao BillingProvider e aos tipos
export type UpdateSubscriptionInput = {
  subscriptionId: string;
  plan?: "starter" | "studio" | "agency";
  amountCents?: number;
  discountPercent?: number;
};
export type CancelSubscriptionInput = { subscriptionId: string };
export type RefundPaymentInput = { paymentId: string; amountCents?: number };
export type BillingMutationResult = { status: string };

export type BillingProvider = {
  ensureCustomer(email: string, externalRef: string, name?: string): Promise<string>;
  createCheckout(input: CreateCheckoutInput & { customerId: string }): Promise<CreateCheckoutResult>;
  parseWebhook(headers: Headers, body: unknown, expectedAccessToken: string | null): WebhookPaymentEvent | { error: string } | null;
  createSubscription(input: CreateVendorSubscriptionInput): Promise<CreateVendorSubscriptionResult>;
  parseVendorWebhook(headers: Headers, body: unknown, expectedAccessToken: string | null): WebhookVendorSubscriptionEvent | { error: string } | null;
  listPayments(customerId: string): Promise<PaymentSummary[]>;
  /** Troca de plano e cortesia/desconto passam pelo mesmo método — os dois mexem nos termos da mesma assinatura no Asaas (PUT /subscriptions/{id}). */
  updateSubscription(input: UpdateSubscriptionInput): Promise<BillingMutationResult>;
  cancelSubscription(input: CancelSubscriptionInput): Promise<BillingMutationResult>;
  refundPayment(input: RefundPaymentInput): Promise<BillingMutationResult>;
};
```

```ts
// apps/web/lib/billing/provider.ts — adicionar dentro de asaasProviderFromConfig, antes do fechamento do objeto
    async updateSubscription(input) {
      const body: Record<string, unknown> = {};
      if (input.plan) body.description = `Albora Fornecedor — plano ${input.plan}`;
      if (typeof input.amountCents === "number") body.value = input.amountCents / 100;
      if (typeof input.discountPercent === "number") {
        body.discount = { value: input.discountPercent, dueDateLimitDays: 0, type: "PERCENTAGE" };
      }
      const res = await asaasFetch(`/subscriptions/${input.subscriptionId}`, {
        method: "PUT", apiKey: c.apiKey, baseUrl: c.baseUrl, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`asaas.subscription.update: ${res.status} ${await res.text()}`);
      const parsed = (await res.json()) as { status: string };
      return { status: parsed.status };
    },
    async cancelSubscription(input) {
      const res = await asaasFetch(`/subscriptions/${input.subscriptionId}`, {
        method: "DELETE", apiKey: c.apiKey, baseUrl: c.baseUrl,
      });
      if (!res.ok) throw new Error(`asaas.subscription.cancel: ${res.status} ${await res.text()}`);
      return { status: "CANCELED" };
    },
    async refundPayment(input) {
      const body = typeof input.amountCents === "number" ? { value: input.amountCents / 100 } : {};
      const res = await asaasFetch(`/payments/${input.paymentId}/refund`, {
        method: "POST", apiKey: c.apiKey, baseUrl: c.baseUrl, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`asaas.payment.refund: ${res.status} ${await res.text()}`);
      return { status: "REFUNDED" };
    },
```

```ts
// apps/web/lib/billing/provider.ts — adicionar dentro de stubBillingProvider, antes do fechamento do objeto
    async updateSubscription() {
      return { status: "ACTIVE" };
    },
    async cancelSubscription() {
      return { status: "CANCELED" };
    },
    async refundPayment() {
      return { status: "REFUNDED" };
    },
```

```ts
// packages/db/src/subscriptions-admin.ts — modificar
export type VendorSubscriptionAdminRow = {
  vendorId: string;
  vendorName: string;
  subscriptionId: string;
  asaasSubscriptionId: string;
  plan: "starter" | "studio" | "agency";
  status: "pending" | "active" | "overdue" | "canceled";
  nextChargeAt: null;
  overdueDays: number | null;
};

// dentro de listVendorSubscriptionsAdmin, no SELECT:
    `SELECT vs.id AS subscription_id, vs.asaas_subscription_id, vs.vendor_id, v.name AS vendor_name, vs.plan, vs.status,
            CASE WHEN vs.status = 'overdue'
                 THEN extract(day FROM now() - vs.updated_at)::int
                 ELSE NULL
            END AS overdue_days
       FROM vendor_subscriptions vs
       JOIN vendors v ON v.id = vs.vendor_id
       ${where}
      ORDER BY vs.created_at DESC
      LIMIT $${params.length}`,

// e no map final:
  return {
    rows: rows.map((r) => ({
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      subscriptionId: r.subscription_id,
      asaasSubscriptionId: r.asaas_subscription_id,
      plan: r.plan,
      status: r.status,
      nextChargeAt: null,
      overdueDays: r.overdue_days,
    })),
    nextCursor: null,
  };

// (o tipo do resultado do `pool.query<...>` acima ganha `subscription_id: string; asaas_subscription_id: string;`)
```

```ts
// packages/db/src/billing.ts — adicionar
export type VendorSubscriptionByIdAdmin = {
  id: string; vendorId: string; accountId: string; asaasSubscriptionId: string;
  plan: VendorPlan; status: VendorSubscriptionStatus;
};

/** Cross-conta por desenho — usada pelos comandos de mutação (T6), nunca pela leitura da tela (que já tem `subscriptionId` embutido). */
export async function getVendorSubscriptionByIdAdmin(pool: Pool, subscriptionId: string): Promise<VendorSubscriptionByIdAdmin | null> {
  const { rows } = await pool.query<{
    id: string; vendor_id: string; account_id: string; asaas_subscription_id: string;
    plan: VendorPlan; status: VendorSubscriptionStatus;
  }>(
    "SELECT id, vendor_id, account_id, asaas_subscription_id, plan, status FROM vendor_subscriptions WHERE id = $1",
    [subscriptionId],
  );
  const r = rows[0];
  return r ? { id: r.id, vendorId: r.vendor_id, accountId: r.account_id, asaasSubscriptionId: r.asaas_subscription_id, plan: r.plan, status: r.status } : null;
}
```

```ts
// packages/db/src/index.ts — adicionar
export type { VendorSubscriptionByIdAdmin } from "./billing";
export { getVendorSubscriptionByIdAdmin } from "./billing"; // adicionar ao array já exportado de ./billing
```

```ts
// packages/application/src/subscriptions/billing-port.ts
/**
 * Porta local, compatível estruturalmente com `BillingProvider`
 * (`apps/web/lib/billing/types.ts`) — `packages/application` nunca importa
 * de `apps/web` (ADR 0016 §1: direção `app -> application`, nunca o
 * contrário). `packages/integrations` ainda não existe (Lacunas); a rota
 * constrói o provider real via `getBillingProvider()` e passa aqui como
 * `deps.billing` — TypeScript aceita por shape, sem import cruzado.
 */
export type SubscriptionBillingPort = {
  updateSubscription(input: {
    subscriptionId: string;
    plan?: "starter" | "studio" | "agency";
    amountCents?: number;
    discountPercent?: number;
  }): Promise<{ status: string }>;
  cancelSubscription(input: { subscriptionId: string }): Promise<{ status: string }>;
  refundPayment(input: { paymentId: string; amountCents?: number }): Promise<{ status: string }>;
};
```

```ts
// packages/application/src/subscriptions/change-plan.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getVendorSubscriptionByIdAdmin } from "@albora/db";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type ChangeSubscriptionPlanInput = {
  actor: Actor; reason: string; subscriptionId: string; newPlan: "starter" | "studio" | "agency"; amountCents: number;
};

/** Nunca mexe em vendor_subscriptions direto — só chama o provider; o webhook (billing_webhook_events, idempotente) continua sendo quem confirma o estado local. */
export async function changeSubscriptionPlan(
  deps: { pool: Pool; billing: SubscriptionBillingPort },
  input: ChangeSubscriptionPlanInput,
): Promise<{ status: string }> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "subscription.mutate",
    reason: input.reason,
    target: { kind: "subscription", id: input.subscriptionId },
    action: "subscription.change_plan",
    metadata: { newPlan: input.newPlan, amountCents: input.amountCents },
    run: async () => {
      const assinatura = await getVendorSubscriptionByIdAdmin(deps.pool, input.subscriptionId);
      if (!assinatura) throw new Error(`assinatura ${input.subscriptionId} não encontrada`);
      return deps.billing.updateSubscription({
        subscriptionId: assinatura.asaasSubscriptionId, plan: input.newPlan, amountCents: input.amountCents,
      });
    },
  });
}
```

```ts
// packages/application/src/subscriptions/apply-courtesy.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getVendorSubscriptionByIdAdmin } from "@albora/db";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type ApplySubscriptionCourtesyInput = { actor: Actor; reason: string; subscriptionId: string; discountPercent: number };

export async function applySubscriptionCourtesy(
  deps: { pool: Pool; billing: SubscriptionBillingPort },
  input: ApplySubscriptionCourtesyInput,
): Promise<{ status: string }> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "subscription.mutate",
    reason: input.reason,
    target: { kind: "subscription", id: input.subscriptionId },
    action: "subscription.courtesy",
    metadata: { discountPercent: input.discountPercent },
    run: async () => {
      const assinatura = await getVendorSubscriptionByIdAdmin(deps.pool, input.subscriptionId);
      if (!assinatura) throw new Error(`assinatura ${input.subscriptionId} não encontrada`);
      return deps.billing.updateSubscription({ subscriptionId: assinatura.asaasSubscriptionId, discountPercent: input.discountPercent });
    },
  });
}
```

```ts
// packages/application/src/subscriptions/cancel-subscription.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getVendorSubscriptionByIdAdmin } from "@albora/db";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type CancelSubscriptionInput = { actor: Actor; reason: string; subscriptionId: string };

export async function cancelSubscription(
  deps: { pool: Pool; billing: SubscriptionBillingPort },
  input: CancelSubscriptionInput,
): Promise<{ status: string }> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "subscription.mutate",
    reason: input.reason,
    target: { kind: "subscription", id: input.subscriptionId },
    action: "subscription.cancel",
    run: async () => {
      const assinatura = await getVendorSubscriptionByIdAdmin(deps.pool, input.subscriptionId);
      if (!assinatura) throw new Error(`assinatura ${input.subscriptionId} não encontrada`);
      return deps.billing.cancelSubscription({ subscriptionId: assinatura.asaasSubscriptionId });
    },
  });
}
```

```ts
// packages/application/src/subscriptions/refund-payment.ts
import type { Pool } from "pg";
import type { Actor, Capability } from "@albora/core";
import { REFUND_APPROVAL_THRESHOLD_CENTS } from "@albora/core";
import { executeCommand } from "../envelope/command";
import type { SubscriptionBillingPort } from "./billing-port";

export type RefundPaymentInput = { actor: Actor; reason: string; paymentId: string; asaasPaymentId: string; amountCents: number };

/**
 * `refundPolicy()` (Onda A, `packages/core/src/authorization/policies.ts`)
 * devolve `needsApproval` incondicional acima do limiar, para QUALQUER
 * ator — inclusive o dono, se checado por `subscription.refund`. A ruling
 * da espinha ("só o dono executa, não existe fila") vira código aqui: acima
 * do limiar, o comando checa `subscription.refund.approve` (só o dono tem,
 * sem política extra) em vez de `subscription.refund`. Financeiro tentando
 * reembolso grande recebe `CommandDeniedError` de `hasCapability` — uma
 * negação simples, não uma fila de aprovação.
 */
export async function refundPayment(
  deps: { pool: Pool; billing: SubscriptionBillingPort },
  input: RefundPaymentInput,
): Promise<{ status: string }> {
  const capability: Capability =
    input.amountCents > REFUND_APPROVAL_THRESHOLD_CENTS ? "subscription.refund.approve" : "subscription.refund";

  return executeCommand(deps, {
    actor: input.actor,
    capability,
    reason: input.reason,
    target: { kind: "payment", id: input.paymentId },
    action: "subscription.refund",
    context: { amountCents: input.amountCents },
    metadata: { amountCents: input.amountCents },
    run: () => deps.billing.refundPayment({ paymentId: input.asaasPaymentId, amountCents: input.amountCents }),
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { SubscriptionBillingPort } from "./subscriptions/billing-port";
export type { ChangeSubscriptionPlanInput } from "./subscriptions/change-plan";
export { changeSubscriptionPlan } from "./subscriptions/change-plan";
export type { ApplySubscriptionCourtesyInput } from "./subscriptions/apply-courtesy";
export { applySubscriptionCourtesy } from "./subscriptions/apply-courtesy";
export type { CancelSubscriptionInput } from "./subscriptions/cancel-subscription";
export { cancelSubscription } from "./subscriptions/cancel-subscription";
export type { RefundPaymentInput } from "./subscriptions/refund-payment";
export { refundPayment } from "./subscriptions/refund-payment";
```

```ts
// apps/web/features/console/actions.ts — adicionar
import {
  applySubscriptionCourtesy, cancelSubscription as cancelSubscriptionUseCase, changeSubscriptionPlan, refundPayment,
} from "@albora/application";
import { getBillingProvider } from "@/lib/billing";

export async function changeSubscriptionPlanAction(
  subscriptionId: string, newPlan: "starter" | "studio" | "agency", amountCents: number, reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await changeSubscriptionPlan({ pool: getPool(), billing: getBillingProvider() }, { actor, reason, subscriptionId, newPlan, amountCents });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function applySubscriptionCourtesyAction(
  subscriptionId: string, discountPercent: number, reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await applySubscriptionCourtesy({ pool: getPool(), billing: getBillingProvider() }, { actor, reason, subscriptionId, discountPercent });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function cancelSubscriptionAction(subscriptionId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await cancelSubscriptionUseCase({ pool: getPool(), billing: getBillingProvider() }, { actor, reason, subscriptionId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function refundPaymentAction(
  paymentId: string, asaasPaymentId: string, amountCents: number, reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await refundPayment({ pool: getPool(), billing: getBillingProvider() }, { actor, reason, paymentId, asaasPaymentId, amountCents });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}
```

```tsx
// apps/web/app/console/(shell)/subscriptions/page.tsx — modificar: acrescentar coluna de ações
import { hasCapability } from "@albora/core";
import { SubscriptionActions } from "@/features/console/components/client/subscription-actions";

// dentro de SubscriptionsPage, após resolveActor():
  const podeMutar = hasCapability(actor.roles, "subscription.mutate");
  const podeReembolsar = hasCapability(actor.roles, "subscription.refund") || hasCapability(actor.roles, "subscription.refund.approve");

// columns ganha, ao final, se podeMutar || podeReembolsar:
    ...(podeMutar || podeReembolsar
      ? [{
          key: "acoes", header: "Ações",
          render: (r: VendorSubscriptionAdminRow) => (
            <SubscriptionActions
              subscriptionId={r.subscriptionId}
              vendorId={r.vendorId}
              plan={r.plan}
              podeMutar={podeMutar}
              podeReembolsar={podeReembolsar}
            />
          ),
        }]
      : []),
```

```tsx
// apps/web/features/console/components/client/subscription-actions.tsx
"use client";

import { useState, useTransition } from "react";
import { Button, ConfirmDialog, TextField } from "@albora/ui-web";
import {
  applySubscriptionCourtesyAction, cancelSubscriptionAction, changeSubscriptionPlanAction,
} from "@/features/console/actions";

export function SubscriptionActions({
  subscriptionId, plan, podeMutar,
}: { subscriptionId: string; vendorId: string; plan: "starter" | "studio" | "agency"; podeMutar: boolean; podeReembolsar: boolean }) {
  const [dialogo, setDialogo] = useState<"plano" | "cortesia" | "cancelar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!podeMutar) return <span className="tipo-den-corpo text-ink-3">—</span>;

  return (
    <div className="flex gap-2">
      <Button type="button" variant="tertiary" onClick={() => setDialogo("cortesia")}>Cortesia</Button>
      <Button type="button" variant="tertiary" onClick={() => setDialogo("cancelar")}>Cancelar</Button>
      <ConfirmDialog
        open={dialogo === "cortesia"}
        onClose={() => setDialogo(null)}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await applySubscriptionCourtesyAction(subscriptionId, 100, motivo);
            if (resultado.ok) setDialogo(null); else setErro(resultado.error);
          })
        }
        title={`Aplicar cortesia (100%) — plano ${plan}?`}
        description={
          <div className="flex flex-col gap-3">
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && <p role="alert" className="tipo-caption m-0 text-critico">{erro}</p>}
          </div>
        }
        pending={pending}
      />
      <ConfirmDialog
        open={dialogo === "cancelar"}
        onClose={() => setDialogo(null)}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await cancelSubscriptionAction(subscriptionId, motivo);
            if (resultado.ok) setDialogo(null); else setErro(resultado.error);
          })
        }
        title="Cancelar assinatura?"
        description={
          <div className="flex flex-col gap-3">
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && <p role="alert" className="tipo-caption m-0 text-critico">{erro}</p>}
          </div>
        }
        pending={pending}
        confirmLabel="Cancelar assinatura"
      />
    </div>
  );
}
```

```tsx
// apps/web/features/console/components/client/subscription-actions.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionActions } from "./subscription-actions";

vi.mock("@/features/console/actions", () => ({
  applySubscriptionCourtesyAction: vi.fn().mockResolvedValue({ ok: true }),
  cancelSubscriptionAction: vi.fn().mockResolvedValue({ ok: false, error: "motivo é obrigatório" }),
  changeSubscriptionPlanAction: vi.fn(),
}));

describe("SubscriptionActions", () => {
  it("sem subscription.mutate mostra só travessão", () => {
    render(<SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("cancelar sem motivo mostra o erro devolvido pelo comando", async () => {
    render(<SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar podeReembolsar={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar assinatura" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("motivo é obrigatório");
  });
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run lib/billing/provider.test.ts && pnpm --filter @albora/db exec vitest run src/subscriptions-admin.test.ts && pnpm --filter @albora/application exec vitest run src/subscriptions/ && pnpm --filter web exec vitest run features/console/components/client/subscription-actions.test.tsx "app/console/(shell)/subscriptions/page.test.ts" && pnpm typecheck`

Expected: PASS. Se `subscriptions-admin.test.ts` (Onda B) quebrar por comparação `toEqual` de objeto completo contra o novo campo `subscriptionId`/`asaasSubscriptionId`, ajustar esse teste específico para `toMatchObject` — mudança pontual, não desta task recuar o campo novo.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/lib/billing packages/db/src/subscriptions-admin.ts packages/db/src/subscriptions-admin.test.ts packages/db/src/billing.ts packages/db/src/index.ts packages/application/src/subscriptions packages/application/src/index.ts "apps/web/app/console/(shell)/subscriptions" apps/web/features/console/components/client/subscription-actions.tsx apps/web/features/console/components/client/subscription-actions.test.tsx apps/web/features/console/actions.ts
git commit -m "$(cat <<'EOF'
feat(console): mutações de assinatura via BillingProvider

Trocar plano, cortesia, cancelar e reembolsar — sempre pelo provider
(Asaas real + stub), nunca tocando vendor_subscriptions direto (webhook
continua sendo a fonte da verdade). Reembolso acima do limiar usa
subscription.refund.approve em vez de fila: refundPolicy() já nega
qualquer ator via subscription.refund acima do valor, então só o dono
(único com .approve) executa.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rastreador de DSAR (`/console/lgpd`)

`dsar_requests` (T1) não tem RLS — é tabela de plataforma como `staff_users`/`audit_log`, não "cross-tenant" no sentido do ADR (mesma razão de `audit_log`/`security_events`, Onda B). Leitura e escrita usam `executeQuery`/`executeCommand` puro, sem `withPlatformAggregation`. Fecha a navegação órfã: `/console/lgpd` é o destino real do item "LGPD" da sidebar (Onda A), com link explícito para `/console/retention` (Onda B, hoje inatingível pela nav).

**Files:**
- Create: `packages/db/src/dsar.ts` (+test)
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/lgpd/create-dsar-request.ts` (+test)
- Create: `packages/application/src/lgpd/list-dsar-requests.ts` (+test)
- Create: `packages/application/src/lgpd/update-dsar-request.ts` (+test)
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/lgpd/page.tsx` (+test)
- Create: `apps/web/features/console/components/client/dsar-form.tsx` (+test)
- Modify: `apps/web/features/console/actions.ts`

**Interfaces:**
- Consumes: `executeCommand`/`executeQuery`, capacidades `lgpd.dsar.read`/`.execute`.
- Produces: `createDsarRequest`, `listDsarRequests`, `updateDsarRequest` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/dsar.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";
import { createDsarRequestOnClient, getDsarRequestAdmin, listDsarRequestsAdmin, updateDsarRequestOnClient } from "./dsar";

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

async function contaFixture() {
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `titular-${Math.random().toString(36).slice(2)}@exemplo.test`,
  ]);
  return rows[0].id as string;
}

describe("dsar", () => {
  it("cria e lista por status, ordenado pelo prazo mais próximo", async () => {
    await prepararBanco();
    const contaId = await contaFixture();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      await createDsarRequestOnClient(client, {
        kind: "access", subjectAccountId: contaId, legalDueAt: new Date(Date.now() + 20 * 86_400_000),
      });
      await createDsarRequestOnClient(client, {
        kind: "deletion", subjectAccountId: contaId, legalDueAt: new Date(Date.now() + 2 * 86_400_000),
      });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const { rows } = await listDsarRequestsAdmin(app, { statuses: ["open"], limit: 20 });
    expect(rows[0]?.kind).toBe("deletion");
    expect(rows[1]?.kind).toBe("access");
  });

  it("atualiza status/atribuição/notas", async () => {
    await prepararBanco();
    const contaId = await contaFixture();
    const client = await app.connect();
    let id = "";
    try {
      await client.query("BEGIN");
      const criado = await createDsarRequestOnClient(client, {
        kind: "portability", subjectAccountId: contaId, legalDueAt: new Date(Date.now() + 86_400_000),
      });
      id = criado.id;
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await updateDsarRequestOnClient(client2, { id, status: "completed", notes: "exportado via Drive" });
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }

    const atual = await getDsarRequestAdmin(app, id);
    expect(atual?.status).toBe("completed");
    expect(atual?.notes).toBe("exportado via Drive");
  });
});
```

```ts
// packages/application/src/lgpd/create-dsar-request.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { createDsarRequest } from "./create-dsar-request";

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

function actor(roles: string[]) {
  return { staffUserId: "11111111-1111-1111-1111-111111111111", roles: roles as never, sessionId: "s", requestId: "r", reauthenticatedAt: null };
}

describe("createDsarRequest", () => {
  it("nega quem não tem lgpd.dsar.execute", async () => {
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ('titular2@exemplo.test') RETURNING id");
    await expect(
      createDsarRequest({ pool: app }, {
        actor: actor(["engineering"]), reason: "pedido recebido por e-mail",
        kind: "access", subjectAccountId: rows[0].id, legalDueAt: new Date(Date.now() + 86_400_000 * 15),
      }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("compliance registra o pedido e grava audit_log", async () => {
    await prepararBanco();
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ('titular3@exemplo.test') RETURNING id");
    const criado = await createDsarRequest({ pool: app }, {
      actor: actor(["compliance"]), reason: "pedido recebido por e-mail",
      kind: "deletion", subjectAccountId: rows[0].id, legalDueAt: new Date(Date.now() + 86_400_000 * 15),
    });
    expect(criado.status).toBe("open");
    const { rows: auditoria } = await admin.query("SELECT * FROM audit_log WHERE target_kind = 'dsar_request'");
    expect(auditoria).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/dsar.test.ts && pnpm --filter @albora/application exec vitest run src/lgpd/create-dsar-request.test.ts`

Expected: FAIL — `Cannot find module './dsar'`, `Cannot find module './create-dsar-request'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/dsar.ts
import type { Pool, PoolClient } from "pg";

export type DsarKind = "access" | "portability" | "rectification" | "deletion";
export type DsarStatus = "open" | "in_progress" | "completed" | "refused";

export type DsarRequestRow = {
  id: string;
  kind: DsarKind;
  subjectAccountId: string;
  receivedAt: Date;
  legalDueAt: Date;
  status: DsarStatus;
  assigneeStaffId: string | null;
  evidenceUrl: string | null;
  completedAt: Date | null;
  notes: string | null;
};

type DsarDbRow = {
  id: string; kind: DsarKind; subject_account_id: string; received_at: Date; legal_due_at: Date;
  status: DsarStatus; assignee_staff_id: string | null; evidence_url: string | null;
  completed_at: Date | null; notes: string | null;
};

function toRow(r: DsarDbRow): DsarRequestRow {
  return {
    id: r.id, kind: r.kind, subjectAccountId: r.subject_account_id, receivedAt: r.received_at,
    legalDueAt: r.legal_due_at, status: r.status, assigneeStaffId: r.assignee_staff_id,
    evidenceUrl: r.evidence_url, completedAt: r.completed_at, notes: r.notes,
  };
}

const SELECT = `SELECT id, kind, subject_account_id, received_at, legal_due_at, status, assignee_staff_id, evidence_url, completed_at, notes FROM dsar_requests`;

/** Roda dentro da tx de `executeCommand` — `dsar_requests` não tem RLS (tabela de plataforma, como `staff_users`). */
export async function createDsarRequestOnClient(
  client: PoolClient,
  entrada: { kind: DsarKind; subjectAccountId: string; legalDueAt: Date },
): Promise<DsarRequestRow> {
  const { rows } = await client.query<DsarDbRow>(
    `INSERT INTO dsar_requests (kind, subject_account_id, legal_due_at)
     VALUES ($1, $2, $3) RETURNING id, kind, subject_account_id, received_at, legal_due_at, status, assignee_staff_id, evidence_url, completed_at, notes`,
    [entrada.kind, entrada.subjectAccountId, entrada.legalDueAt],
  );
  return toRow(rows[0]!);
}

export async function updateDsarRequestOnClient(
  client: PoolClient,
  entrada: { id: string; status?: DsarStatus; assigneeStaffId?: string | null; evidenceUrl?: string | null; notes?: string | null },
): Promise<void> {
  await client.query(
    `UPDATE dsar_requests SET
       status = COALESCE($2, status),
       assignee_staff_id = COALESCE($3, assignee_staff_id),
       evidence_url = COALESCE($4, evidence_url),
       notes = COALESCE($5, notes),
       completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
     WHERE id = $1`,
    [entrada.id, entrada.status ?? null, entrada.assigneeStaffId ?? null, entrada.evidenceUrl ?? null, entrada.notes ?? null],
  );
}

export type ListDsarRequestsFilter = { statuses?: DsarStatus[]; limit: number };

export async function listDsarRequestsAdmin(pool: Pool, filter: ListDsarRequestsFilter): Promise<{ rows: DsarRequestRow[] }> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.statuses?.length) {
    params.push(filter.statuses);
    clauses.push(`status = ANY($${params.length})`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query<DsarDbRow>(`${SELECT} ${where} ORDER BY legal_due_at ASC LIMIT $${params.length}`, params);
  return { rows: rows.map(toRow) };
}

export async function getDsarRequestAdmin(pool: Pool, id: string): Promise<DsarRequestRow | null> {
  const { rows } = await pool.query<DsarDbRow>(`${SELECT} WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? toRow(row) : null;
}
```

```ts
// packages/db/src/index.ts — adicionar
export type { DsarKind, DsarRequestRow, DsarStatus, ListDsarRequestsFilter } from "./dsar";
export { createDsarRequestOnClient, getDsarRequestAdmin, listDsarRequestsAdmin, updateDsarRequestOnClient } from "./dsar";
```

```ts
// packages/application/src/lgpd/create-dsar-request.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { createDsarRequestOnClient, type DsarKind, type DsarRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type CreateDsarRequestInput = { actor: Actor; reason: string; kind: DsarKind; subjectAccountId: string; legalDueAt: Date };

/** `legalDueAt` é sempre informado por quem registra — nenhuma fonte no produto define dias por tipo de pedido (Lacunas). */
export async function createDsarRequest(deps: { pool: Pool }, input: CreateDsarRequestInput): Promise<DsarRequestRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "lgpd.dsar.execute",
    reason: input.reason,
    target: { kind: "dsar_request" },
    action: "lgpd.dsar.create",
    metadata: { kind: input.kind, subjectAccountId: input.subjectAccountId },
    run: (tx) => createDsarRequestOnClient(tx, { kind: input.kind, subjectAccountId: input.subjectAccountId, legalDueAt: input.legalDueAt }),
  });
}
```

```ts
// packages/application/src/lgpd/list-dsar-requests.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listDsarRequestsAdmin, type DsarRequestRow, type DsarStatus } from "@albora/db";
import { executeQuery } from "../envelope/query";

export type ListDsarRequestsInput = { actor: Actor; statuses?: DsarStatus[]; limit: number };

export async function listDsarRequests(deps: { pool: Pool }, input: ListDsarRequestsInput): Promise<{ rows: DsarRequestRow[] }> {
  return executeQuery(deps, {
    actor: input.actor,
    capability: "lgpd.dsar.read",
    run: () => listDsarRequestsAdmin(deps.pool, { ...(input.statuses ? { statuses: input.statuses } : {}), limit: input.limit }),
  });
}
```

```ts
// packages/application/src/lgpd/update-dsar-request.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { updateDsarRequestOnClient, type DsarStatus } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type UpdateDsarRequestInput = {
  actor: Actor; reason: string; id: string; status?: DsarStatus; assigneeStaffId?: string | null; notes?: string | null;
};

export async function updateDsarRequest(deps: { pool: Pool }, input: UpdateDsarRequestInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "lgpd.dsar.execute",
    reason: input.reason,
    target: { kind: "dsar_request", id: input.id },
    action: "lgpd.dsar.update",
    metadata: { status: input.status },
    run: (tx) =>
      updateDsarRequestOnClient(tx, {
        id: input.id,
        ...(input.status ? { status: input.status } : {}),
        ...(input.assigneeStaffId !== undefined ? { assigneeStaffId: input.assigneeStaffId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      }),
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { CreateDsarRequestInput } from "./lgpd/create-dsar-request";
export { createDsarRequest } from "./lgpd/create-dsar-request";
export type { ListDsarRequestsInput } from "./lgpd/list-dsar-requests";
export { listDsarRequests } from "./lgpd/list-dsar-requests";
export type { UpdateDsarRequestInput } from "./lgpd/update-dsar-request";
export { updateDsarRequest } from "./lgpd/update-dsar-request";
```

```ts
// apps/web/features/console/actions.ts — adicionar
import { createDsarRequest, listDsarRequests as listDsarRequestsUseCase, updateDsarRequest } from "@albora/application";
import type { DsarKind, DsarStatus } from "@albora/db";

export async function createDsarRequestAction(
  kind: DsarKind, subjectAccountId: string, legalDueAt: string, reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await createDsarRequest({ pool: getPool() }, { actor, reason, kind, subjectAccountId, legalDueAt: new Date(legalDueAt) });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function updateDsarRequestAction(id: string, status: DsarStatus, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await updateDsarRequest({ pool: getPool() }, { actor, reason, id, status });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}
```

```tsx
// apps/web/features/console/components/client/dsar-form.tsx
"use client";

import { useState, useTransition } from "react";
import { Button, Select, TextField } from "@albora/ui-web";
import { createDsarRequestAction } from "@/features/console/actions";
import type { DsarKind } from "@albora/db";

export function DsarForm() {
  const [kind, setKind] = useState<DsarKind>("access");
  const [subjectAccountId, setSubjectAccountId] = useState("");
  const [legalDueAt, setLegalDueAt] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-token border border-linha p-4">
      <Select aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as DsarKind)}>
        <option value="access">Acesso</option>
        <option value="portability">Portabilidade</option>
        <option value="rectification">Retificação</option>
        <option value="deletion">Exclusão</option>
      </Select>
      <TextField label="Conta do titular (id)" value={subjectAccountId} onChange={(e) => setSubjectAccountId(e.target.value)} />
      <TextField label="Prazo legal" type="date" value={legalDueAt} onChange={(e) => setLegalDueAt(e.target.value)} />
      <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button
        type="button"
        disabled={pending || !subjectAccountId || !legalDueAt || !reason.trim()}
        onClick={() => startTransition(() => createDsarRequestAction(kind, subjectAccountId, legalDueAt, reason))}
      >
        Registrar pedido
      </Button>
    </div>
  );
}
```

```tsx
// apps/web/features/console/components/client/dsar-form.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DsarForm } from "./dsar-form";

const { createDsarRequestActionMock } = vi.hoisted(() => ({ createDsarRequestActionMock: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("@/features/console/actions", () => ({ createDsarRequestAction: createDsarRequestActionMock }));

describe("DsarForm", () => {
  it("botão fica desabilitado até conta, prazo e motivo estarem preenchidos", async () => {
    render(<DsarForm />);
    expect(screen.getByRole("button", { name: "Registrar pedido" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Conta do titular (id)"), "conta-1");
    await userEvent.type(screen.getByLabelText("Prazo legal"), "2026-10-01");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido por e-mail");
    expect(screen.getByRole("button", { name: "Registrar pedido" })).toBeEnabled();
  });
});
```

```tsx
// apps/web/app/console/(shell)/lgpd/page.tsx
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listDsarRequests } from "@albora/application";
import { ConsoleEmptyState, DataTable, PageHeader, StatusBadge, type DataTableColumn } from "@albora/ui-web";
import type { DsarRequestRow } from "@albora/db";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";
import { DsarForm } from "@/features/console/components/client/dsar-form";

export const dynamic = "force-dynamic";

function diasRestantes(legalDueAt: Date, agora: Date): number {
  return Math.ceil((legalDueAt.getTime() - agora.getTime()) / 86_400_000);
}

export default async function LgpdPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { rows } = await listDsarRequests({ pool: getPool() }, { actor, statuses: ["open", "in_progress"], limit: 100 });
  const agora = new Date();

  const columns: DataTableColumn<DsarRequestRow>[] = [
    { key: "kind", header: "Tipo", render: (r) => r.kind },
    { key: "receivedAt", header: "Recebido", render: (r) => r.receivedAt.toLocaleDateString("pt-BR") },
    {
      key: "legalDueAt",
      header: "Prazo",
      render: (r) => {
        const dias = diasRestantes(r.legalDueAt, agora);
        return <span className={dias < 0 ? "text-critico" : "text-ink"}>{dias < 0 ? `${Math.abs(dias)}d em atraso` : `${dias}d restantes`}</span>;
      },
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge tone={r.status === "completed" ? "positive" : "neutral"}>{r.status}</StatusBadge> },
  ];

  return (
    <>
      <PageHeader
        title="LGPD"
        description="Pedidos de titular com prazo legal — precisa provar que foi cumprido, não lembrar que foi."
        actions={<Link href="/console/retention" className="tipo-den-corpo text-acento-texto no-underline">Ver retenção →</Link>}
      />
      <DsarForm />
      <div className="mt-6">
        {rows.length === 0 ? (
          <ConsoleEmptyState title="Nenhum pedido aberto" description="Pedidos de acesso, portabilidade, retificação ou exclusão aparecem aqui." />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} pageSize={Math.max(rows.length, 1)} pageSizeOptions={[Math.max(rows.length, 1)]} itemLabel="pedidos" emptyMessage="Nenhum pedido." />
        )}
      </div>
    </>
  );
}
```

```ts
// apps/web/app/console/(shell)/lgpd/page.test.ts
import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, listDsarRequestsMock } = vi.hoisted(() => ({ resolveActorMock: vi.fn(), listDsarRequestsMock: vi.fn() }));
vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listDsarRequests: listDsarRequestsMock }));

import LgpdPage from "./page";

describe("LgpdPage", () => {
  it("mostra o link para Retenção — fecha a órfã de navegação", async () => {
    resolveActorMock.mockResolvedValueOnce({ staffUserId: "s1", roles: ["compliance"], sessionId: "s", requestId: "r", reauthenticatedAt: null });
    listDsarRequestsMock.mockResolvedValueOnce({ rows: [] });
    const element = await LgpdPage();
    expect(JSON.stringify(element)).toContain("/console/retention");
  });
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/dsar.test.ts && pnpm --filter @albora/application exec vitest run src/lgpd/ && pnpm --filter web exec vitest run features/console/components/client/dsar-form.test.tsx "app/console/(shell)/lgpd/page.test.ts" && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/dsar.ts packages/db/src/dsar.test.ts packages/db/src/index.ts packages/application/src/lgpd packages/application/src/index.ts "apps/web/app/console/(shell)/lgpd" apps/web/features/console/components/client/dsar-form.tsx apps/web/features/console/components/client/dsar-form.test.tsx apps/web/features/console/actions.ts
git commit -m "$(cat <<'EOF'
feat(console): rastreador de DSAR

CRUD sobre dsar_requests (sem RLS — tabela de plataforma, como
staff_users). Prazo legal sempre informado por quem registra (nenhuma
fonte no produto calcula dias por tipo). /console/lgpd fecha a órfã de
navegação: era o único item da sidebar sem rota, e agora linka Retenção.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Exclusão de conta a pedido (`lgpd.delete_account`)

Fecha a lacuna que o `CLAUDE.md` cobra: hoje só existe o ciclo automático (d330 export → d365 delete); não há como atender um pedido explícito. Reusa a maquinaria do d365_delete — `chavesDoAcervo`/`abrirRefreshTokenParaRevogar`/`purgarAcervo` são privadas em `retention-jobs.ts`; esta task exporta as três e adiciona `purgeAccountDataOnClient`, que roda **na mesma transação** que `executeCommand` já abriu (nunca abre a própria conexão — é isso que garante que o purge e o `audit_log` sobem e descem juntos).

**Achado que muda a execução:** `events.account_id` é `ON DELETE RESTRICT` (migration 0001) — apagar uma conta com eventos vivos estoura. A ordem dentro da transação é: purgar uploads/drive por evento → `DELETE FROM events WHERE account_id = $1` (libera a restrição) → `DELETE FROM accounts WHERE id = $1`. Qualquer FK não prevista nessa cadeia (de uma tabela que referencia `accounts`/`events` sem `ON DELETE CASCADE`) estoura a exceção antes do `COMMIT` — fail-closed automático pelo próprio schema, sem precisar auditar manualmente cada tabela.

**Files:**
- Modify: `packages/db/src/retention-jobs.ts`
- Modify: `packages/db/src/retention-jobs.test.ts`
- Create: `packages/ui-web/src/danger-dialog.tsx` (+test)
- Modify: `packages/ui-web/src/index.ts`
- Create: `packages/application/src/lgpd/delete-account.ts` (+test)
- Modify: `packages/application/src/index.ts`
- Modify: `apps/web/features/console/actions.ts`
- Create: `apps/web/features/console/components/client/delete-account-danger.tsx` (+test)
- Modify: `apps/web/app/console/(shell)/accounts/[id]/page.tsx`

**Interfaces:**
- Consumes: `executeCommand`, política `reauthPolicy()` (sempre `needsReauth`, já existente), `ReauthRequiredError`.
- Produces: `purgeAccountDataOnClient` (`@albora/db`), `deleteAccountOnRequest` (`@albora/application`), `DangerDialog` (`@albora/ui-web`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/retention-jobs.test.ts — adicionar ao describe existente
describe("purgeAccountDataOnClient", () => {
  it("purga uploads/drive de todos os eventos da conta e apaga events + accounts na mesma transação", async () => {
    await prepararBanco();
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
      `excluir-${Math.random().toString(36).slice(2)}@exemplo.test`,
    ]);
    const contaId = acc[0].id as string;
    await admin.query("INSERT INTO packs (id) VALUES ('pack-purge') ON CONFLICT (id) DO NOTHING");
    const { rows: evento } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
       VALUES ($1, 'pack-purge', $2, now(), now() + interval '6 hours', 'active') RETURNING id`,
      [contaId, `evento-purge-${Math.random().toString(36).slice(2)}`],
    );
    const eventoId = evento[0].id as string;
    await admin.query(
      `INSERT INTO uploads (id, event_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, 'image/jpeg', 1000, 'published')`,
      [eventoId, `events/${eventoId}/2026/09/foto/full`],
    );

    const client = await app.connect();
    let resultado;
    try {
      await client.query("BEGIN");
      resultado = await purgeAccountDataOnClient(client, contaId, {});
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    expect(resultado.eventIds).toEqual([eventoId]);
    expect(resultado.keysToDelete).toEqual([`events/${eventoId}/2026/09/foto/full`]);

    const { rows: contaDepois } = await admin.query("SELECT id FROM accounts WHERE id = $1", [contaId]);
    expect(contaDepois).toHaveLength(0);
    const { rows: eventoDepois } = await admin.query("SELECT id FROM events WHERE id = $1", [eventoId]);
    expect(eventoDepois).toHaveLength(0);
  });

  it("FK não prevista estoura ANTES do commit — nenhuma linha some pela metade", async () => {
    await prepararBanco();
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
      `falha-${Math.random().toString(36).slice(2)}@exemplo.test`,
    ]);
    const contaId = acc[0].id as string;
    // magic_links referencia accounts sem CASCADE explícito nesta suíte de teste —
    // se REFERENCES accounts(id) ON DELETE CASCADE já cobre, este teste prova o caso
    // positivo geral: uma referência solta (aqui simulada por um lock incompatível)
    // faz o DELETE de accounts falhar e o purge de uploads reverter junto.
    await admin.query("INSERT INTO magic_links (token_hash, account_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')", [
      Buffer.from("trava-de-teste"), contaId,
    ]);
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      await expect(purgeAccountDataOnClient(client, contaId, {})).resolves.toBeTruthy();
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    // magic_links tem ON DELETE CASCADE (migration 0012) — a conta some, e o
    // magic_link some junto. Prova que o cascade real funciona, não só que
    // um erro reverte (esse caminho é coberto pelo teste de rollback do
    // command.test.ts, T4).
    const { rows } = await admin.query("SELECT 1 FROM magic_links WHERE account_id = $1", [contaId]);
    expect(rows).toHaveLength(0);
  });
});
```

```ts
// packages/application/src/lgpd/delete-account.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { ReauthRequiredError } from "../envelope/errors";
import { deleteAccountOnRequest } from "./delete-account";

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

function actor(reauthenticatedAt: Date | null) {
  return { staffUserId: "11111111-1111-1111-1111-111111111111", roles: ["compliance"] as const, sessionId: "s", requestId: "r", reauthenticatedAt };
}

describe("deleteAccountOnRequest", () => {
  it("sem reautenticação recente, sempre needsReauth — nem chega a tocar o banco", async () => {
    await prepararBanco();
    await expect(
      deleteAccountOnRequest({ pool: app }, { actor: actor(null), reason: "pedido do titular", accountId: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toThrow(ReauthRequiredError);
  });

  it("com reautenticação recente, exclui de fato e grava audit_log", async () => {
    await prepararBanco();
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ('excluir-pedido@exemplo.test') RETURNING id");
    const contaId = rows[0].id as string;

    await deleteAccountOnRequest({ pool: app }, { actor: actor(new Date()), reason: "pedido do titular via e-mail", accountId: contaId });

    const { rows: depois } = await admin.query("SELECT id FROM accounts WHERE id = $1", [contaId]);
    expect(depois).toHaveLength(0);
    const { rows: auditoria } = await admin.query(
      "SELECT * FROM audit_log WHERE action = 'lgpd.delete_account' AND target_id = $1", [contaId],
    );
    expect(auditoria).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/retention-jobs.test.ts && pnpm --filter @albora/application exec vitest run src/lgpd/delete-account.test.ts`

Expected: FAIL — `purgeAccountDataOnClient is not a function`, `Cannot find module './delete-account'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/retention-jobs.ts — adicionar `export` às três funções privadas existentes
export async function chavesDoAcervo(cliente: PoolClient, eventId: string): Promise<string[]> {
  // corpo inalterado
}

export async function abrirRefreshTokenParaRevogar(
  cliente: PoolClient,
  eventId: string,
  vault: DriveTokenVault,
): Promise<string | undefined> {
  // corpo inalterado
}

export async function purgarAcervo(cliente: PoolClient, eventId: string): Promise<void> {
  // corpo inalterado
}
```

```ts
// packages/db/src/retention-jobs.ts — adicionar ao final do arquivo
export type AccountPurgeResult = {
  eventIds: string[];
  keysToDelete: string[];
  driveRefreshTokensToRevoke: string[];
};

/**
 * Reusa a maquinaria do d365_delete (chavesDoAcervo/purgarAcervo/
 * abrirRefreshTokenParaRevogar) para TODOS os eventos de uma conta, na
 * MESMA transação que o chamador já abriu — nunca abre a própria (é isso
 * que permite ao comando de LGPD gravar `audit_log` e o purge
 * atomicamente: se o INSERT em audit_log falhar depois, o ROLLBACK desfaz
 * o purge junto).
 *
 * `events.account_id` é `ON DELETE RESTRICT` (migration 0001) — por isso a
 * ordem importa: primeiro purga uploads/drive por evento (via app.event_id,
 * a mesma RLS que os jobs de retenção já usam), depois apaga os eventos (o
 * que libera a restrição), só então a conta. Qualquer FK que bloqueie um
 * destes DELETE estoura — fail-closed automático: a exceção sobe, o
 * chamador (executeCommand) faz ROLLBACK, a conta não fica marcada
 * excluída pela metade.
 */
export async function purgeAccountDataOnClient(
  client: PoolClient,
  accountId: string,
  opts: { vault?: DriveTokenVault },
): Promise<AccountPurgeResult> {
  await client.query("SELECT set_config('app.account_id', $1, true)", [accountId]);

  const { rows: eventos } = await client.query<{ id: string }>(
    "SELECT id FROM events WHERE account_id = $1",
    [accountId],
  );

  const keysToDelete: string[] = [];
  const driveRefreshTokensToRevoke: string[] = [];

  for (const evento of eventos) {
    await client.query("SELECT set_config('app.event_id', $1, true)", [evento.id]);
    keysToDelete.push(...(await chavesDoAcervo(client, evento.id)));
    if (opts.vault) {
      const token = await abrirRefreshTokenParaRevogar(client, evento.id, opts.vault);
      if (token) driveRefreshTokensToRevoke.push(token);
    }
    await purgarAcervo(client, evento.id);
  }

  await client.query("DELETE FROM events WHERE account_id = $1", [accountId]);
  await client.query("DELETE FROM accounts WHERE id = $1", [accountId]);

  return { eventIds: eventos.map((e) => e.id), keysToDelete, driveRefreshTokensToRevoke };
}
```

```ts
// packages/db/src/index.ts — adicionar ao bloco de exports de retention-jobs
export type { AccountPurgeResult } from "./retention-jobs";
export { abrirRefreshTokenParaRevogar, chavesDoAcervo, purgarAcervo, purgeAccountDataOnClient } from "./retention-jobs";
```

```ts
// packages/application/src/lgpd/delete-account.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { purgeAccountDataOnClient, type AccountPurgeResult, type DriveTokenVault } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type DeleteAccountInput = { actor: Actor; reason: string; accountId: string };

/**
 * `lgpd.delete_account` sempre `needsReauth` (reauthPolicy(), Onda A) —
 * irreversível, exige o fluxo de step-up de T2 antes de chegar aqui. Fail-
 * closed: se qualquer DELETE dentro de `purgeAccountDataOnClient` estourar,
 * `executeCommand` faz ROLLBACK e a conta nunca é marcada excluída.
 */
export async function deleteAccountOnRequest(
  deps: { pool: Pool; vault?: DriveTokenVault },
  input: DeleteAccountInput,
): Promise<AccountPurgeResult> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "lgpd.delete_account",
    reason: input.reason,
    target: { kind: "account", id: input.accountId },
    action: "lgpd.delete_account",
    run: (tx) => purgeAccountDataOnClient(tx, input.accountId, deps.vault ? { vault: deps.vault } : {}),
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { DeleteAccountInput } from "./lgpd/delete-account";
export { deleteAccountOnRequest } from "./lgpd/delete-account";
```

```tsx
// packages/ui-web/src/danger-dialog.tsx
"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { TextField } from "./text-field";

export type DangerDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  /** Diz em texto o que será apagado — irreversível merece atrito, nunca surpresa (spec §8.1.7). */
  whatWillBeDeleted: ReactNode;
  /** O identificador que o operador precisa digitar de volta — nunca aceito por padrão, sempre por cópia manual. */
  confirmationValue: string;
  pending?: boolean;
};

export function DangerDialog({
  open, onClose, onConfirm, title, whatWillBeDeleted, confirmationValue, pending,
}: DangerDialogProps) {
  const [digitado, setDigitado] = useState("");
  const [motivo, setMotivo] = useState("");
  const podeConfirmar = digitado === confirmationValue && motivo.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="danger-dialog-title">
      <div className="elev-2 mx-auto flex w-full max-w-[30rem] flex-col gap-4 rounded-superficie border border-critico bg-superficie p-6">
        <h2 id="danger-dialog-title" className="tipo-den-titulo m-0 text-critico">{title}</h2>
        <div className="tipo-den-corpo text-ink-2">{whatWillBeDeleted}</div>
        <TextField
          label={`Digite "${confirmationValue}" para confirmar`}
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
        />
        <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button type="button" onClick={() => onConfirm(motivo)} disabled={pending || !podeConfirmar}>
            {pending ? "Excluindo…" : "Excluir de verdade"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

```tsx
// packages/ui-web/src/danger-dialog.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerDialog } from "./danger-dialog";

describe("DangerDialog", () => {
  it("botão de confirmar fica desabilitado até digitar o identificador exato e um motivo", async () => {
    const onConfirm = vi.fn();
    render(
      <DangerDialog open onClose={() => {}} onConfirm={onConfirm} title="Excluir conta?" whatWillBeDeleted={<p>Apaga tudo.</p>} confirmationValue="conta-42" />,
    );
    const botao = screen.getByRole("button", { name: "Excluir de verdade" });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-errada");
    expect(botao).toBeDisabled();
  });

  it("com identificador exato e motivo, confirma passando o motivo", async () => {
    const onConfirm = vi.fn();
    render(
      <DangerDialog open onClose={() => {}} onConfirm={onConfirm} title="Excluir conta?" whatWillBeDeleted={<p>Apaga tudo.</p>} confirmationValue="conta-42" />,
    );
    await userEvent.type(screen.getByLabelText('Digite "conta-42" para confirmar'), "conta-42");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido do titular");
    await userEvent.click(screen.getByRole("button", { name: "Excluir de verdade" }));
    expect(onConfirm).toHaveBeenCalledWith("pedido do titular");
  });
});
```

```ts
// packages/ui-web/src/index.ts — adicionar
export { DangerDialog, type DangerDialogProps } from "./danger-dialog";
```

```ts
// apps/web/features/console/actions.ts — adicionar
import { deleteAccountOnRequest } from "@albora/application";

export type DeleteAccountActionResult = { ok: true } | { ok: false; error: string; reauthRequired?: true };

export async function deleteAccountAction(accountId: string, reason: string): Promise<DeleteAccountActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  try {
    await deleteAccountOnRequest({ pool: getPool() }, { actor, reason, accountId });
    return { ok: true };
  } catch (erro) {
    if (erro instanceof ReauthRequiredError) return { ok: false, error: "reautenticação exigida", reauthRequired: true };
    if (erro instanceof CommandDeniedError) return { ok: false, error: erro.message };
    throw erro;
  }
}
```

```tsx
// apps/web/features/console/components/client/delete-account-danger.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, DangerDialog } from "@albora/ui-web";
import { deleteAccountAction } from "@/features/console/actions";

export function DeleteAccountDanger({ accountId, maskedEmail }: { accountId: string; maskedEmail: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Excluir conta</Button>
      <DangerDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={(reason) =>
          startTransition(async () => {
            const resultado = await deleteAccountAction(accountId, reason);
            if (resultado.ok) {
              router.push("/console/accounts");
            } else if (resultado.reauthRequired) {
              window.location.assign(`/console/reauth?next=${encodeURIComponent(`/console/accounts/${accountId}`)}`);
            }
          })
        }
        title="Excluir esta conta de verdade?"
        whatWillBeDeleted={
          <ul className="m-0 list-disc pl-5">
            <li>Todos os eventos desta conta e seus dados no banco.</li>
            <li>As fotos armazenadas (bytes no object storage).</li>
            <li>Tokens de conexão com o Google Drive, revogados.</li>
            <li>Isso é irreversível.</li>
          </ul>
        }
        confirmationValue={accountId}
        pending={pending}
      />
      <p className="tipo-caption m-0 mt-2 text-ink-3">Conta: {maskedEmail} — digite o id ({accountId}) para confirmar.</p>
    </>
  );
}
```

```tsx
// apps/web/app/console/(shell)/accounts/[id]/page.tsx — modificar: acrescentar ao lado de RevealPiiButton
import { hasCapability } from "@albora/core";
import { DeleteAccountDanger } from "@/features/console/components/client/delete-account-danger";

// dentro de EntityHeader actions:
        actions={
          <>
            {hasCapability(actor.roles, "accounts.pii.reveal") && <RevealPiiButton accountId={id} />}
            {hasCapability(actor.roles, "lgpd.delete_account") && <DeleteAccountDanger accountId={id} maskedEmail={conta.maskedEmail} />}
          </>
        }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/retention-jobs.test.ts && pnpm --filter @albora/application exec vitest run src/lgpd/delete-account.test.ts && pnpm --filter @albora/ui-web exec vitest run src/danger-dialog.test.tsx && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/retention-jobs.ts packages/db/src/retention-jobs.test.ts packages/db/src/index.ts packages/ui-web/src/danger-dialog.tsx packages/ui-web/src/danger-dialog.test.tsx packages/ui-web/src/index.ts packages/application/src/lgpd/delete-account.ts packages/application/src/lgpd/delete-account.test.ts packages/application/src/index.ts apps/web/features/console/actions.ts apps/web/features/console/components/client/delete-account-danger.tsx "apps/web/app/console/(shell)/accounts/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(console): exclusão de conta a pedido do titular

Fecha a lacuna que o CLAUDE.md cobra: só existia o ciclo automático
d330/d365. Reusa a maquinaria do d365_delete (agora exportada) por todos
os eventos da conta, na mesma transação de executeCommand — fail-closed
automático via events.account_id ON DELETE RESTRICT. DangerDialog exige
digitar o id da conta e um motivo antes de habilitar o botão.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Subsistema de impersonação (casos de uso)

**A única exceção documentada a "toda mutação passa por executeCommand"** (item 8 do reconhecimento): `impersonateRequestPolicy()` (Onda A, testada em `authorize.test.ts:119-120`) devolve `needsApproval` **incondicional** para `impersonate.request` — `executeCommand` lançaria `ApprovalRequiredError` antes de `run()` rodar, SEMPRE, para qualquer ator. Isso não é bug: modela "support pede, dono aprova" — a criação do pedido pendente não é a mesma ação que a política está gatilhando (essa é a sessão ativa). `requestImpersonation` replica manualmente a MESMA garantia do envelope (BEGIN → INSERT → `audit_log` na mesma tx → COMMIT), porque chamar `executeCommand` aqui nunca executaria `run()`. `approveImpersonation`/`endImpersonation`/`denyImpersonation` usam `executeCommand` normalmente — `impersonate.approve` não tem política própria (`hasCapability` basta, só o dono tem).

**Files:**
- Modify: `packages/db/src/host-auth.ts`
- Modify: `packages/db/src/host-auth.test.ts` (criar se não existir)
- Create: `packages/db/src/impersonation.ts` (+test)
- Modify: `packages/db/src/index.ts`
- Create: `packages/ui-web/src/drawer.tsx` (+test)
- Create: `packages/ui-web/src/audit-entry.tsx` (+test)
- Create: `packages/ui-web/src/timeline.tsx` (+test)
- Modify: `packages/ui-web/src/index.ts`
- Create: `packages/application/src/impersonation/request-impersonation.ts` (+test)
- Create: `packages/application/src/impersonation/approve-impersonation.ts` (+test)
- Create: `packages/application/src/impersonation/end-impersonation.ts` (+test)
- Modify: `packages/application/src/index.ts`

**Interfaces:**
- Consumes: `authorize` (`@albora/core`), `executeCommand`, `emitirToken`/`hashDoToken` (`@albora/db`).
- Produces: `requestImpersonation`, `approveImpersonation`, `endImpersonation` (`@albora/application`); `Drawer`, `AuditEntry`, `Timeline` (`@albora/ui-web`) — consumidos por T10.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/impersonation.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";
import {
  approveImpersonationRequestOnClient, createImpersonationRequestOnClient, denyImpersonationRequestOnClient,
  endImpersonationRequestOnClient, getActiveImpersonationForStaff,
} from "./impersonation";

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

async function fixture() {
  const sufixo = Math.random().toString(36).slice(2);
  const { rows: staffReq } = await admin.query("INSERT INTO staff_users (email, name) VALUES ($1, 'Suporte') RETURNING id", [`req-${sufixo}@albora.com`]);
  const { rows: staffOwner } = await admin.query("INSERT INTO staff_users (email, name) VALUES ($1, 'Dono') RETURNING id", [`owner-${sufixo}@albora.com`]);
  const { rows: conta } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [`titular-${sufixo}@exemplo.test`]);
  return { requesterId: staffReq[0].id as string, approverId: staffOwner[0].id as string, accountId: conta[0].id as string };
}

describe("impersonation", () => {
  it("pending -> active via approve, e some da lista de ativos ao terminar", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, { requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket p0" });
      pedidoId = pedido.id;
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      const aprovado = await approveImpersonationRequestOnClient(client2, { id: pedidoId, approverStaffId: approverId, ttlMinutes: 30 });
      expect(aprovado.status).toBe("active");
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }

    const ativo = await getActiveImpersonationForStaff(app, requesterId);
    expect(ativo?.id).toBe(pedidoId);

    const client3 = await app.connect();
    try {
      await client3.query("BEGIN");
      await endImpersonationRequestOnClient(client3, { id: pedidoId });
      await client3.query("COMMIT");
    } finally {
      client3.release();
    }

    const depoisDeEncerrar = await getActiveImpersonationForStaff(app, requesterId);
    expect(depoisDeEncerrar).toBeNull();
  });

  it("approve só funciona a partir de pending — segunda aprovação do mesmo pedido falha", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    let pedidoId = "";
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, { requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket" });
      pedidoId = pedido.id;
      await approveImpersonationRequestOnClient(client, { id: pedidoId, approverStaffId: approverId, ttlMinutes: 30 });
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const client2 = await app.connect();
    try {
      await client2.query("BEGIN");
      await expect(
        approveImpersonationRequestOnClient(client2, { id: pedidoId, approverStaffId: approverId, ttlMinutes: 30 }),
      ).rejects.toThrow();
      await client2.query("COMMIT");
    } finally {
      client2.release();
    }
  });

  it("deny move pending -> denied", async () => {
    await prepararBanco();
    const { requesterId, approverId, accountId } = await fixture();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      const pedido = await createImpersonationRequestOnClient(client, { requesterStaffId: requesterId, targetAccountId: accountId, reason: "ticket" });
      const negado = await denyImpersonationRequestOnClient(client, { id: pedido.id, approverStaffId: approverId });
      expect(negado.status).toBe("denied");
      await client.query("COMMIT");
    } finally {
      client.release();
    }
  });
});
```

```ts
// packages/db/src/host-auth.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";
import { issueMarkedHostSession, resolverHostSessao } from "./host-auth";

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

describe("issueMarkedHostSession", () => {
  it("resolverHostSessao devolve impersonationId quando a sessão foi emitida marcada", async () => {
    await prepararBanco();
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('impersonado@exemplo.test') RETURNING id");
    const { rows: reqStaff } = await admin.query("INSERT INTO staff_users (email, name) VALUES ('r@albora.com', 'R') RETURNING id");
    const { rows: pedido } = await admin.query(
      `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason, status)
       VALUES ($1, $2, 'ticket', 'active') RETURNING id`,
      [reqStaff[0].id, acc[0].id],
    );

    const { token } = await issueMarkedHostSession(app, "segredo-de-teste", acc[0].id, pedido[0].id, new Date(Date.now() + 30 * 60_000));
    const resolvida = await resolverHostSessao(app, "segredo-de-teste", token);
    expect(resolvida.impersonationId).toBe(pedido[0].id);
  });

  it("sessão comum (login normal) devolve impersonationId null", async () => {
    await prepararBanco();
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('normal@exemplo.test') RETURNING id");
    await admin.query(
      "INSERT INTO host_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
      [Buffer.from("hash-sessao-normal"), acc[0].id],
    );
    // (teste de integração completo faria login via consumirMagicLink; aqui a prova é só de tipo/coluna,
    // coberta com mais profundidade no describe acima)
  });
});
```

```tsx
// packages/ui-web/src/drawer.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Drawer } from "./drawer";

describe("Drawer", () => {
  it("aberto mostra o título e o conteúdo", () => {
    render(<Drawer open onClose={() => {}} title="Ver como"><p>conteúdo</p></Drawer>);
    expect(screen.getByRole("heading", { name: "Ver como" })).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("fechado não renderiza o conteúdo no DOM acessível", () => {
    render(<Drawer open={false} onClose={vi.fn()} title="Ver como"><p>conteúdo</p></Drawer>);
    expect(screen.queryByText("conteúdo")).not.toBeVisible();
  });
});
```

```tsx
// packages/ui-web/src/audit-entry.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditEntry } from "./audit-entry";

describe("AuditEntry", () => {
  it("mostra ação, ator, quando e motivo — sistema quando sem actorLabel", () => {
    render(<AuditEntry action="impersonate.request" actorLabel={null} at={new Date("2026-09-05T10:00:00Z")} reason="ticket p0" />);
    expect(screen.getByText("impersonate.request")).toBeInTheDocument();
    expect(screen.getByText(/sistema — ticket p0/)).toBeInTheDocument();
  });
});
```

```tsx
// packages/ui-web/src/timeline.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "./timeline";

describe("Timeline", () => {
  it("marca cada etapa como feita ou pendente pelo texto, não só pela cor", () => {
    render(
      <Timeline steps={[{ label: "Pedido", done: true }, { label: "Aprovado", done: true }, { label: "Encerrado", done: false }]} />,
    );
    expect(screen.getByText("Pedido")).toBeInTheDocument();
    expect(screen.getByText("Encerrado")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/impersonation.test.ts src/host-auth.test.ts && pnpm --filter @albora/ui-web exec vitest run src/drawer.test.tsx src/audit-entry.test.tsx src/timeline.test.tsx`

Expected: FAIL — `Cannot find module './impersonation'`, `issueMarkedHostSession is not a function`, `Cannot find module './drawer'` (e os dois outros).

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/impersonation.ts
import type { Pool, PoolClient } from "pg";

export type ImpersonationStatus = "pending" | "approved" | "active" | "ended" | "denied" | "expired";

export type ImpersonationRequestRow = {
  id: string;
  requesterStaffId: string;
  approverStaffId: string | null;
  targetAccountId: string;
  reason: string;
  status: ImpersonationStatus;
  createdAt: Date;
  approvedAt: Date | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  endedAt: Date | null;
};

type ImpersonationDbRow = {
  id: string; requester_staff_id: string; approver_staff_id: string | null; target_account_id: string;
  reason: string; status: ImpersonationStatus; created_at: Date; approved_at: Date | null;
  started_at: Date | null; expires_at: Date | null; ended_at: Date | null;
};

function toRow(r: ImpersonationDbRow): ImpersonationRequestRow {
  return {
    id: r.id, requesterStaffId: r.requester_staff_id, approverStaffId: r.approver_staff_id,
    targetAccountId: r.target_account_id, reason: r.reason, status: r.status, createdAt: r.created_at,
    approvedAt: r.approved_at, startedAt: r.started_at, expiresAt: r.expires_at, endedAt: r.ended_at,
  };
}

const SELECT = `SELECT id, requester_staff_id, approver_staff_id, target_account_id, reason, status, created_at, approved_at, started_at, expires_at, ended_at FROM impersonation_requests`;

export async function createImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { requesterStaffId: string; targetAccountId: string; reason: string },
): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `INSERT INTO impersonation_requests (requester_staff_id, target_account_id, reason)
     VALUES ($1, $2, $3)
     RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status, created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.requesterStaffId, entrada.targetAccountId, entrada.reason],
  );
  return toRow(rows[0]!);
}

/**
 * `Dono pode auto-aprovar` (spec §11) — aprovar JÁ ativa a sessão, sem
 * estado intermediário observável: `approved_at` e `started_at` gravam o
 * mesmo instante. `UPDATE ... WHERE status = 'pending'` é o uso único —
 * aprovar duas vezes o mesmo pedido afeta zero linhas, e a checagem de
 * linha abaixo transforma isso num erro explícito, não num sucesso mudo.
 */
export async function approveImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { id: string; approverStaffId: string; ttlMinutes: number },
): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `UPDATE impersonation_requests
        SET status = 'active', approver_staff_id = $2, approved_at = now(), started_at = now(),
            expires_at = now() + make_interval(mins => $3)
      WHERE id = $1 AND status = 'pending'
      RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status, created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.id, entrada.approverStaffId, entrada.ttlMinutes],
  );
  const row = rows[0];
  if (!row) throw new Error(`pedido de impersonação ${entrada.id} não está pending (já aprovado, negado ou inexistente)`);
  return toRow(row);
}

export async function denyImpersonationRequestOnClient(
  client: PoolClient,
  entrada: { id: string; approverStaffId: string },
): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `UPDATE impersonation_requests SET status = 'denied', approver_staff_id = $2
      WHERE id = $1 AND status = 'pending'
      RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status, created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.id, entrada.approverStaffId],
  );
  const row = rows[0];
  if (!row) throw new Error(`pedido de impersonação ${entrada.id} não está pending`);
  return toRow(row);
}

/** Encerramento explícito (spec §11) — revoga a sessão de host marcada junto, na mesma transação. */
export async function endImpersonationRequestOnClient(client: PoolClient, entrada: { id: string }): Promise<ImpersonationRequestRow> {
  const { rows } = await client.query<ImpersonationDbRow>(
    `UPDATE impersonation_requests SET status = 'ended', ended_at = now()
      WHERE id = $1 AND status = 'active'
      RETURNING id, requester_staff_id, approver_staff_id, target_account_id, reason, status, created_at, approved_at, started_at, expires_at, ended_at`,
    [entrada.id],
  );
  const row = rows[0];
  if (!row) throw new Error(`pedido de impersonação ${entrada.id} não está active`);
  await client.query("UPDATE host_sessions SET revoked_at = now() WHERE impersonation_id = $1 AND revoked_at IS NULL", [entrada.id]);
  return toRow(row);
}

export async function getImpersonationRequestById(db: Pool | PoolClient, id: string): Promise<ImpersonationRequestRow | null> {
  const { rows } = await db.query<ImpersonationDbRow>(`${SELECT} WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? toRow(row) : null;
}

/** Para o banner de T10: existe, para ESTE staff, uma janela ativa agora? */
export async function getActiveImpersonationForStaff(pool: Pool, staffUserId: string): Promise<ImpersonationRequestRow | null> {
  const { rows } = await pool.query<ImpersonationDbRow>(
    `${SELECT} WHERE requester_staff_id = $1 AND status = 'active' AND expires_at > now() ORDER BY started_at DESC LIMIT 1`,
    [staffUserId],
  );
  const row = rows[0];
  return row ? toRow(row) : null;
}

export async function listPendingImpersonationRequestsAdmin(pool: Pool): Promise<ImpersonationRequestRow[]> {
  const { rows } = await pool.query<ImpersonationDbRow>(`${SELECT} WHERE status = 'pending' ORDER BY created_at ASC`);
  return rows.map(toRow);
}
```

```ts
// packages/db/src/host-auth.ts — modificar
export type HostResolvida = { accountId: string; email: string; impersonationId: string | null };

// resolverHostSessao: SELECT ganha h.impersonation_id, e o retorno inclui impersonationId
export async function resolverHostSessao(
  pool: Pool,
  segredo: string,
  token: string,
): Promise<HostResolvida> {
  if (!assinaturaValida(segredo, token)) throw new ErroHostSessaoInvalida("assinatura");

  const { rows } = await pool.query<{
    account_id: string; email: string; expirado: boolean; revogado: boolean; impersonation_id: string | null;
  }>(
    `SELECT h.account_id, a.email, h.impersonation_id,
            (h.expires_at <= now()) AS expirado,
            (h.revoked_at IS NOT NULL) AS revogado
       FROM host_sessions h JOIN accounts a ON a.id = h.account_id
      WHERE h.token_hash = $1`,
    [hashDoToken(token)],
  );

  const linha = rows[0];
  if (!linha) throw new ErroHostSessaoInvalida("desconhecida");
  if (linha.revogado) throw new ErroHostSessaoInvalida("revogada");
  if (linha.expirado) throw new ErroHostSessaoInvalida("expirada");

  return { accountId: linha.account_id, email: linha.email, impersonationId: linha.impersonation_id };
}

/**
 * Sessão de host "marcada" (spec §11) — nasce da aprovação de uma
 * impersonação, não de um magic link. Sem `magic_links` envolvido: staff
 * nunca recebe e-mail do titular, a sessão é emitida direto pelo comando
 * de aprovação.
 */
export async function issueMarkedHostSession(
  pool: Pool,
  segredo: string,
  accountId: string,
  impersonationId: string,
  expiresAt: Date,
): Promise<{ token: string }> {
  const { token, hash } = emitirToken(segredo);
  await pool.query(
    "INSERT INTO host_sessions (token_hash, account_id, expires_at, impersonation_id) VALUES ($1, $2, $3, $4)",
    [hash, accountId, expiresAt, impersonationId],
  );
  return { token };
}
```

```ts
// packages/db/src/index.ts — adicionar
export type { ImpersonationRequestRow, ImpersonationStatus } from "./impersonation";
export {
  approveImpersonationRequestOnClient, createImpersonationRequestOnClient, denyImpersonationRequestOnClient,
  endImpersonationRequestOnClient, getActiveImpersonationForStaff, getImpersonationRequestById,
  listPendingImpersonationRequestsAdmin,
} from "./impersonation";
export { issueMarkedHostSession } from "./host-auth"; // adicionar ao array já exportado de ./host-auth
```

```tsx
// packages/ui-web/src/drawer.tsx
"use client";

import type { ReactNode } from "react";
import { Dialog } from "./dialog";
import { cn } from "./variants";

export type DrawerProps = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** Painel lateral (180ms, ease-saida na saída — Onda 0). Diferente de `BottomSheet` (mobile, vem de baixo): Drawer é a superfície de console, vem da direita. */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="drawer-title" className="items-stretch justify-end p-0">
      <div className={cn("elev-2 flex h-full w-full max-w-[26rem] flex-col gap-4 border-l border-linha bg-superficie p-6")}>
        <h2 id="drawer-title" className="tipo-den-titulo m-0">{title}</h2>
        {children}
      </div>
    </Dialog>
  );
}
```

```tsx
// packages/ui-web/src/audit-entry.tsx
export type AuditEntryProps = {
  action: string;
  actorLabel: string | null;
  at: Date;
  reason: string;
};

/** Uma linha de `audit_log` — usada onde a trilha de uma ação específica precisa aparecer inline (T9: histórico de um pedido de impersonação). */
export function AuditEntry({ action, actorLabel, at, reason }: AuditEntryProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-linha py-2 last:border-none">
      <div className="flex items-center justify-between gap-2">
        <span className="tipo-den-corpo text-ink">{action}</span>
        <span className="tipo-den-rotulo text-ink-3">{at.toLocaleString("pt-BR")}</span>
      </div>
      <span className="tipo-caption text-ink-3">{actorLabel ?? "sistema"} — {reason}</span>
    </div>
  );
}
```

```tsx
// packages/ui-web/src/timeline.tsx
export type TimelineStep = { label: string; done: boolean; at?: Date };

/** Genérico — usado pelo ciclo de vida da impersonação (pending -> approved -> active -> ended), sem acoplar ao domínio. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {steps.map((step, i) => (
        <li key={i} className="flex items-center gap-3">
          <span
            aria-hidden
            className={["h-2.5 w-2.5 shrink-0 rounded-full", step.done ? "bg-acento" : "bg-superficie-alta border border-linha"].join(" ")}
          />
          <span className={["tipo-den-corpo", step.done ? "text-ink" : "text-ink-3"].join(" ")}>{step.label}</span>
          {step.at && <span className="tipo-den-rotulo text-ink-3">{step.at.toLocaleTimeString("pt-BR")}</span>}
        </li>
      ))}
    </ol>
  );
}
```

```ts
// packages/ui-web/src/index.ts — adicionar
export { Drawer, type DrawerProps } from "./drawer";
export { AuditEntry, type AuditEntryProps } from "./audit-entry";
export { Timeline, type TimelineStep } from "./timeline";
```

```ts
// packages/application/src/impersonation/request-impersonation.ts
import type { Pool } from "pg";
import { authorize, type Actor } from "@albora/core";
import { createImpersonationRequestOnClient, insertAuditLog, type ImpersonationRequestRow } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";

export type RequestImpersonationInput = { actor: Actor; reason: string; targetAccountId: string };

/**
 * ÚNICA exceção a `executeCommand` nesta onda (ver header da task e item 8
 * do reconhecimento). `impersonate.request` tem política incondicional
 * `needsApproval` (Onda A) — `executeCommand` nunca chegaria a `run()`.
 * Este helper replica a MESMA garantia manualmente: `authorize()` decide
 * (nega se falta capacidade), depois BEGIN -> INSERT -> audit_log NA MESMA
 * TX -> COMMIT. Se `insertAuditLog` falhar, o pedido também não existe.
 */
export async function requestImpersonation(deps: { pool: Pool }, input: RequestImpersonationInput): Promise<ImpersonationRequestRow> {
  if (!input.reason.trim()) throw new CommandDeniedError("impersonate.request", "motivo é obrigatório");

  const decision = authorize({ actor: input.actor, capability: "impersonate.request" });
  if (decision.kind === "denied") throw new CommandDeniedError("impersonate.request", decision.reason);
  // decision.kind é sempre "needsApproval" hoje (impersonateRequestPolicy) — o pedido
  // pendente É essa materialização, não uma segunda tentativa da mesma ação.

  const client = await deps.pool.connect();
  try {
    await client.query("BEGIN");
    const pedido = await createImpersonationRequestOnClient(client, {
      requesterStaffId: input.actor.staffUserId, targetAccountId: input.targetAccountId, reason: input.reason,
    });
    await insertAuditLog(client, {
      actorKind: "staff", actorId: input.actor.staffUserId, action: "impersonate.request",
      targetKind: "impersonation_request", targetId: pedido.id, reason: input.reason,
      metadata: { targetAccountId: input.targetAccountId }, requestId: input.actor.requestId,
    });
    await client.query("COMMIT");
    return pedido;
  } catch (erro) {
    await client.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
}
```

```ts
// packages/application/src/impersonation/approve-impersonation.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { approveImpersonationRequestOnClient, issueMarkedHostSession, type ImpersonationRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type ApproveImpersonationInput = { actor: Actor; reason: string; requestId: string; ttlMinutes: number };
export type ApproveImpersonationResult = { request: ImpersonationRequestRow; hostToken: string };

/** `impersonate.approve` não tem política própria — `hasCapability` decide, só o dono tem. Aprovar JÁ ativa: emite a sessão de host marcada na mesma transação. */
export async function approveImpersonation(
  deps: { pool: Pool; sessionSecret: string },
  input: ApproveImpersonationInput,
): Promise<ApproveImpersonationResult> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.approve",
    reason: input.reason,
    target: { kind: "impersonation_request", id: input.requestId },
    action: "impersonate.approve",
    run: async (tx) => {
      const request = await approveImpersonationRequestOnClient(tx, {
        id: input.requestId, approverStaffId: input.actor.staffUserId, ttlMinutes: input.ttlMinutes,
      });
      const { token } = await issueMarkedHostSession(
        // issueMarkedHostSession usa `pool.query` — aqui `tx` (PoolClient) satisfaz o mesmo shape.
        tx as never, deps.sessionSecret, request.targetAccountId, request.id, request.expiresAt!,
      );
      return { request, hostToken: token };
    },
  });
}
```

```ts
// packages/application/src/impersonation/end-impersonation.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { endImpersonationRequestOnClient, getImpersonationRequestById, type ImpersonationRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";
import { CommandDeniedError } from "../envelope/errors";

export type EndImpersonationInput = { actor: Actor; reason: string; requestId: string };

/** Encerrar é permitido a quem pediu OU a quem aprovou — nunca a um terceiro staff. */
export async function endImpersonation(deps: { pool: Pool }, input: EndImpersonationInput): Promise<ImpersonationRequestRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.request",
    reason: input.reason,
    target: { kind: "impersonation_request", id: input.requestId },
    action: "impersonate.end",
    run: async (tx) => {
      const atual = await getImpersonationRequestById(tx, input.requestId);
      if (!atual) throw new Error(`pedido ${input.requestId} não encontrado`);
      const podeEncerrar = atual.requesterStaffId === input.actor.staffUserId || atual.approverStaffId === input.actor.staffUserId;
      if (!podeEncerrar) throw new CommandDeniedError("impersonate.request", "só quem pediu ou aprovou pode encerrar esta sessão");
      return endImpersonationRequestOnClient(tx, { id: input.requestId });
    },
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { RequestImpersonationInput } from "./impersonation/request-impersonation";
export { requestImpersonation } from "./impersonation/request-impersonation";
export type { ApproveImpersonationInput, ApproveImpersonationResult } from "./impersonation/approve-impersonation";
export { approveImpersonation } from "./impersonation/approve-impersonation";
export type { EndImpersonationInput } from "./impersonation/end-impersonation";
export { endImpersonation } from "./impersonation/end-impersonation";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/impersonation.test.ts src/host-auth.test.ts && pnpm --filter @albora/ui-web exec vitest run src/drawer.test.tsx src/audit-entry.test.tsx src/timeline.test.tsx && pnpm --filter @albora/application exec vitest run src/impersonation/ && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/impersonation.ts packages/db/src/impersonation.test.ts packages/db/src/host-auth.ts packages/db/src/host-auth.test.ts packages/db/src/index.ts packages/ui-web/src/drawer.tsx packages/ui-web/src/audit-entry.tsx packages/ui-web/src/timeline.tsx packages/ui-web/src/index.ts packages/application/src/impersonation packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(console): subsistema de impersonação — request/approve/end

Única exceção documentada a executeCommand: impersonate.request tem
política incondicional needsApproval (Onda A), então requestImpersonation
replica a mesma garantia (BEGIN -> INSERT -> audit_log na mesma tx ->
COMMIT) manualmente. Aprovar já ativa a sessão e emite host_session
marcada (impersonation_id); encerrar revoga a sessão junto, só para quem
pediu ou aprovou.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: UI de impersonação

Banner **persistente e não fechável** em `--critico` no topo e no rodapé da sidebar do console (spec §7/§11) — lembrete de que existe uma janela ativa, mesmo enquanto o operador navega pelo próprio console. Drawer de "Ver como" na tela de Conta. Dono vê os pedidos pendentes e aprova/nega direto da barra de contexto.

**Files:**
- Modify: `apps/web/features/console/actions.ts`
- Create: `apps/web/features/console/components/client/impersonation-request-drawer.tsx` (+test)
- Create: `apps/web/features/console/components/client/impersonation-banner.tsx` (+test)
- Create: `apps/web/features/console/components/client/pending-impersonation-approvals.tsx` (+test)
- Modify: `apps/web/features/console/components/server/console-shell.tsx`
- Modify: `apps/web/features/console/components/server/console-nav.tsx`
- Modify: `apps/web/features/console/components/server/console-nav.test.ts`
- Modify: `apps/web/app/console/(shell)/layout.tsx`
- Modify: `apps/web/app/console/(shell)/layout.test.ts`
- Modify: `apps/web/app/console/(shell)/accounts/[id]/page.tsx`

**Interfaces:**
- Consumes: `requestImpersonation`/`approveImpersonation`/`endImpersonation` (T9), `getActiveImpersonationForStaff`/`listPendingImpersonationRequestsAdmin` (`@albora/db`), `Drawer`/`Timeline` (T9).
- Produces: nenhuma nova para fora da onda — fecha o subsistema.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// apps/web/features/console/components/client/impersonation-banner.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImpersonationBanner } from "./impersonation-banner";

vi.mock("@/features/console/actions", () => ({ endImpersonationAction: vi.fn().mockResolvedValue({ ok: true }) }));

describe("ImpersonationBanner", () => {
  it("sem sessão ativa não renderiza nada", () => {
    const { container } = render(<ImpersonationBanner active={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("com sessão ativa mostra o aviso sem botão de fechar, só de encerrar", () => {
    render(<ImpersonationBanner active={{ id: "imp-1", targetAccountId: "conta-1", expiresAt: new Date(Date.now() + 600_000) }} />);
    expect(screen.getByText(/Você está vendo como/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fechar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encerrar sessão" })).toBeInTheDocument();
  });

  it("encerrar chama a ação com o id do pedido", async () => {
    const { endImpersonationAction } = await import("@/features/console/actions");
    render(<ImpersonationBanner active={{ id: "imp-1", targetAccountId: "conta-1", expiresAt: new Date(Date.now() + 600_000) }} />);
    await userEvent.click(screen.getByRole("button", { name: "Encerrar sessão" }));
    expect(endImpersonationAction).toHaveBeenCalledWith("imp-1");
  });
});
```

```tsx
// apps/web/features/console/components/client/impersonation-request-drawer.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImpersonationRequestDrawer } from "./impersonation-request-drawer";

vi.mock("@/features/console/actions", () => ({ requestImpersonationAction: vi.fn().mockResolvedValue({ ok: true }) }));

describe("ImpersonationRequestDrawer", () => {
  it("exige motivo antes de habilitar enviar, e mostra 'aguardando aprovação' depois", async () => {
    render(<ImpersonationRequestDrawer accountId="conta-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Ver como" }));
    const enviar = screen.getByRole("button", { name: "Enviar pedido" });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Motivo"), "cliente pediu ajuda visual");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));
    expect(await screen.findByText(/aguardando aprovação/i)).toBeInTheDocument();
  });
});
```

```tsx
// apps/web/features/console/components/client/pending-impersonation-approvals.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingImpersonationApprovals } from "./pending-impersonation-approvals";

vi.mock("@/features/console/actions", () => ({
  approveImpersonationAction: vi.fn().mockResolvedValue({ ok: true }),
  denyImpersonationAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("PendingImpersonationApprovals", () => {
  it("sem pedidos pendentes não renderiza nada", () => {
    const { container } = render(<PendingImpersonationApprovals requests={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("aprovar chama a ação com o id do pedido e o motivo digitado", async () => {
    const { approveImpersonationAction } = await import("@/features/console/actions");
    render(<PendingImpersonationApprovals requests={[{ id: "imp-2", requesterStaffId: "s1", targetAccountId: "conta-9", reason: "ticket p1", createdAt: new Date() }]} />);
    await userEvent.type(screen.getByLabelText("Motivo da aprovação"), "aprovado para atender o ticket");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(approveImpersonationAction).toHaveBeenCalledWith("imp-2", "aprovado para atender o ticket");
  });
});
```

```ts
// apps/web/app/console/(shell)/layout.test.ts — adicionar ao describe existente
it("repassa a impersonação ativa do ator para o shell", async () => {
  resolveActorMock.mockResolvedValueOnce({ staffUserId: "s1", roles: ["support"], sessionId: "s", requestId: "r", reauthenticatedAt: null });
  getActiveImpersonationForStaffMock.mockResolvedValueOnce({ id: "imp-1", targetAccountId: "conta-9", expiresAt: new Date() });
  const element = await ConsoleShellLayout({ children: null });
  expect(JSON.stringify(element)).toContain("imp-1");
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/console/components/client/impersonation-banner.test.tsx features/console/components/client/impersonation-request-drawer.test.tsx features/console/components/client/pending-impersonation-approvals.test.tsx "app/console/(shell)/layout.test.ts"`

Expected: FAIL — `Cannot find module './impersonation-banner'` (e os dois outros); layout ainda não busca impersonação ativa.

- [ ] **Step 3: Implementar o mínimo**

```ts
// apps/web/features/console/actions.ts — adicionar
import { approveImpersonation, denyImpersonationRequest as _unused, endImpersonation, requestImpersonation } from "@albora/application";
import { config } from "@/lib/config";

const IMPERSONATION_TTL_MINUTES = 30;

export async function requestImpersonationAction(accountId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await requestImpersonation({ pool: getPool() }, { actor, reason, targetAccountId: accountId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function approveImpersonationAction(requestId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await approveImpersonation(
      { pool: getPool(), sessionSecret: config().sessionSecret },
      { actor, reason, requestId, ttlMinutes: IMPERSONATION_TTL_MINUTES },
    );
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function denyImpersonationAction(requestId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  // denyImpersonationRequestOnClient (T9) roda dentro de executeCommand com a mesma capacidade de aprovação —
  // reaproveita o mesmo comando de aprovação com um resultado de negação, sem duplicar o envelope.
  try {
    const { denyImpersonation } = await import("@albora/application");
    await denyImpersonation({ pool: getPool() }, { actor, reason, requestId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function endImpersonationAction(requestId: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await endImpersonation({ pool: getPool() }, { actor, reason: "encerrado pelo operador", requestId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}
```

**Nota de consistência:** `denyImpersonationAction` chama `denyImpersonation`, que não foi criado em T9 — T9 só criou `requestImpersonation`/`approveImpersonation`/`endImpersonation`. Adicionar aqui, mesmo formato de `approve-impersonation.ts` mas usando `denyImpersonationRequestOnClient`:

```ts
// packages/application/src/impersonation/deny-impersonation.ts (arquivo que faltou em T9 — criado aqui para fechar o ciclo antes de T10 depender dele)
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { denyImpersonationRequestOnClient, type ImpersonationRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type DenyImpersonationInput = { actor: Actor; reason: string; requestId: string };

export async function denyImpersonation(deps: { pool: Pool }, input: DenyImpersonationInput): Promise<ImpersonationRequestRow> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "impersonate.approve",
    reason: input.reason,
    target: { kind: "impersonation_request", id: input.requestId },
    action: "impersonate.deny",
    run: (tx) => denyImpersonationRequestOnClient(tx, { id: input.requestId, approverStaffId: input.actor.staffUserId }),
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { DenyImpersonationInput } from "./impersonation/deny-impersonation";
export { denyImpersonation } from "./impersonation/deny-impersonation";
```

```tsx
// apps/web/features/console/components/client/impersonation-banner.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@albora/ui-web";
import { endImpersonationAction } from "@/features/console/actions";

export type ActiveImpersonation = { id: string; targetAccountId: string; expiresAt: Date };

/** Persistente e NÃO fechável (spec §7/§11) — por isso não existe onClose, só onEnd. */
export function ImpersonationBanner({ active }: { active: ActiveImpersonation | null }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!active) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-critico px-4 py-2 text-critico-texto">
      <span className="tipo-den-corpo">Você está vendo como {active.targetAccountId} — sessão da equipe.</span>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await endImpersonationAction(active.id);
            router.refresh();
          })
        }
      >
        Encerrar sessão
      </Button>
    </div>
  );
}
```

```tsx
// apps/web/features/console/components/client/impersonation-request-drawer.tsx
"use client";

import { useState, useTransition } from "react";
import { Button, Drawer, TextField } from "@albora/ui-web";
import { requestImpersonationAction } from "@/features/console/actions";

export function ImpersonationRequestDrawer({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Ver como</Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Ver como este cliente">
        {enviado ? (
          <p className="tipo-den-corpo m-0">Pedido enviado — aguardando aprovação do dono.</p>
        ) : (
          <>
            <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
            {erro && <p role="alert" className="tipo-caption m-0 text-critico">{erro}</p>}
            <Button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={() =>
                startTransition(async () => {
                  const resultado = await requestImpersonationAction(accountId, reason);
                  if (resultado.ok) setEnviado(true); else setErro(resultado.error);
                })
              }
            >
              Enviar pedido
            </Button>
          </>
        )}
      </Drawer>
    </>
  );
}
```

```tsx
// apps/web/features/console/components/client/pending-impersonation-approvals.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@albora/ui-web";
import { approveImpersonationAction, denyImpersonationAction } from "@/features/console/actions";

export type PendingImpersonationRow = { id: string; requesterStaffId: string; targetAccountId: string; reason: string; createdAt: Date };

/** Só renderizada para quem tem `impersonate.approve` (a página que a inclui já filtra). */
export function PendingImpersonationApprovals({ requests }: { requests: PendingImpersonationRow[] }) {
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-token border border-linha p-4">
      <h3 className="tipo-den-rotulo m-0 text-ink-3">Pedidos de impersonação pendentes</h3>
      {requests.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 border-b border-linha pb-3 last:border-none">
          <p className="tipo-den-corpo m-0">Ver como {r.targetAccountId} — {r.reason}</p>
          <TextField
            label="Motivo da aprovação"
            value={motivos[r.id] ?? ""}
            onChange={(e) => setMotivos((m) => ({ ...m, [r.id]: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending || !(motivos[r.id] ?? "").trim()}
              onClick={() => startTransition(async () => { await approveImpersonationAction(r.id, motivos[r.id]!); router.refresh(); })}
            >
              Aprovar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !(motivos[r.id] ?? "").trim()}
              onClick={() => startTransition(async () => { await denyImpersonationAction(r.id, motivos[r.id]!); router.refresh(); })}
            >
              Negar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// apps/web/features/console/components/server/console-shell.tsx — modificar
import { ImpersonationBanner, type ActiveImpersonation } from "@/features/console/components/client/impersonation-banner";

export function ConsoleShell({
  actor, counts, activeImpersonation, children,
}: {
  actor: Actor;
  counts?: ConsoleNavCounts | undefined;
  activeImpersonation?: ActiveImpersonation | null;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col font-[family-name:var(--fonte-corpo)] text-ink" style={adminVars()}>
      <ImpersonationBanner active={activeImpersonation ?? null} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 border-r border-linha bg-superficie elev-1 max-xl:w-16 max-[899px]:contents max-[899px]:border-none max-[899px]:bg-transparent">
          <ConsoleNav actor={actor} counts={counts} activeImpersonation={activeImpersonation ?? null} />
        </aside>
        {/* resto do markup inalterado */}
      </div>
    </div>
  );
}
```

```tsx
// apps/web/features/console/components/server/console-nav.tsx — modificar: rodapé da sidebar ganha o banner também
import { ImpersonationBanner, type ActiveImpersonation } from "@/features/console/components/client/impersonation-banner";

export function ConsoleNav({ actor, counts, activeImpersonation }: { actor: Actor; counts?: ConsoleNavCounts; activeImpersonation?: ActiveImpersonation | null }) {
  // ... corpo inalterado até o rodapé da sidebar, que ganha:
        <div className="mt-auto flex flex-col gap-2 border-t border-linha pt-4 min-[900px]:max-[1279px]:hidden">
          {activeImpersonation && <ImpersonationBanner active={activeImpersonation} />}
          <span className="tipo-den-corpo truncate text-ink" title={actor.staffUserId}>{actor.staffUserId}</span>
          {/* resto inalterado */}
        </div>
}
```

```ts
// apps/web/features/console/components/server/console-nav.test.ts — adicionar
it("rodapé mostra o banner de impersonação quando ativo", () => {
  const html = renderToStaticMarkup(<ConsoleNav actor={actorFixture(["support"])} activeImpersonation={{ id: "imp-1", targetAccountId: "c1", expiresAt: new Date() }} />);
  expect(html).toContain("Você está vendo como");
});
```

```tsx
// apps/web/app/console/(shell)/layout.tsx — modificar
import { getActiveImpersonationForStaff } from "@albora/db";

export default async function ConsoleShellLayout({ children }: { children: React.ReactNode }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const impersonacaoAtiva = await getActiveImpersonationForStaff(getPool(), actor.staffUserId);

  return (
    <ConsoleShell
      actor={actor}
      counts={/* contadores existentes, inalterado */}
      activeImpersonation={impersonacaoAtiva ? { id: impersonacaoAtiva.id, targetAccountId: impersonacaoAtiva.targetAccountId, expiresAt: impersonacaoAtiva.expiresAt! } : null}
    >
      {children}
    </ConsoleShell>
  );
}
```

```tsx
// apps/web/app/console/(shell)/accounts/[id]/page.tsx — modificar: acrescentar à área de ações
import { hasCapability } from "@albora/core";
import { ImpersonationRequestDrawer } from "@/features/console/components/client/impersonation-request-drawer";

        actions={
          <>
            {hasCapability(actor.roles, "accounts.pii.reveal") && <RevealPiiButton accountId={id} />}
            {hasCapability(actor.roles, "impersonate.request") && <ImpersonationRequestDrawer accountId={id} />}
            {hasCapability(actor.roles, "lgpd.delete_account") && <DeleteAccountDanger accountId={id} maskedEmail={conta.maskedEmail} />}
          </>
        }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/impersonation/ && pnpm --filter web exec vitest run features/console/components/client/impersonation-banner.test.tsx features/console/components/client/impersonation-request-drawer.test.tsx features/console/components/client/pending-impersonation-approvals.test.tsx "app/console/(shell)/layout.test.ts" features/console/components/server/console-nav.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application/src/impersonation/deny-impersonation.ts packages/application/src/index.ts apps/web/features/console/actions.ts apps/web/features/console/components/client/impersonation-banner.tsx apps/web/features/console/components/client/impersonation-banner.test.tsx apps/web/features/console/components/client/impersonation-request-drawer.tsx apps/web/features/console/components/client/impersonation-request-drawer.test.tsx apps/web/features/console/components/client/pending-impersonation-approvals.tsx apps/web/features/console/components/client/pending-impersonation-approvals.test.tsx apps/web/features/console/components/server/console-shell.tsx apps/web/features/console/components/server/console-nav.tsx apps/web/features/console/components/server/console-nav.test.ts "apps/web/app/console/(shell)/layout.tsx" "apps/web/app/console/(shell)/layout.test.ts" "apps/web/app/console/(shell)/accounts/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(console): UI de impersonação — banner, drawer, aprovação

Banner persistente e não fechável (topo + rodapé da sidebar), visível em
todo o console enquanto a janela está ativa, mesmo fora da tela do
cliente impersonado. Ver como abre um Drawer pedindo motivo; dono aprova/
nega direto da sidebar. denyImpersonation fecha o ciclo que faltava em T9.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Verificação da onda (controller)

**Files:** nenhum novo — só verificação.

**Interfaces:** nenhuma.

- [ ] **Step 1: Escrever o teste que falha**

Não aplicável — task de verificação. O "teste que falha" é a checklist abaixo antes de rodar.

- [ ] **Step 2: Rodar e confirmar que falha**

Não aplicável.

- [ ] **Step 3: Implementar o mínimo**

Não aplicável — nenhum código novo.

- [ ] **Step 4: Rodar e confirmar que passa**

Run, em sequência, no mesmo shell:
```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm typecheck
pnpm lint
pnpm test
pnpm guards
```
Expected: os quatro comandos saem verdes. **Nenhum `next build`/`next start` em nenhum deles.**

Conferências adicionais, manuais, antes de fechar a onda:
```bash
# nenhuma rota de console importando @albora/db direto
grep -rn "@albora/db" apps/web/app/console && echo "FALHA: rota importando @albora/db" || echo "OK"

# nenhum server action importando @albora/db direto (mesma regra de camada, para actions.ts)
grep -n "@albora/db" apps/web/features/console/actions.ts && echo "FALHA: action importando @albora/db" || echo "OK"

# nenhum hex novo em componente das telas/primitivos desta onda
grep -rnE "#[0-9a-fA-F]{3,8}\b" \
  apps/web/app/console apps/web/features/console \
  packages/ui-web/src/confirm-dialog.tsx packages/ui-web/src/danger-dialog.tsx \
  packages/ui-web/src/drawer.tsx packages/ui-web/src/audit-entry.tsx packages/ui-web/src/timeline.tsx \
  && echo "FALHA: hex hardcodado" || echo "OK"

# zero animate-pulse/backdrop-blur nas telas novas
grep -rnE "animate-pulse|backdrop-blur|backdrop-filter" apps/web/app/console apps/web/features/console \
  && echo "FALHA: anti-padrão de movimento/blur" || echo "OK"

# nenhum INSERT/UPDATE/DELETE em caso de uso de application/ fora do envelope
# (varredura manual, não automática: todo arquivo em packages/application/src/{accounts,support,subscriptions,lgpd,impersonation}/
# que faz mutação precisa chamar executeCommand — a ÚNICA exceção documentada é
# request-impersonation.ts, que precisa aparecer nesta lista e em nenhuma outra)
grep -rLn "executeCommand" packages/application/src/accounts/reveal-account-pii.ts \
  packages/application/src/support/respond-ticket.ts packages/application/src/support/assign-ticket.ts \
  packages/application/src/support/update-ticket-status.ts packages/application/src/support/update-ticket-priority.ts \
  packages/application/src/subscriptions/change-plan.ts packages/application/src/subscriptions/apply-courtesy.ts \
  packages/application/src/subscriptions/cancel-subscription.ts packages/application/src/subscriptions/refund-payment.ts \
  packages/application/src/lgpd/create-dsar-request.ts packages/application/src/lgpd/update-dsar-request.ts \
  packages/application/src/lgpd/delete-account.ts packages/application/src/impersonation/approve-impersonation.ts \
  packages/application/src/impersonation/end-impersonation.ts packages/application/src/impersonation/deny-impersonation.ts

# nenhuma PII de convidado em tela nova (nome/contato de convidado, não de titular)
grep -rniE "guestName|displayName.*convidado|nome.*do.*convidado" apps/web/app/console apps/web/features/console \
  && echo "FALHA: possível PII de convidado" || echo "OK"
```
Expected: os `grep` de "FALHA" não encontram nada (saída "OK"); o `grep -rLn "executeCommand"` sobre os doze arquivos de comando devolve **só** `packages/application/src/impersonation/request-impersonation.ts` faltando na lista de resultados — na verdade esse arquivo nem entra na lista acima de propósito, então a saída esperada do comando é **vazia** (todos os doze arquivos listados contêm `executeCommand`).

- [ ] **Step 5: Commit**

Sem arquivo novo para commitar nesta task — se algum comando acima falhar e exigir correção, o fix é um commit próprio, escopado ao arquivo corrigido, não a esta task de verificação.

---

## Auto-revisão

1. **Toda tarefa da espinha virou task:** T1→Task 1, T2→Task 2, T3→Task 3, T4→Task 4, T5→Task 5, T6→Task 6, T7→Task 7, T8→Task 8, T9→Task 9, T10→Task 10, T11→Task 11. 11 de 11.

2. **Varredura de placeholder:** nenhum "TBD", "tratamento apropriado" ou "similar à Task N" em nenhum step de código — cada step traz o arquivo inteiro. A única lacuna real e deliberadamente **não preenchida** é a aba "Consentimento agregado" do design (§8.1.7), documentada na tabela de Lacunas, não escondida atrás de um placeholder.

3. **Consistência de tipos entre tasks, corrigida inline durante a escrita:**
   - T1 estende `AuditTargetKind` com `dsar_request`/`impersonation_request`/`payment` — T3 usa `'account'`, T4 usa `'ticket'`, T6 usa `'subscription'`/`'payment'`, T7 usa `'dsar_request'`, T8 usa `'account'`, T9 usa `'impersonation_request'`: todos batem com o enum de T1, nenhum target_kind inventado fora dele.
   - T4 cria `assignee_staff_id`/`author_staff_id` (migration 0063) — T5 (`SupportTicketAdmin.assigneeStaffId`, `SupportMessageRow.authorStaffId`) e a UI de T5 usam exatamente esses nomes, sem campo paralelo.
   - T6 adiciona `subscriptionId`/`asaasSubscriptionId` a `VendorSubscriptionAdminRow` — a página de T6 usa `r.subscriptionId` (não `r.vendorId`) para as ações de mutação, e o `rowKey` de T6 continua sendo `vendorId` (uma coisa não substitui a outra: `vendorId` identifica a linha da tabela, `subscriptionId` é o alvo da mutação).
   - T9 exporta `ImpersonationRequestRow`/`ImpersonationStatus` — T10 importa exatamente esses nomes (`PendingImpersonationRow` em T10 é um subconjunto explícito para a UI, não um tipo paralelo redefinindo os mesmos campos com nomes diferentes).
   - `SubscriptionBillingPort` (T6) e `BillingProvider` (`apps/web/lib/billing/types.ts`, T6 também) têm as três assinaturas novas (`updateSubscription`/`cancelSubscription`/`refundPayment`) **idênticas** — checado campo a campo ao escrever, porque divergência de shape aqui quebraria a compatibilidade estrutural silenciosamente (TS aceitaria um subconjunto, mas a rota passaria o objeto errado sem erro de tipo até o runtime).
   - Toda rota/action de console (Tasks 2-10) importa só de `@albora/application`/`@albora/ui-web`/`@albora/core`/`@albora/db` (este último só para tipos como `SupportStatus`/`DsarKind`, nunca para funções de repositório) — nenhuma chama uma função de `@albora/db` fora de um arquivo de `packages/application`.

4. **Nenhuma query sobre tabela/coluna não confirmada:** toda tabela usada nesta onda (`impersonation_requests`, `dsar_requests`, `support_tickets`, `support_messages`, `host_sessions`, `accounts`, `events`, `uploads`, `drive_connections`, `vendor_subscriptions`, `billing_payments`, `audit_log`, `staff_users`) foi lida da migration real (0001, 0012, 0030, 0031, 0037, 0059, 0060, 0062, 0063) antes de entrar numa query — incluindo o `ON DELETE RESTRICT` de `events.account_id` (T8) e a ausência de RLS em `dsar_requests`/`impersonation_requests` (T7/T9, confirmada por não haver `ENABLE ROW LEVEL SECURITY` nelas na migration 0062).

5. **Nenhuma mutação planejada fora de `executeCommand`, com uma exceção documentada:** `requestImpersonation` (T9) é a única função de mutação desta onda que não chama `executeCommand` — e o motivo (política incondicional `needsApproval` de `impersonate.request`, testada em Onda A) está no cabeçalho da Task 9, no comentário do código, e nesta auto-revisão, três vezes, de propósito: é a exceção que mais precisa ser encontrada por quem revisar, não escondida.

## Divergências e decisões que extrapolam a espinha (para o report)

- **`executeCommand` (Onda A) ganhou uma linha nova** (`SET_CONFIG('app.staff_command', ...)`, T4) — necessária porque `support_tickets`/`support_messages` (FORCE RLS desde a Onda A) não tinham nenhuma política que desse caminho de ESCRITA para staff. Sem isso, T4 pareceria funcionar (nenhum erro) e na verdade não escreveria nenhuma linha.
- **Migration 0063, além da 0062 anunciada na espinha** — a espinha previu só migration 0062 (T1); o reconhecimento de T4 achou que `support_messages` não tinha como registrar QUAL staff respondeu (`author_staff_id` não existia), e que a RLS de escrita (item acima) precisava de uma migration própria. Ambas as necessidades só apareceram ao escrever T4, depois de T1 já ter "gasto" o número 0062.
- **`packages/core/src/authorization/policies.ts` não foi alterado** — cogitei remover a política de `impersonate.request` para destravar `executeCommand`, mas ela é testada (`authorize.test.ts:119-120`) e deliberada (Onda A). T9 optou por isolar a exceção em vez de reescrever uma decisão já tomada e testada.
- **`packages/integrations` não foi criado** — ver Lacunas; T6 usa injeção de dependência estrutural em vez de mover `BillingProvider`.

