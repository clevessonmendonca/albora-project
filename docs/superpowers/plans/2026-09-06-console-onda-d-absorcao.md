# Console Interno — Onda D (Absorção do `/ops` e fechamento) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o console interno absorvendo de vez o `/ops` antigo — redirecionar suas rotas, aposentar a policy RLS `ops_ticket_lista` e a dependência de `platform_operators` que a sustentava, migrar a auditoria de agregação do portal do fornecedor de `console.log` para `audit_log`, entregar o `CommandPalette` (⌘K) e fechar a dívida da Onda C de UI de troca de plano e reembolso. Nenhuma arquitetura nova: esta onda consome os envelopes, primitivos e casos de uso que as Ondas A/B/C já entregaram.

**Architecture:** Mesma espinha das Ondas A/B/C: `apps/web/app/console/(shell)/<rota>/page.tsx` (RSC) resolve o ator e chama um caso de uso de `packages/application`; toda mutação passa por `executeCommand({actor, capability, reason, target, action, context, run})`; leitura cross-tenant passa por `withPlatformAggregation`/`executeQuery`. Rota e server action nunca importam `@albora/db` como valor.

**Tech Stack:** TypeScript (`exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`), pnpm workspaces, Next.js 15 (App Router, RSC + Server Actions), PostgreSQL via `pg` com RLS forçado, Vitest (`node`/`jsdom`), Node 22, React 19, `@testing-library/react`.

**Spec:** docs/superpowers/specs/2026-09-04-console-interno-design.md (§8 decisão de migração da fila, §12 estrutura/onda D, §14 ondas de entrega)
**Design:** docs/superpowers/specs/2026-09-04-console-design-visual.md (§7 navegação/busca, §12 primitivos por onda)
**ADR:** docs/adr/0016-camadas-do-console-interno.md

## Global Constraints

- Worktree `/Users/clevesson-mendonca/orca/workspaces/albora-project/ceo-backoffice`, branch `feat/ceo-backoffice`. NUNCA tocar em `merganser`. Sem `git stash`.
- `TEST_DATABASE_URL=postgres://albora:albora@localhost:55432/albora_console`. Container `albora-pg` **compartilhado**: nunca `docker rm`, `docker compose down` nem `db:down`. Se cair, `docker start albora-pg`.
- **Runner correto:** `packages/db` e `packages/application` só rodam por `vitest.isolamento.config.ts`:
  `TEST_DATABASE_URL=... pnpm exec vitest run --config vitest.isolamento.config.ts <caminho>`
  `apps/web` roda pela config principal.
- `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `pnpm` E do `git commit`.
- **Nenhuma task roda `next build` ou `next start`.**
- Símbolo novo em inglês (ADR 0014); comentário em português.
- Migrations forward-only; próximo número livre: **0064**.
- `pnpm guards` (9) + `pnpm typecheck` limpos antes de cada commit.
- Conventional Commits, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## ARQUIVO INTOCÁVEL NESTA ONDA

**`packages/db/src/retention-jobs.ts`** está sendo modificado por outra sessão (task de sanitizar `last_error` na escrita). Nenhuma task deste plano toca nele. Nenhuma task precisou dele no reconhecimento — LGPD/retenção já foram fechadas na Onda C; esta onda não mexe em retenção.

## Contrato de camada — vale para TODA task desta onda

```
apps/web/app/console/(shell)/<rota>/page.tsx        RSC: resolveActor() -> chama caso de uso -> renderiza
apps/web/features/console/actions.ts                 "use server" — chama caso de uso, nunca @albora/db
packages/application/src/<dominio>/<comando>.ts       executeCommand({...}) ou executeQuery/withPlatformAggregation
packages/db/src/<tabela>-admin.ts                     repositório, recebe PoolClient/Pool
```

- Rota e Server Action **nunca** importam `@albora/db` como valor — guard `camadas` reprova. Só `@albora/application` (e `import type` de `@albora/db`, quando necessário para tipos).
- **Toda mutação passa por `executeCommand`.** Nenhuma exceção nesta onda — T3 (auditoria do portal) é escrita em `audit_log`, não em dado de negócio, e roda fora de `executeCommand` pelo mesmo motivo que já vale hoje: o ator não é staff (ver Reconhecimento, item 7).
- Nenhum `role ===` fora de `packages/core/src/authorization/`.
- Zero hex, zero `style` inline, zero `animate-pulse`/`backdrop-blur`, alvo ≥44px.
- Zero PII de convidado em qualquer tela.

## Reconhecimento — divergências e achados que mudam a execução

1. **`/ops/e/[slug]/painel/page.tsx` não está na lista de rotas da espinha.** A espinha do T1 lista cinco arquivos (`page`, `support/page`, `insights/page`, `events/page`, `e/[slug]/page`) e esquece o painel completo do evento (`apps/web/app/ops/e/[slug]/painel/page.tsx`), que também só existe sob `isPlatformOperator`. T1 redireciona os seis, não cinco.
2. **`/ops/e/:slug` e `/ops/e/:slug/painel` não têm equivalente por slug em `/console`.** `apps/web/app/console/(shell)/events/[id]/page.tsx` navega por `id` (uuid), não por `slug` — não existe rota `/console/events/by-slug/:slug` nem resolução de slug→id fora do `event_slugs` cru. Inventar essa resolução só para o redirect seria arquitetura nova sem pedido. Os dois redirecionam para `/console/events` (a lista), a rota mais próxima que existe de verdade — achado registrado, não uma tela inventada.
3. **`apps/web/app/api/ops/support/route.ts` é um endpoint morto.** Depende de `isPlatformOperator`/`listOpenSupportTicketsAdmin`, mas **nenhum código no repositório o chama** (grep por `/api/ops/support` só acha a própria definição da rota). Não é uma página — redirect de rota HTML não se aplica a um endpoint JSON. T2 remove o arquivo junto com as páginas de `/ops`, pela mesma razão que elas saem: dependência de `platform_operators` sem sujeito.
4. **`apps/web/app/api/ops/retencao/route.ts` NÃO faz parte do `/ops` que esta onda absorve.** Apesar do prefixo de caminho `/api/ops/`, é o endpoint que `.github/workflows/retention-cron.yml` chama todo dia às 4h (`curl -X POST $APP_URL/api/ops/retencao`, com `CRON_SECRET`) — job de produção do ciclo de retenção LGPD (d330/d365). Não lê `platform_operators`, não usa `isPlatformOperator`, não é uma tela. **T1 e T2 não tocam neste arquivo.** Achado crítico do reconhecimento: o prefixo de caminho é coincidência, não parentesco.
5. **Achado avulso, fora do escopo desta onda:** `.github/workflows/analytics-snapshots-cron.yml` chama `POST /api/ops/analytics-snapshots` todo dia às 5h, mas `apps/web/app/api/ops/analytics-snapshots/route.ts` **não existe** no repositório — esse cron de produção provavelmente falha hoje, silenciosamente (só `curl -sf`, sem alerta configurado aqui). Não é `/ops` UI, não usa `platform_operators`; não é tarefa desta onda. Registrado para visibilidade, não corrigido aqui.
6. **`platform_operators` (a tabela) tinha, antes desta onda, exatamente oito consumidores de código**, confirmados por `grep -rn "platform_operators"` e `grep -rn "isPlatformOperator"`: a função `isPlatformOperator` (`packages/db/src/support.ts`), seu re-export (`packages/db/src/index.ts`), e seis chamadores (`apps/web/app/ops/{page,support/page,insights/page,events/page,e/[slug]/page,e/[slug]/painel/page}.tsx`) mais `apps/web/app/api/ops/support/route.ts`. T2 remove os seis arquivos de `/ops` + a rota de API morta + a função `isPlatformOperator` e seu export. **Depois disso, nada em código lê a tabela** — mas a espinha veta derrubá-la nesta migration mesmo assim: ela e sua própria policy de leitura (`conta_operator`) continuam de pé, forward-only, até uma decisão explícita e futura.
7. **`withPlatformAggregation` não serve para o portal do fornecedor.** Sua assinatura exige `actor: Actor` (`packages/core`) — `{staffUserId, roles: StaffRole[], ...}`. Todo chamador de `auditarAgregacaoDoPortal` (`load-vendor-portal.ts`, `admin/vendor/insights/page.tsx`, `lib/api/handlers/admin-vendor.ts`) resolve a sessão via `hostFromToken`/`accounts` — um **membro de fornecedor**, nunca staff. Forçar um `Actor` sintético ali quebraria a garantia de que `actorKind: 'staff'` em `audit_log` significa staff de verdade. T3 usa `insertAuditLog` (`@albora/db`) direto, com `actorKind: 'host'` — valor já aceito pelo CHECK de `audit_log.actor_kind` desde a migration 0060, criado exatamente para isto.
8. **A auditoria do portal fica fire-and-forget, não pré-condição.** `comAgregacao` (`packages/db/src/event.ts:70-93`) chama seu parâmetro `auditar: (registro) => void` de forma **síncrona**, sem `await`, e sem passar nenhum `PoolClient` para ele — é um hook de efeito colateral, não um ponto de escrita transacional. Mudar essa assinatura para aceitar um cliente/promise afetaria as outras cinco funções que a chamam (`marcaPublicaDoFornecedor`, `eventosDoFornecedor`, `resumoDoFornecedor`, `criarFornecedor`, `ativarPlanoDoFornecedor`) — refactor de primitivo compartilhado, fora do escopo desta task. T3 grava de verdade (não mais só `console.log`), mas com o mesmo padrão de melhor esforço que `insertSecurityEvent` já usa: tenta, e se falhar, só loga — nunca derruba a leitura do portal. Isto é uma exceção real e documentada ao "auditoria é pré-condição" do ADR 0016 §2 — aquela regra vale para `executeCommand`/`withPlatformAggregation` (mutação e agregação de **staff**); ler o próprio agregado pelo portal é um risco bem menor, e nunca teve essa garantia mesmo antes desta task.
9. **`refundPayment` nunca lança `ApprovalRequiredError`**, ao contrário do texto da espinha ("acima do limiar, `finance` recebe `ApprovalRequiredError`"). O comando (`packages/application/src/subscriptions/refund-payment.ts:15-30`, comentário já existente no código) **troca a capacidade verificada** — `subscription.refund.approve` em vez de `subscription.refund` acima de `REFUND_APPROVAL_THRESHOLD_CENTS` — e `authorize()` devolve `denied` (não `needsApproval`) porque `finance` simplesmente não tem essa capacidade (`packages/core/src/authorization/roles.ts`: `finance` não lista `subscription.refund.approve`). O erro real é `CommandDeniedError("ator sem a capacidade subscription.refund.approve")`. T5 usa o **texto** do erro para decidir a mensagem amigável, não o tipo — `traduzErroDeComando` (`apps/web/features/console/actions.ts:182-186`) nem trata `ApprovalRequiredError`, e não precisa: esse tipo nunca chega até aqui por este caminho.
10. **Não existe seletor de pagamento por fornecedor.** `BillingPaymentSummaryAdmin` (`packages/db/src/billing.ts:232-238`) não expõe `asaas_payment_id`, e `listBillingPaymentsForAccountAdmin` busca por `accountId` (usada hoje só no contexto do cliente na mesa de suporte), não por `vendorId`. T5 não lista pagamentos para escolher — o operador digita as duas referências (`paymentId` local + `asaasPaymentId`) diretamente, exatamente o que a espinha pede ("referência ao pagamento + valor em centavos"), sem inventar uma consulta que a base não sustenta ainda.
11. **`VENDOR_PLAN_PRICE_CENTS` é duplicado de propósito**, já documentado nos dois lados (`apps/web/lib/billing/types.ts:103`, `packages/application/src/analytics/revenue.ts:14`, comentários citando um ao outro — mesmo padrão do rate-limiter da Onda A). T5 usa a cópia de `@albora/application` (já importada como valor em `subscriptions/page.tsx`), sem tentar unificar as duas — fora do escopo, não pedido pela espinha.
12. **Não existe busca textual em `support_tickets`.** `listSupportTicketsQueueAdmin` (`packages/db/src/support.ts:319-356`) só filtra por `statuses`/`assigneeStaffId`/`limit` — nenhuma coluna de busca por assunto ou conta. O `CommandPalette` (T4) resolve ticket só por **id exato** (uuid) quando o ator tem `tickets.read`; buscar pelo assunto não encontra nada. Registrado, não inventada uma coluna nova.
13. **`console-shell.tsx` já imprime `⌘K` dentro do campo de busca desde a Onda A (T14)**, mas o campo é um `<input>` estático sem `onKeyDown`, sem estado, sem resultado — é o placeholder que T4 substitui.

## Lacunas encontradas no reconhecimento

| Lacuna | O que falta | O que a task faz |
|---|---|---|
| `/ops/e/[slug]/painel` fora da lista da espinha | T1 da espinha lista 5 rotas, não 6 | T1 redireciona as 6, registrado aqui |
| `/ops/e/:slug(/painel)` sem equivalente por slug em `/console` | `/console/events/[id]` navega por id, não slug | Redireciona para `/console/events` (lista), não inventa resolução de slug |
| `/api/ops/support` é endpoint morto | Nenhum chamador no código | T2 remove junto com as páginas — mesma dependência de `platform_operators` |
| `/api/ops/retencao` e `/api/ops/analytics-snapshots` parecem parte do `/ops`, mas não são | São cron de produção (`retention-cron.yml`), sem relação com `platform_operators`/telas | **T1/T2 não tocam** — achado crítico registrado |
| `analytics-snapshots-cron.yml` chama uma rota que não existe | `apps/web/app/api/ops/analytics-snapshots/route.ts` ausente | Fora do escopo; registrado como achado avulso |
| `withPlatformAggregation` não serve ao portal do fornecedor | Exige `Actor` de staff; portal é `accounts`/`vendor_members` | T3 usa `insertAuditLog` direto, `actorKind: 'host'` |
| `comAgregacao` não dá cliente de banco ao `auditar` | Callback síncrono/void, sem `PoolClient` | T3 fica fire-and-forget (como `insertSecurityEvent`), documentado como exceção ao ADR 0016 §2 |
| Espinha descreve `ApprovalRequiredError` para reembolso acima do limiar | Código real troca a capacidade e lança `CommandDeniedError` | T5 usa o texto do erro, não o tipo |
| Sem seletor de pagamento por fornecedor | `BillingPaymentSummaryAdmin` não tem `asaas_payment_id`; sem query por vendor | T5 pede as duas referências como texto livre |
| `VENDOR_PLAN_PRICE_CENTS` duplicado | Já documentado nos dois lados | T5 usa a cópia de `@albora/application`, sem unificar |
| Sem busca textual em `support_tickets` | Só filtra por status/assignee | `CommandPalette` resolve ticket só por id exato |

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/lib/redirects/ops-to-console.ts` | `OPS_TO_CONSOLE_REDIRECTS` — as 6 rotas de `/ops` e seu destino em `/console` |
| `apps/web/lib/redirects/ops-to-console.test.ts` | Prova as 6 entradas e que todas são permanentes |
| `apps/web/next.config.ts` | Modificado: espalha `OPS_TO_CONSOLE_REDIRECTS` no array de `redirects()` |
| `packages/db/migrations/0064_aposentar_ops_ticket_lista.sql` | `DROP POLICY ops_ticket_lista` — não derruba `platform_operators` |
| `packages/db/src/ops-retirada-schema.test.ts` | Prova que a policy sumiu e que a tabela/policy própria continuam |
| `packages/db/src/support.ts` | Modificado: remove `isPlatformOperator` |
| `packages/db/src/index.ts` | Modificado: remove o export de `isPlatformOperator` |
| `apps/web/app/ops/**` (7 arquivos) | Removidos — telas antigas absorvidas pelo `/console` |
| `apps/web/app/api/ops/support/route.ts` | Removido — endpoint morto, mesma dependência |
| `apps/web/features/vendor-portal/lib/audit.ts` | Modificado: `auditarAgregacaoDoPortal` grava em `audit_log` de verdade |
| `apps/web/features/vendor-portal/lib/audit.test.ts` | Prova a escrita e o fire-and-forget em falha |
| `apps/web/features/vendor-portal/data/load-vendor-portal.ts` | Modificado: os dois call sites passam a fábrica `auditarAgregacaoDoPortal(pool, actorId)` |
| `apps/web/app/admin/vendor/insights/page.tsx` | Modificado: idem |
| `apps/web/lib/api/handlers/admin-vendor.ts` | Modificado: idem |
| `apps/web/lib/api/handlers/admin-vendor.test.ts` | Modificado: mock de `auditarAgregacaoDoPortal` vira fábrica |
| `packages/application/src/search/search-console.ts` | `searchConsole` — busca de conta/evento/ticket por capacidade |
| `packages/application/src/search/search-console.test.ts` | Prova o gate por capacidade e os três tipos de resultado |
| `packages/application/src/index.ts` | Modificado: exporta `searchConsole` e tipos |
| `packages/ui-web/src/command-palette.tsx` | `CommandPalette` — primitivo da Onda D |
| `packages/ui-web/src/command-palette.test.tsx` | Prova resultados, seleção, vazio, digitação |
| `packages/ui-web/src/index.ts` | Modificado: exporta `CommandPalette` |
| `apps/web/features/console/actions.ts` | Modificado: `searchConsoleAction` |
| `apps/web/features/console/components/client/console-search.tsx` | Substitui o `<input>` estático — ⌘K de verdade |
| `apps/web/features/console/components/client/console-search.test.tsx` | Prova o atalho, a busca e a navegação ao selecionar |
| `apps/web/features/console/components/server/console-shell.tsx` | Modificado: usa `<ConsoleSearch />` no lugar do input estático |
| `apps/web/features/console/components/client/subscription-actions.tsx` | Modificado: ganha "Trocar plano" e "Reembolsar" |
| `apps/web/features/console/components/client/subscription-actions.test.tsx` | Modificado: prova as duas mutações novas |
| `apps/web/app/console/(shell)/subscriptions/page.tsx` | Modificado: passa `priceTable` para `SubscriptionActions` |

---

### Task 1: Absorver `/ops` — redirecionar, não remover

**Files:**
- Create: `apps/web/lib/redirects/ops-to-console.ts`
- Create: `apps/web/lib/redirects/ops-to-console.test.ts`
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Produces: `OPS_TO_CONSOLE_REDIRECTS` (`RedirecionamentoPermanente[]`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/lib/redirects/ops-to-console.test.ts
import { describe, expect, it } from "vitest";
import { OPS_TO_CONSOLE_REDIRECTS } from "./ops-to-console";

describe("OPS_TO_CONSOLE_REDIRECTS", () => {
  it("tem as seis rotas de página do /ops antigo, e nenhuma outra", () => {
    expect(OPS_TO_CONSOLE_REDIRECTS).toHaveLength(6);
  });

  it("redireciona pra o equivalente direto em /console", () => {
    const porOrigem = Object.fromEntries(OPS_TO_CONSOLE_REDIRECTS.map((r) => [r.source, r]));
    expect(porOrigem["/ops"]?.destination).toBe("/console");
    expect(porOrigem["/ops/insights"]?.destination).toBe("/console");
    expect(porOrigem["/ops/support"]?.destination).toBe("/console/support");
    expect(porOrigem["/ops/events"]?.destination).toBe("/console/events");
  });

  it("rotas por slug (sem equivalente em /console, que navega por id) vão pra lista de eventos, não pra uma tela inventada", () => {
    const porOrigem = Object.fromEntries(OPS_TO_CONSOLE_REDIRECTS.map((r) => [r.source, r]));
    expect(porOrigem["/ops/e/:slug"]?.destination).toBe("/console/events");
    expect(porOrigem["/ops/e/:slug/painel"]?.destination).toBe("/console/events");
  });

  it("todas são permanentes — bookmark antigo aprende o caminho novo, não fica preso num redirect temporário", () => {
    for (const r of OPS_TO_CONSOLE_REDIRECTS) expect(r.permanent).toBe(true);
  });

  it("nenhuma origem repete a de /api/ops/retencao ou /api/ops/analytics-snapshots — esses são cron de produção, não telas de /ops", () => {
    const origens = OPS_TO_CONSOLE_REDIRECTS.map((r) => r.source);
    expect(origens).not.toContain("/api/ops/retencao");
    expect(origens).not.toContain("/api/ops/analytics-snapshots");
    expect(origens).not.toContain("/api/ops/support");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run lib/redirects/ops-to-console.test.ts`

Expected: FAIL — `Cannot find module './ops-to-console'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// apps/web/lib/redirects/ops-to-console.ts
export type RedirecionamentoPermanente = { source: string; destination: string; permanent: true };

/**
 * Onda D, T1 — `/ops` (só-leitura, sem mutação) fica redirecionado pro
 * `/console` equivalente. Redirect aqui, NUNCA remoção de arquivo: os
 * `page.tsx` de `apps/web/app/ops/**` continuam no repositório até a T2,
 * que só pode removê-los DEPOIS da migration 0064 derrubar
 * `ops_ticket_lista` — senão um deploy intermediário fica com rota morta
 * (redirecionada, nunca mais alcançável) e policy viva ao mesmo tempo, sem
 * ordem de dependência entre os dois. O redirect roda em `next.config.ts`,
 * ANTES de qualquer `page.tsx` ser resolvido — os seis destinos abaixo já
 * ficam inalcançáveis a partir desta task, mesmo com os arquivos ainda ali.
 *
 * `/ops/e/:slug` e `/ops/e/:slug/painel` não têm equivalente por slug em
 * `/console` (que navega por `id` — ver
 * `apps/web/app/console/(shell)/events/[id]/page.tsx`). Em vez de inventar
 * uma tela ou uma resolução de slug→id só para o redirect, os dois vão
 * para a lista `/console/events` — a mais próxima que existe de verdade.
 * Achado de reconhecimento da Onda D, registrado no plano.
 *
 * `/api/ops/retencao` e `/api/ops/analytics-snapshots` NÃO entram aqui —
 * são endpoints de cron de produção (`.github/workflows/retention-cron.yml`
 * chama o primeiro todo dia às 4h), sem relação com `platform_operators`
 * nem com as telas de `/ops`. O prefixo de caminho é coincidência.
 */
export const OPS_TO_CONSOLE_REDIRECTS: RedirecionamentoPermanente[] = [
  { source: "/ops", destination: "/console", permanent: true },
  { source: "/ops/insights", destination: "/console", permanent: true },
  { source: "/ops/support", destination: "/console/support", permanent: true },
  { source: "/ops/events", destination: "/console/events", permanent: true },
  { source: "/ops/e/:slug", destination: "/console/events", permanent: true },
  { source: "/ops/e/:slug/painel", destination: "/console/events", permanent: true },
];
```

```ts
// apps/web/next.config.ts — adicionar o import no topo
import { OPS_TO_CONSOLE_REDIRECTS } from "./lib/redirects/ops-to-console";
```

```ts
// apps/web/next.config.ts — dentro de async redirects(), no início do array retornado
    return [
      { source: "/album", destination: "/scan", permanent: true },
      { source: "/privacy", destination: "/privacidade", permanent: true },
      ...OPS_TO_CONSOLE_REDIRECTS,
      ...rootPtToEn.map(([pt, en]) => ({
        source: `/${pt}`,
        destination: `/${en}`,
        permanent: true,
      })),
```

(o restante do array — `guestPtToEn`, `adminPtToEn`, `adminEventSectionsPtToEn` — continua exatamente como está; só a linha `...OPS_TO_CONSOLE_REDIRECTS,` é nova, logo depois de `/privacy`.)

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run lib/redirects/ops-to-console.test.ts && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/lib/redirects/ops-to-console.ts apps/web/lib/redirects/ops-to-console.test.ts apps/web/next.config.ts
git commit -m "$(cat <<'EOF'
feat(console): redirecionar /ops pro /console equivalente

As seis rotas de página de /ops (leitura, sem mutação) redirecionam
permanentemente pro /console que as substitui — via next.config.ts
redirects(), antes de qualquer page.tsx ser resolvido. As duas rotas por
slug (/ops/e/:slug e /painel) não têm equivalente por slug em /console
(que navega por id) e vão pra lista /console/events, não pra uma tela
inventada. Redirect, não remoção de arquivo: os page.tsx de apps/web/app/ops
continuam no repositório até a T2, que só pode removê-los depois da
migration que aposenta ops_ticket_lista — senão um deploy intermediário
fica com rota morta e policy viva ao mesmo tempo.

/api/ops/retencao e /api/ops/analytics-snapshots ficam de fora: são cron
de produção, não telas de /ops, apesar do prefixo de caminho coincidir.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Aposentar `ops_ticket_lista` e a dependência de `platform_operators`

**Files:**
- Create: `packages/db/migrations/0064_aposentar_ops_ticket_lista.sql`
- Create: `packages/db/src/ops-retirada-schema.test.ts`
- Modify: `packages/db/src/support.ts`
- Modify: `packages/db/src/index.ts`
- Delete: `apps/web/app/ops/page.tsx`
- Delete: `apps/web/app/ops/insights/page.tsx`
- Delete: `apps/web/app/ops/support/page.tsx`
- Delete: `apps/web/app/ops/events/page.tsx`
- Delete: `apps/web/app/ops/e/[slug]/page.tsx`
- Delete: `apps/web/app/ops/e/[slug]/painel/page.tsx`
- Delete: `apps/web/app/ops/event-aggregates.tsx`
- Delete: `apps/web/app/api/ops/support/route.ts`

**Interfaces:**
- Remove: `isPlatformOperator` (`@albora/db`) — sem substituto; a leitura da fila já vai por `withPlatformAggregation` (`listTicketQueue`, Onda C).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/ops-retirada-schema.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

describe("migration 0064", () => {
  it("ops_ticket_lista não existe mais em support_tickets", async () => {
    await prepararBanco();
    const { rows } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'ops_ticket_lista'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("conta_ticket (leitura do próprio host) continua valendo em support_tickets", async () => {
    await prepararBanco();
    const { rows } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'conta_ticket'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("staff_mutation_ticket (escrita de staff, migration 0063) continua valendo", async () => {
    await prepararBanco();
    const { rows } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'staff_mutation_ticket'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("platform_operators continua existindo, com sua própria policy de leitura — a migration NÃO derruba a tabela", async () => {
    await prepararBanco();
    const { rows: tabela } = await admin.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_operators'`,
    );
    expect(tabela).toHaveLength(1);

    const { rows: policy } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'platform_operators' AND policyname = 'conta_operator'`,
    );
    expect(policy).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run --config vitest.isolamento.config.ts src/ops-retirada-schema.test.ts`

Expected: FAIL — a primeira asserção falha (`rows` tem 1 linha, não 0) porque a policy ainda existe.

- [ ] **Step 3: Implementar o mínimo**

```sql
-- packages/db/migrations/0064_aposentar_ops_ticket_lista.sql
-- 0064 — aposenta a policy `ops_ticket_lista` (Onda D, T2)
--
-- `ops_ticket_lista` (migration 0030) dava SELECT cross-conta na fila de
-- tickets para quem estivesse em `platform_operators` — o sujeito era o
-- `/ops` antigo. Staff vive em `staff_users` desde a Onda A (migrations
-- 0059/0061); a Onda C já lê a fila por `withPlatformAggregation`
-- (`listTicketQueue`, `packages/application`), que não depende desta
-- policy nem de `platform_operators`. Sem o `/ops` antigo (removido nesta
-- mesma task — ver "Estrutura de arquivos" do plano da Onda D), a policy
-- fica sem sujeito: é uma porta que ninguém mais tranca.
--
-- NÃO derruba `platform_operators` nem `conta_operator` (a policy que
-- protege a própria tabela). Reconhecimento desta onda (grep -rn
-- "platform_operators" e "isPlatformOperator") confirmou os oito
-- consumidores de código que existiam antes desta task — a função
-- `isPlatformOperator` e os sete arquivos de app que a chamavam. Esta
-- mesma task remove todos. Depois dela, nada em código lê a tabela — mas
-- ela e sua policy de leitura própria continuam de pé, forward-only, até
-- uma decisão explícita de derrubá-la.
DROP POLICY ops_ticket_lista ON support_tickets;
```

```ts
// packages/db/src/support.ts — remover (linhas 192-199 antes desta task)
export async function isPlatformOperator(pool: Pool, accountId: string): Promise<boolean> {
  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query(`SELECT 1 FROM platform_operators WHERE account_id = $1`, [
      accountId,
    ]);
    return rows.length > 0;
  });
}
```
(bloco inteiro apagado — sem substituto; nenhum código deste onda em diante consulta `platform_operators`.)

```ts
// packages/db/src/index.ts — no bloco de exports de "./support", remover a linha:
  isPlatformOperator,
```

Remover os sete arquivos de app:
```bash
rm apps/web/app/ops/page.tsx
rm apps/web/app/ops/insights/page.tsx
rm apps/web/app/ops/support/page.tsx
rm apps/web/app/ops/events/page.tsx
rm "apps/web/app/ops/e/[slug]/page.tsx"
rm "apps/web/app/ops/e/[slug]/painel/page.tsx"
rm apps/web/app/ops/event-aggregates.tsx
rm apps/web/app/api/ops/support/route.ts
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run --config vitest.isolamento.config.ts src/ops-retirada-schema.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter web typecheck`

Expected: PASS — e `pnpm --filter web typecheck` prova que nada mais importa `isPlatformOperator` (senão o build de tipos falharia com `Module has no exported member`).

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/migrations/0064_aposentar_ops_ticket_lista.sql packages/db/src/ops-retirada-schema.test.ts packages/db/src/support.ts packages/db/src/index.ts
git rm apps/web/app/ops/page.tsx apps/web/app/ops/insights/page.tsx apps/web/app/ops/support/page.tsx apps/web/app/ops/events/page.tsx "apps/web/app/ops/e/[slug]/page.tsx" "apps/web/app/ops/e/[slug]/painel/page.tsx" apps/web/app/ops/event-aggregates.tsx apps/web/app/api/ops/support/route.ts
git commit -m "$(cat <<'EOF'
feat(console): aposentar ops_ticket_lista e a dependência de platform_operators

Migration 0064 derruba a policy ops_ticket_lista (migration 0030) — sem
sujeito desde que staff passou a viver em staff_users (Onda A) e a fila
de tickets passou a ser lida por withPlatformAggregation (Onda C). Não
derruba platform_operators nem sua policy própria (conta_operator):
reconhecimento confirmou oito consumidores de código antes desta task,
removidos nesta mesma task (isPlatformOperator e os sete arquivos de
apps/web/app/ops + a rota de API morta que dependia dela) — depois disso
nada em código lê a tabela, mas ela continua de pé, forward-only.

Remoção só agora, depois do redirect da T1 e da migration: um deploy
intermediário com rota morta e policy viva teria ficado sem garantia de
ordem entre as duas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Portal do fornecedor grava auditoria de verdade

**Files:**
- Modify: `apps/web/features/vendor-portal/lib/audit.ts`
- Create: `apps/web/features/vendor-portal/lib/audit.test.ts`
- Modify: `apps/web/features/vendor-portal/data/load-vendor-portal.ts`
- Modify: `apps/web/app/admin/vendor/insights/page.tsx`
- Modify: `apps/web/lib/api/handlers/admin-vendor.ts`
- Modify: `apps/web/lib/api/handlers/admin-vendor.test.ts`

**Interfaces:**
- Consumes: `insertAuditLog` (`@albora/db`).
- Produces: `auditarAgregacaoDoPortal(pool, actorId): (registro) => void` — fábrica, não mais uma função solta (assinatura muda; ver reconhecimento item 7).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/features/vendor-portal/lib/audit.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const { insertAuditLog } = vi.hoisted(() => ({ insertAuditLog: vi.fn().mockResolvedValue("audit-id") }));
vi.mock("@albora/db", () => ({ insertAuditLog }));

const { auditarAgregacaoDoPortal } = await import("./audit");

function poolFalso() {
  const client = { query: vi.fn(), release: vi.fn() };
  return { connect: vi.fn().mockResolvedValue(client) };
}

beforeEach(() => {
  insertAuditLog.mockClear();
  insertAuditLog.mockResolvedValue("audit-id");
});

describe("auditarAgregacaoDoPortal", () => {
  it("grava em audit_log com actor_kind 'host' e o motivo da agregação", async () => {
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-1");

    auditar({ motivo: "vendor_events:vendor-1", em: new Date("2026-09-06T10:00:00Z") });
    await vi.waitFor(() => expect(insertAuditLog).toHaveBeenCalledTimes(1));

    expect(insertAuditLog).toHaveBeenCalledWith(expect.anything(), {
      actorKind: "host",
      actorId: "conta-1",
      action: "vendor_portal.agregacao",
      targetKind: "platform",
      targetId: null,
      reason: "vendor_events:vendor-1",
    });
  });

  it("actorId nulo quando o host ainda não foi resolvido — resolução pública do slug, antes da sessão", async () => {
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, null);

    auditar({ motivo: "vendor_public_resolve:studio-x", em: new Date() });
    await vi.waitFor(() => expect(insertAuditLog).toHaveBeenCalledTimes(1));
    expect(insertAuditLog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ actorId: null }));
  });

  it("falha de escrita não escapa como exceção não tratada — comAgregacao chama este callback de forma síncrona", async () => {
    insertAuditLog.mockRejectedValueOnce(new Error("conexão caiu"));
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-2");

    expect(() => auditar({ motivo: "x", em: new Date() })).not.toThrow();
    await vi.waitFor(() => expect(insertAuditLog).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/vendor-portal/lib/audit.test.ts`

Expected: FAIL — `auditarAgregacaoDoPortal` ainda é `(registro) => void` de um argumento só; chamar como `auditarAgregacaoDoPortal(pool, "conta-1")` e depois `auditar({...})` estoura (`auditar is not a function`, já que a função antiga não devolve nada).

- [ ] **Step 3: Implementar o mínimo**

```ts
// apps/web/features/vendor-portal/lib/audit.ts
import type { Pool } from "pg";
import { insertAuditLog } from "@albora/db";

export type AgregacaoDoPortalRegistro = { motivo: string; em: Date };

/**
 * Audita agregação cross-evento do portal do fornecedor — grava em
 * `audit_log`, não mais só `console.log` (CLAUDE.md: "quem cruzou eventos,
 * quando e por quê tem que ser consulta SQL"). `withPlatformAggregation`
 * (`packages/application`) NÃO se aplica aqui: exige um `Actor` de staff
 * (`staffUserId` + `roles: StaffRole[]`), e quem cruza evento pelo portal é
 * um MEMBRO DE FORNECEDOR (`accounts`/`vendor_members`), nunca staff.
 * `actor_kind = 'host'` já é um valor válido em `audit_log` (migration
 * 0060) — criado exatamente para isto.
 *
 * Fábrica, não função solta: cada chamador amarra o `pool` (papel
 * `albora_app`, dono do GRANT em `audit_log` — diferente do `pool` de
 * agregação, que usa `albora_agregador`) e o `actorId` conhecido NAQUELE
 * ponto da chamada (pode ser `null` — ver `load-vendor-portal.ts`, onde o
 * slug do fornecedor resolve ANTES da sessão do host).
 *
 * Fire-and-forget, como `insertSecurityEvent` (`packages/db/src/audit.ts`):
 * `comAgregacao` (`packages/db/src/event.ts:70-93`) chama este `auditar`
 * de forma SÍNCRONA e sem esperar, sem passar nenhum `PoolClient` — é um
 * primitivo compartilhado por outras cinco funções (`marcaPublicaDoFornecedor`,
 * `eventosDoFornecedor`, `resumoDoFornecedor`, `criarFornecedor`,
 * `ativarPlanoDoFornecedor`); mudar essa assinatura é refactor fora do
 * escopo desta task. Falha de escrita de auditoria aqui não derruba a
 * leitura do portal — fica só logada. Isto é uma exceção real ao
 * "auditoria é pré-condição" do ADR 0016 §2: aquela regra vale para
 * `executeCommand`/`withPlatformAggregation` (mutação e agregação de
 * STAFF); o portal lendo o PRÓPRIO agregado é um risco bem menor, e nunca
 * teve essa garantia mesmo antes desta task (era `console.log`).
 */
export function auditarAgregacaoDoPortal(
  pool: Pool,
  actorId: string | null,
): (registro: AgregacaoDoPortalRegistro) => void {
  return (registro) => {
    void pool
      .connect()
      .then(async (client) => {
        try {
          await insertAuditLog(client, {
            actorKind: "host",
            actorId,
            action: "vendor_portal.agregacao",
            targetKind: "platform",
            targetId: null,
            reason: registro.motivo,
          });
        } finally {
          client.release();
        }
      })
      .catch((erro) => {
        console.error("vendor_portal.agregacao.auditoria_falhou", {
          motivo: registro.motivo,
          erro: erro instanceof Error ? erro.message : String(erro),
        });
      });
  };
}
```

```ts
// apps/web/features/vendor-portal/data/load-vendor-portal.ts — trocar os dois call sites
export async function loadVendorPortal(vendorSlug: string): Promise<VendorPortalContext> {
  const vendor = await marcaPublicaDoFornecedor(
    getAggregatorPool(),
    vendorSlug,
    auditarAgregacaoDoPortal(getPool(), null),
  );
  if (!vendor) notFound();

  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect(`/admin/sign-in?next=/f/${encodeURIComponent(vendorSlug)}`);

  const role = await roleForAccountOnVendor(getPool(), host.accountId, vendor.id);
  if (!role) notFound();

  const eventos = await eventosDoFornecedor(
    getPool(),
    getAggregatorPool(),
    host.accountId,
    vendor.id,
    auditarAgregacaoDoPortal(getPool(), host.accountId),
  );

  const subscriptionStatus = await latestSubscriptionStatus(vendor.id);

  return { vendor, role, eventos, subscriptionStatus };
}
```

```ts
// apps/web/app/admin/vendor/insights/page.tsx — trocar o call site dentro do map
  const resumos = await Promise.all(
    vendors.map(async (vendor) => ({
      vendor,
      resumo: await resumoDoFornecedor(
        getPool(),
        getAggregatorPool(),
        host.accountId,
        vendor.vendorId,
        auditarAgregacaoDoPortal(getPool(), host.accountId),
      ),
    })),
  );
```

```ts
// apps/web/lib/api/handlers/admin-vendor.ts — trocar o call site dentro do POST
    const criado = await criarFornecedor(
      getAggregatorPool(),
      auth.host.accountId,
      { name, slug },
      auditarAgregacaoDoPortal(getPool(), auth.host.accountId),
    );
```

```ts
// apps/web/lib/api/handlers/admin-vendor.test.ts — trocar o mock (era `vi.fn()` simples)
const { auditarAgregacaoDoPortal } = vi.hoisted(() => ({ auditarAgregacaoDoPortal: vi.fn(() => vi.fn()) }));
vi.mock("@/features/vendor-portal/lib/audit", () => ({ auditarAgregacaoDoPortal }));
```

(este bloco substitui a linha 56-58 original — `vi.mock("@/features/vendor-portal/lib/audit", () => ({ auditarAgregacaoDoPortal: vi.fn() }));` — pela versão `vi.hoisted` acima, colocada junto dos outros `vi.hoisted` do arquivo, ANTES do `vi.mock`.)

```ts
// apps/web/lib/api/handlers/admin-vendor.test.ts — adicionar ao describe existente do POST
it("chama auditarAgregacaoDoPortal com o pool e a conta do host antes de criar o fornecedor", async () => {
  requireHostSession.mockResolvedValueOnce({ host: { accountId: ACCOUNT_ID } });
  criarFornecedor.mockResolvedValueOnce({ vendorId: VENDOR_ID, slug: "estudio-foto" });

  await POST(postReq({ name: "Estúdio Foto", slug: "estudio-foto" }));

  expect(auditarAgregacaoDoPortal).toHaveBeenCalledWith(expect.anything(), ACCOUNT_ID);
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/vendor-portal/lib/audit.test.ts lib/api/handlers/admin-vendor.test.ts && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/features/vendor-portal/lib/audit.ts apps/web/features/vendor-portal/lib/audit.test.ts apps/web/features/vendor-portal/data/load-vendor-portal.ts apps/web/app/admin/vendor/insights/page.tsx apps/web/lib/api/handlers/admin-vendor.ts apps/web/lib/api/handlers/admin-vendor.test.ts
git commit -m "$(cat <<'EOF'
feat(vendor-portal): gravar auditoria de agregação em audit_log

auditarAgregacaoDoPortal só fazia console.log. withPlatformAggregation não
serve aqui — exige um Actor de staff, e quem cruza evento pelo portal é um
membro de fornecedor (accounts/vendor_members), nunca staff. A função vira
fábrica (pool, actorId) => callback, grava em audit_log com actor_kind
'host' (valor já aceito desde a migration 0060), e fica fire-and-forget
como insertSecurityEvent — comAgregacao chama o callback de forma
síncrona, sem cliente de banco, e mudar isso afetaria as outras cinco
funções que o primitivo atende.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `CommandPalette` (⌘K)

**Files:**
- Create: `packages/application/src/search/search-console.ts`
- Create: `packages/application/src/search/search-console.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `packages/ui-web/src/command-palette.tsx`
- Create: `packages/ui-web/src/command-palette.test.tsx`
- Modify: `packages/ui-web/src/index.ts`
- Modify: `apps/web/features/console/actions.ts`
- Create: `apps/web/features/console/components/client/console-search.tsx`
- Create: `apps/web/features/console/components/client/console-search.test.tsx`
- Modify: `apps/web/features/console/components/server/console-shell.tsx`

**Interfaces:**
- Consumes: `listAccounts`/`listEvents`/`withPlatformAggregation` (`@albora/application`), `getSupportTicketAdmin` (`@albora/db`), `hasCapability` (`@albora/core`).
- Produces: `searchConsole` (`@albora/application`), `CommandPalette` (`@albora/ui-web`), `searchConsoleAction` (server action), `ConsoleSearch` (client component).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/search/search-console.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { createSupportTicket } from "@albora/db";
import { searchConsole } from "./search-console";

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

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

describe("searchConsole", () => {
  it("query com menos de 2 caracteres devolve vazio sem tocar o banco", async () => {
    const resultados = await searchConsole(
      { pool: {} as never, aggregatorPool: {} as never },
      { actor: actor(["owner"]), reason: "⌘K", query: "a" },
    );
    expect(resultados).toEqual([]);
  });

  it("engineering tem events.read e tickets.read mas não accounts.read — busca por e-mail não acha a conta", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const resultados = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["engineering"]), reason: "⌘K", query: "anfitriao-a" },
    );
    expect(resultados.find((r) => r.kind === "account")).toBeUndefined();
  });

  it("owner encontra a conta pelo e-mail, com link pro detalhe", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const resultados = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: "anfitriao-a" },
    );
    const conta = resultados.find((r) => r.kind === "account");
    expect(conta?.id).toBe(a.contaId);
    expect(conta?.href).toBe(`/console/accounts/${a.contaId}`);
  });

  it("owner encontra o evento pelo título", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await admin.query("UPDATE events SET title = $2 WHERE id = $1", [a.eventoId, "Casamento Busqueda"]);
    const resultados = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: "Busqueda" },
    );
    const evento = resultados.find((r) => r.kind === "event");
    expect(evento?.id).toBe(a.eventoId);
    expect(evento?.href).toBe(`/console/events/${a.eventoId}`);
  });

  it("owner encontra o ticket pelo id exato, nunca por texto do assunto", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const ticket = await createSupportTicket(admin, a.contaId, { subject: "dúvida sobre cobrança", body: "oi" });

    const porId = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: ticket.id },
    );
    expect(porId.find((r) => r.kind === "ticket")?.href).toBe(`/console/support?ticket=${ticket.id}`);

    const porAssunto = await searchConsole(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "⌘K", query: "cobrança" },
    );
    expect(porAssunto.find((r) => r.kind === "ticket")).toBeUndefined();
  });
});
```

```tsx
// packages/ui-web/src/command-palette.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./command-palette";

const RESULTADOS = [
  { kind: "account", id: "conta-1", label: "j••••@gmail.com", href: "/console/accounts/conta-1" },
  { kind: "event", id: "evento-1", label: "Casamento X", href: "/console/events/evento-1" },
];

describe("CommandPalette", () => {
  it("mostra os resultados com o rótulo do tipo", () => {
    render(
      <CommandPalette open onClose={() => {}} query="ex" onQueryChange={() => {}} results={RESULTADOS} onSelect={() => {}} />,
    );
    expect(screen.getByText("j••••@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Casamento X")).toBeInTheDocument();
    expect(screen.getByText("Conta")).toBeInTheDocument();
    expect(screen.getByText("Evento")).toBeInTheDocument();
  });

  it("clicar num resultado chama onSelect com o resultado inteiro", async () => {
    const onSelect = vi.fn();
    render(
      <CommandPalette open onClose={() => {}} query="ex" onQueryChange={() => {}} results={RESULTADOS} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByText("Casamento X"));
    expect(onSelect).toHaveBeenCalledWith(RESULTADOS[1]);
  });

  it("sem resultado e query com 2+ caracteres mostra a mensagem de vazio que ensina, nunca uma lista em branco muda", () => {
    render(<CommandPalette open onClose={() => {}} query="zz" onQueryChange={() => {}} results={[]} onSelect={() => {}} />);
    expect(screen.getByText(/Nenhum resultado para/)).toBeInTheDocument();
  });

  it("digitar no campo chama onQueryChange", async () => {
    const onQueryChange = vi.fn();
    render(
      <CommandPalette open onClose={() => {}} query="" onQueryChange={onQueryChange} results={[]} onSelect={() => {}} />,
    );
    await userEvent.type(screen.getByLabelText("Buscar conta, evento ou ticket"), "a");
    expect(onQueryChange).toHaveBeenCalledWith("a");
  });
});
```

```tsx
// apps/web/features/console/components/client/console-search.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsoleSearch } from "./console-search";

const { searchConsoleActionMock, pushMock } = vi.hoisted(() => ({
  searchConsoleActionMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/features/console/actions", () => ({ searchConsoleAction: searchConsoleActionMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("ConsoleSearch", () => {
  it("⌘K abre a paleta, alcançável por teclado", async () => {
    render(<ConsoleSearch />);
    expect(screen.queryByLabelText("Buscar conta, evento ou ticket")).not.toBeInTheDocument();
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByLabelText("Buscar conta, evento ou ticket")).toBeInTheDocument();
  });

  it("digitar dispara a busca e selecionar um resultado navega e fecha a paleta", async () => {
    searchConsoleActionMock.mockResolvedValueOnce([
      { kind: "account", id: "conta-1", label: "j••••@gmail.com", href: "/console/accounts/conta-1" },
    ]);
    render(<ConsoleSearch />);
    await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
    await userEvent.type(screen.getByLabelText("Buscar conta, evento ou ticket"), "jo");

    const resultado = await screen.findByText("j••••@gmail.com");
    await userEvent.click(resultado);

    expect(pushMock).toHaveBeenCalledWith("/console/accounts/conta-1");
    expect(screen.queryByLabelText("Buscar conta, evento ou ticket")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run --config vitest.isolamento.config.ts src/search/search-console.test.ts && pnpm --filter @albora/ui-web exec vitest run src/command-palette.test.tsx && pnpm --filter web exec vitest run features/console/components/client/console-search.test.tsx`

Expected: FAIL — `Cannot find module './search-console'`, `Cannot find module './command-palette'`, `Cannot find module './console-search'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/search/search-console.ts
import type { Pool } from "pg";
import { hasCapability, type Actor } from "@albora/core";
import { getSupportTicketAdmin } from "@albora/db";
import { listAccounts } from "../accounts/list-accounts";
import { listEvents } from "../events/list-events";
import { withPlatformAggregation } from "../platform/aggregation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_POR_CATEGORIA = 5;

export type ConsoleSearchResultKind = "account" | "event" | "ticket";
export type ConsoleSearchResult = { kind: ConsoleSearchResultKind; id: string; label: string; href: string };
export type SearchConsoleInput = { actor: Actor; reason: string; query: string };

/**
 * ⌘K (spec de design §12, primitivo de Onda D). Nunca uma query nova
 * cross-tenant — reaproveita `listAccounts`/`listEvents` (já sob
 * `withPlatformAggregation`, Onda B) e envolve `getSupportTicketAdmin` na
 * mesma disciplina aqui mesmo, porque não existe caso de uso de ler UM
 * ticket por id fora de `getTicketDetail` (que traz thread e contexto
 * inteiros — pesado demais para um resultado de busca).
 *
 * "Quem não tem accounts.read não encontra conta na busca" é literal: a
 * categoria nem tenta rodar — `hasCapability` decide ANTES de chamar
 * `listAccounts`/`listEvents`, que lançariam `CommandDeniedError` se
 * chamados sem a capacidade. Silêncio, não erro.
 *
 * Busca de ticket é por id exato (uuid) — não existe coluna de busca
 * textual em `support_tickets` (reconhecimento da Onda D, item 12).
 * Buscar pelo assunto do ticket não encontra nada; é lacuna registrada,
 * não inventada.
 */
export async function searchConsole(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: SearchConsoleInput,
): Promise<ConsoleSearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];

  const resultados: ConsoleSearchResult[] = [];

  if (hasCapability(input.actor.roles, "accounts.read")) {
    const { rows } = await listAccounts(deps, {
      actor: input.actor,
      reason: input.reason,
      search: query,
      limit: LIMITE_POR_CATEGORIA,
    });
    resultados.push(
      ...rows.map((r) => ({
        kind: "account" as const,
        id: r.id,
        label: r.maskedEmail,
        href: `/console/accounts/${r.id}`,
      })),
    );
  }

  if (hasCapability(input.actor.roles, "events.read")) {
    const { rows } = await listEvents(deps, {
      actor: input.actor,
      reason: input.reason,
      search: query,
      limit: LIMITE_POR_CATEGORIA,
    });
    resultados.push(
      ...rows.map((r) => ({
        kind: "event" as const,
        id: r.id,
        label: r.title ?? r.id,
        href: `/console/events/${r.id}`,
      })),
    );
  }

  if (hasCapability(input.actor.roles, "tickets.read") && UUID.test(query)) {
    const ticket = await withPlatformAggregation(deps, {
      actor: input.actor,
      capability: "tickets.read",
      reason: input.reason,
      action: "tickets.search.read",
      run: () => getSupportTicketAdmin(deps.aggregatorPool, query),
    });
    if (ticket) {
      resultados.push({ kind: "ticket", id: ticket.id, label: ticket.subject, href: `/console/support?ticket=${ticket.id}` });
    }
  }

  return resultados;
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { ConsoleSearchResult, ConsoleSearchResultKind, SearchConsoleInput } from "./search/search-console";
export { searchConsole } from "./search/search-console";
```

```tsx
// packages/ui-web/src/command-palette.tsx
"use client";

import { useEffect, useRef } from "react";
import { Dialog } from "./dialog";

export type CommandPaletteResult = { kind: string; id: string; label: string; href: string };

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  results: CommandPaletteResult[];
  loading?: boolean;
  onSelect: (result: CommandPaletteResult) => void;
};

const ROTULO_KIND: Record<string, string> = { account: "Conta", event: "Evento", ticket: "Ticket" };

/**
 * Onda D, primitivo de fechamento (spec de design §12). Alcançável por
 * teclado — foco vai pro campo assim que abre, `Escape` fecha (herdado do
 * `<dialog>` nativo via `Dialog`) — e anunciado a leitor de tela via
 * `role="listbox"`/`role="option"` (spec §11: "⌘K alcançável por teclado
 * e anunciado"). Quem ouve o atalho global e controla abrir/fechar é o
 * consumidor (`ConsoleSearch`, apps/web) — este componente só sabe
 * renderizar `open`/`results`, sem saber o que é ⌘K.
 */
export function CommandPalette({ open, onClose, query, onQueryChange, results, loading = false, onSelect }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} aria-label="Busca do console">
      <div className="elev-2 mx-auto mt-24 flex w-full max-w-xl flex-col overflow-hidden rounded-superficie border border-linha bg-superficie">
        <div className="flex items-center gap-2 border-b border-linha px-4 py-3">
          <span aria-hidden className="text-ink-3">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Conta, evento ou id de ticket…"
            aria-label="Buscar conta, evento ou ticket"
            className="tipo-den-corpo min-h-11 flex-1 border-none bg-transparent text-ink outline-none placeholder:text-ink-3"
          />
          <kbd className="tipo-den-rotulo text-ink-3">Esc</kbd>
        </div>
        <ul role="listbox" aria-label="Resultados da busca" className="max-h-80 overflow-y-auto py-2">
          {loading && <li className="tipo-den-corpo px-4 py-3 text-ink-3">Buscando…</li>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <li className="tipo-den-corpo px-4 py-3 text-ink-3">Nenhum resultado para “{query}”.</li>
          )}
          {!loading &&
            results.map((r) => (
              <li key={`${r.kind}:${r.id}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className="tipo-den-corpo flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-ink hover:bg-superficie-alta focus-visible:bg-superficie-alta focus-visible:outline-none"
                >
                  <span className="tipo-den-rotulo shrink-0 text-ink-3">{ROTULO_KIND[r.kind] ?? r.kind}</span>
                  <span className="truncate">{r.label}</span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </Dialog>
  );
}
```

```ts
// packages/ui-web/src/index.ts — adicionar
export { CommandPalette, type CommandPaletteProps, type CommandPaletteResult } from "./command-palette";
```

```ts
// apps/web/features/console/actions.ts — adicionar aos imports do topo
import { searchConsole, type ConsoleSearchResult } from "@albora/application";
```

```ts
// apps/web/features/console/actions.ts — trocar o import de "@/lib/db" para incluir getAggregatorPool
import { getAggregatorPool, getPool } from "@/lib/db";
```

```ts
// apps/web/features/console/actions.ts — adicionar
/** ⌘K (T4/Onda D). Falha vira lista vazia, nunca trava a paleta aberta em "Buscando…". */
export async function searchConsoleAction(query: string): Promise<ConsoleSearchResult[]> {
  const actor = await resolveActor();
  if (!actor) return [];
  try {
    return await searchConsole(
      { pool: getPool(), aggregatorPool: getAggregatorPool() },
      { actor, reason: "console.search", query },
    );
  } catch {
    return [];
  }
}
```

```tsx
// apps/web/features/console/components/client/console-search.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette, type CommandPaletteResult } from "@albora/ui-web";
import { searchConsoleAction } from "@/features/console/actions";

const DEBOUNCE_MS = 200;

/**
 * Substitui o `<input>` estático que só imprimia "⌘K" (Onda A, T14) — o
 * atalho agora abre de verdade. `Cmd+K` no mac, `Ctrl+K` no resto.
 */
export function ConsoleSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandPaletteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function aoTeclar(ev: KeyboardEvent) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const buscar = useCallback((valor: string) => {
    setQuery(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (valor.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const encontrados = await searchConsoleAction(valor);
      setResults(encontrados);
      setLoading(false);
    }, DEBOUNCE_MS);
  }, []);

  function fechar() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tipo-den-corpo relative ml-2 hidden min-h-11 max-w-md flex-1 items-center rounded-superficie border border-linha bg-superficie-alta py-2 pl-3 pr-12 text-left text-ink-3 min-[900px]:flex"
      >
        Buscar…
        <kbd className="tipo-den-rotulo pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">⌘K</kbd>
      </button>
      <CommandPalette
        open={open}
        onClose={fechar}
        query={query}
        onQueryChange={buscar}
        results={results}
        loading={loading}
        onSelect={(resultado) => {
          fechar();
          router.push(resultado.href);
        }}
      />
    </>
  );
}
```

```tsx
// apps/web/features/console/components/server/console-shell.tsx — trocar o bloco do campo de busca estático
import { ConsoleSearch } from "@/features/console/components/client/console-search";
```
(import novo, junto dos demais no topo do arquivo)

```tsx
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-linha bg-superficie px-4">
            <span className="tipo-den-titulo shrink-0">Console</span>
            <ConsoleSearch />
            <select
```
(substitui o antigo `<label className="relative ml-2 hidden flex-1 min-[900px]:block">...⌘K</label>` inteiro por `<ConsoleSearch />`; o `<select>` de período e o resto do header continuam iguais)

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run --config vitest.isolamento.config.ts src/search/search-console.test.ts && pnpm --filter @albora/ui-web exec vitest run src/command-palette.test.tsx && pnpm --filter web exec vitest run features/console/components/client/console-search.test.tsx && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application/src/search packages/application/src/index.ts packages/ui-web/src/command-palette.tsx packages/ui-web/src/command-palette.test.tsx packages/ui-web/src/index.ts apps/web/features/console/actions.ts apps/web/features/console/components/client/console-search.tsx apps/web/features/console/components/client/console-search.test.tsx apps/web/features/console/components/server/console-shell.tsx
git commit -m "$(cat <<'EOF'
feat(console): CommandPalette (⌘K) — busca de conta, evento e ticket

Último primitivo da espinha de design (spec §12, Onda D). searchConsole
(packages/application) reaproveita listAccounts/listEvents, já sob
withPlatformAggregation, e envolve getSupportTicketAdmin na mesma
disciplina; cada categoria só roda se o ator tem a capacidade — "quem não
tem accounts.read não encontra conta" é literal, silêncio em vez de erro.
Ticket é só por id exato: não existe busca textual em support_tickets.

Substitui o <input> estático que só imprimia "⌘K" desde a Onda A (T14) —
o atalho agora abre a paleta de verdade, alcançável por teclado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Dívida da Onda C — UI de trocar plano e reembolsar

**Files:**
- Modify: `apps/web/features/console/components/client/subscription-actions.tsx`
- Modify: `apps/web/features/console/components/client/subscription-actions.test.tsx`
- Modify: `apps/web/app/console/(shell)/subscriptions/page.tsx`

**Interfaces:**
- Consumes: `changeSubscriptionPlanAction`, `refundPaymentAction` (`apps/web/features/console/actions.ts` — já existem desde a Onda C, sem mudança de assinatura), `Select`/`TextField`/`ConfirmDialog` (`@albora/ui-web`).
- Produces: nenhuma — só UI conectando comandos que já existem (espinha: "T5 conecta UI a elas, não reescreve").

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// apps/web/features/console/components/client/subscription-actions.test.tsx
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionActions } from "./subscription-actions";

const PRICE_TABLE = { starter: 9900, studio: 24900, agency: 59900 };

vi.mock("@/features/console/actions", () => ({
  applySubscriptionCourtesyAction: vi.fn().mockResolvedValue({ ok: true }),
  cancelSubscriptionAction: vi.fn().mockResolvedValue({ ok: false, error: "motivo é obrigatório" }),
  changeSubscriptionPlanAction: vi.fn(),
  refundPaymentAction: vi.fn(),
}));

describe("SubscriptionActions", () => {
  it("sem subscription.mutate e sem subscription.refund* mostra só travessão", () => {
    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar={false} priceTable={PRICE_TABLE} />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("cancelar sem motivo mostra o erro devolvido pelo comando", async () => {
    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar podeReembolsar={false} priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar assinatura" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("motivo é obrigatório");
  });

  it("trocar plano chama a action com o preço da tabela para o plano escolhido", async () => {
    const { changeSubscriptionPlanAction } = await import("@/features/console/actions");
    vi.mocked(changeSubscriptionPlanAction).mockResolvedValueOnce({ ok: true });

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="starter" podeMutar podeReembolsar={false} priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Trocar plano" }));
    await userEvent.selectOptions(screen.getByLabelText("Novo plano"), "agency");
    await userEvent.type(screen.getByLabelText("Motivo"), "upgrade pedido pelo fornecedor");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar troca de plano" }));

    expect(changeSubscriptionPlanAction).toHaveBeenCalledWith("s1", "agency", 59900, "upgrade pedido pelo fornecedor");
  });

  it("reembolso acima do limiar mostra que exige o dono, sem inventar fila de aprovação", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockResolvedValueOnce({
      ok: false,
      error: "ator sem a capacidade subscription.refund.approve",
    });

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    await userEvent.type(screen.getByLabelText("ID do pagamento"), "pagamento-1");
    await userEvent.type(screen.getByLabelText("ID do pagamento no Asaas"), "pay_asaas_1");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "800,00");
    await userEvent.type(screen.getByLabelText("Motivo"), "cliente cancelou o evento");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    expect(refundPaymentAction).toHaveBeenCalledWith("pagamento-1", "pay_asaas_1", 80000, "cliente cancelou o evento");
    expect(await screen.findByRole("alert")).toHaveTextContent("Esse valor exige aprovação do dono.");
  });

  it("valor de reembolso inválido nunca chama a action", async () => {
    const { refundPaymentAction } = await import("@/features/console/actions");
    vi.mocked(refundPaymentAction).mockClear();

    render(
      <SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar priceTable={PRICE_TABLE} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }));
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "não é número");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reembolso" }));

    expect(refundPaymentAction).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("Valor inválido");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/console/components/client/subscription-actions.test.tsx`

Expected: FAIL — `getByRole("button", { name: "Trocar plano" })` não encontra nada (botão não existe ainda); a suíte inteira quebra por falta do prop `priceTable` já ser passado nos testes antigos também.

- [ ] **Step 3: Implementar o mínimo**

```tsx
// apps/web/features/console/components/client/subscription-actions.tsx
"use client";

import React, { useState, useTransition } from "react";
import { Button, ConfirmDialog, Select, TextField } from "@albora/ui-web";
import {
  applySubscriptionCourtesyAction,
  cancelSubscriptionAction,
  changeSubscriptionPlanAction,
  refundPaymentAction,
} from "@/features/console/actions";

type Plano = "starter" | "studio" | "agency";

const ROTULO_PLANO: Record<Plano, string> = { starter: "Starter", studio: "Studio", agency: "Agency" };

function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

/** "800,00" ou "800.00" → 80000. Vírgula ou ponto — o operador digita como está acostumado. */
function parseReaisParaCentavos(valor: string): number | null {
  const numero = Number(valor.trim().replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.round(numero * 100);
}

/**
 * "ator sem a capacidade subscription.refund.approve" (`CommandDeniedError`,
 * ver `refund-payment.ts`) é a ÚNICA forma como "esse valor exige o dono"
 * chega aqui — `refundPayment` nunca lança `ApprovalRequiredError`, porque
 * troca a capacidade checada em vez de usar a política de `needsApproval`
 * (reconhecimento da Onda D, item 9). Traduzir esse texto técnico é o que
 * a espinha pede, sem inventar fila de aprovação nenhuma.
 */
function traduzErroDeReembolso(erro: string): string {
  if (erro.includes("subscription.refund.approve")) return "Esse valor exige aprovação do dono.";
  return erro;
}

/**
 * Cortesia e cancelamento vêm da Onda C. Trocar plano e reembolsar fecham
 * a dívida que a T6 daquela onda registrou: os comandos (`changeSubscriptionPlan`,
 * `refundPayment`) e as server actions já existiam, testados — só faltava
 * a tela.
 */
export function SubscriptionActions({
  subscriptionId,
  plan,
  podeMutar,
  podeReembolsar,
  priceTable,
}: {
  subscriptionId: string;
  vendorId: string;
  plan: Plano;
  podeMutar: boolean;
  podeReembolsar: boolean;
  priceTable: Record<Plano, number>;
}) {
  const [dialogo, setDialogo] = useState<"cortesia" | "cancelar" | "trocar_plano" | "reembolsar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [novoPlano, setNovoPlano] = useState<Plano>(plan);
  const [paymentId, setPaymentId] = useState("");
  const [asaasPaymentId, setAsaasPaymentId] = useState("");
  const [valorReembolso, setValorReembolso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!podeMutar && !podeReembolsar) return <span className="tipo-den-corpo text-ink-3">—</span>;

  function fechar() {
    setDialogo(null);
    setErro(null);
    setMotivo("");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {podeMutar && (
        <>
          <Button type="button" variant="tertiary" onClick={() => setDialogo("trocar_plano")}>
            Trocar plano
          </Button>
          <Button type="button" variant="tertiary" onClick={() => setDialogo("cortesia")}>
            Cortesia
          </Button>
          <Button type="button" variant="tertiary" onClick={() => setDialogo("cancelar")}>
            Cancelar
          </Button>
        </>
      )}
      {podeReembolsar && (
        <Button type="button" variant="tertiary" onClick={() => setDialogo("reembolsar")}>
          Reembolsar
        </Button>
      )}

      <ConfirmDialog
        open={dialogo === "trocar_plano"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await changeSubscriptionPlanAction(subscriptionId, novoPlano, priceTable[novoPlano], motivo);
            if (resultado.ok) fechar();
            else setErro(resultado.error);
          })
        }
        title={`Trocar plano — ${ROTULO_PLANO[plan]} → ${ROTULO_PLANO[novoPlano]}?`}
        description={
          <div className="flex flex-col gap-3">
            <Select label="Novo plano" value={novoPlano} onChange={(e) => setNovoPlano(e.target.value as Plano)}>
              {(["starter", "studio", "agency"] as const).map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PLANO[p]} — {formatarReais(priceTable[p])}/mês
                </option>
              ))}
            </Select>
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmLabel="Confirmar troca de plano"
      />

      <ConfirmDialog
        open={dialogo === "cortesia"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await applySubscriptionCourtesyAction(subscriptionId, 100, motivo);
            if (resultado.ok) fechar();
            else setErro(resultado.error);
          })
        }
        title={`Aplicar cortesia (100%) — plano ${plan}?`}
        description={
          <div className="flex flex-col gap-3">
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
      />

      <ConfirmDialog
        open={dialogo === "cancelar"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await cancelSubscriptionAction(subscriptionId, motivo);
            if (resultado.ok) fechar();
            else setErro(resultado.error);
          })
        }
        title="Cancelar assinatura?"
        description={
          <div className="flex flex-col gap-3">
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmLabel="Cancelar assinatura"
      />

      <ConfirmDialog
        open={dialogo === "reembolsar"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            const amountCents = parseReaisParaCentavos(valorReembolso);
            if (amountCents === null) {
              setErro("Valor inválido — use um número maior que zero, ex.: 150,00");
              return;
            }
            const resultado = await refundPaymentAction(paymentId, asaasPaymentId, amountCents, motivo);
            if (resultado.ok) fechar();
            else setErro(traduzErroDeReembolso(resultado.error));
          })
        }
        title="Reembolsar pagamento?"
        description={
          <div className="flex flex-col gap-3">
            <TextField label="ID do pagamento" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} />
            <TextField label="ID do pagamento no Asaas" value={asaasPaymentId} onChange={(e) => setAsaasPaymentId(e.target.value)} />
            <TextField label="Valor (R$)" value={valorReembolso} onChange={(e) => setValorReembolso(e.target.value)} placeholder="150,00" />
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmLabel="Confirmar reembolso"
      />
    </div>
  );
}
```

```tsx
// apps/web/app/console/(shell)/subscriptions/page.tsx — trocar a linha do render da coluna "acoes"
              <SubscriptionActions
                subscriptionId={r.subscriptionId}
                vendorId={r.vendorId}
                plan={r.plan}
                podeMutar={podeMutar}
                podeReembolsar={podeReembolsar}
                priceTable={VENDOR_PLAN_PRICE_CENTS}
              />
```
(`VENDOR_PLAN_PRICE_CENTS` já é importado de `@albora/application` neste arquivo desde a Onda B/C — só o prop novo muda.)

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/console/components/client/subscription-actions.test.tsx "app/console/(shell)/subscriptions" && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/features/console/components/client/subscription-actions.tsx apps/web/features/console/components/client/subscription-actions.test.tsx "apps/web/app/console/(shell)/subscriptions/page.tsx"
git commit -m "$(cat <<'EOF'
feat(console): UI de trocar plano e reembolsar (dívida da Onda C)

changeSubscriptionPlan e refundPayment já existiam, com server action e
teste, desde a Onda C — só faltava a tela (T6 daquela onda entregou só
cortesia e cancelamento). Trocar plano usa um seletor com o preço de
VENDOR_PLAN_PRICE_CENTS (@albora/application); reembolso pede referência
ao pagamento (id local + id no Asaas, texto livre — não existe seletor de
pagamento por fornecedor ainda) e valor em centavos. Acima do limiar,
finance recebe CommandDeniedError (não ApprovalRequiredError — refundPayment
troca a capacidade verificada em vez de usar needsApproval); a UI traduz
esse texto pra "exige aprovação do dono", sem construir fila nenhuma.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Verificação da onda (controller)

**Files:** nenhum arquivo de produção — só comandos de verificação e, se algo reprovar, correções pontuais nos arquivos já tocados pelas Tasks 1-5.

**Interfaces:** nenhuma.

- [ ] **Step 1: Rodar a suíte completa, por pacote, com o runner correto**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22
TEST_DATABASE_URL=postgres://albora:albora@localhost:55432/albora_console pnpm --filter @albora/db exec vitest run --config vitest.isolamento.config.ts
TEST_DATABASE_URL=postgres://albora:albora@localhost:55432/albora_console pnpm --filter @albora/application exec vitest run --config vitest.isolamento.config.ts
pnpm --filter @albora/ui-web exec vitest run
pnpm --filter web exec vitest run
```

Expected: PASS em todos os quatro — inclusive `ops-retirada-schema.test.ts`, `audit.test.ts` do portal, `search-console.test.ts`, `command-palette.test.tsx`, `console-search.test.tsx` e `subscription-actions.test.tsx` das Tasks 1-5.

- [ ] **Step 2: `pnpm typecheck` e `pnpm lint` na raiz — nenhum `next build`**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm typecheck && pnpm lint`

Expected: PASS. Nenhum comando desta task nem de nenhuma das cinco anteriores chama `next build`/`next start`.

- [ ] **Step 3: `pnpm guards` — os 9 guards bloqueantes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm guards`

Expected: PASS — em particular o guard `camadas` (rota/server action só importam valor de `@albora/application`) continua valendo depois de T3/T4/T5 terem mexido em `actions.ts` e em `page.tsx`, e o guard de `pack → core` nem é tocado por esta onda.

- [ ] **Step 4: Checklist manual do fechamento (grep + psql), item a item da espinha**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22

# nenhuma rota /ops de PÁGINA sobrevive sem redirect (0 arquivos)
find apps/web/app/ops -type f
# esperado: vazio

# /api/ops/support (endpoint morto) também saiu
test -f apps/web/app/api/ops/support/route.ts && echo "AINDA EXISTE — falha" || echo "removido — ok"

# /api/ops/retencao continua — é cron de produção, não telas de /ops
test -f apps/web/app/api/ops/retencao/route.ts && echo "presente — ok (cron)" || echo "sumiu — falha, isso quebraria o cron de retenção"

# ops_ticket_lista ausente, platform_operators presente (via teste já rodado no Step 1;
# confirmação avulsa opcional se o banco local estiver de pé):
psql "$TEST_DATABASE_URL" -c "select policyname from pg_policies where tablename = 'support_tickets'"
# esperado: conta_ticket, staff_mutation_ticket — NUNCA ops_ticket_lista
psql "$TEST_DATABASE_URL" -c "select to_regclass('platform_operators')"
# esperado: platform_operators (não NULL — tabela não foi derrubada)

# isPlatformOperator não existe mais em nenhum lugar do código
grep -rn "isPlatformOperator" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "/dist/"
# esperado: vazio

# auditarAgregacaoDoPortal grava em audit_log, não só console.log
grep -n "insertAuditLog" apps/web/features/vendor-portal/lib/audit.ts
# esperado: presente
grep -n "^  console.log" apps/web/features/vendor-portal/lib/audit.ts
# esperado: vazio (a única linha de console.log que sobra é dentro do .catch de erro, não no caminho feliz)

# toda mutação ainda passa por executeCommand — nenhum INSERT/UPDATE/DELETE de negócio
# fora do envelope nos arquivos que esta onda tocou
grep -n "executeCommand" packages/application/src/subscriptions/*.ts
# esperado: change-plan.ts, apply-courtesy.ts, cancel-subscription.ts, refund-payment.ts — todos

# zero PII de convidado em qualquer arquivo tocado por esta onda
grep -rln "display_name\|guest_sessions" apps/web/features/console apps/web/app/console packages/application/src/search 2>/dev/null
# esperado: vazio — nenhuma tela ou busca desta onda toca dado de convidado
```

Expected: cada verificação bate com o "esperado" descrito ao lado.

- [ ] **Step 5: Relatório final**

Escrever `.superpowers/sdd/2026-09-06-console-onda-d-absorcao/plan-report.md` com: SHA de cada um dos cinco commits (Tasks 1-5), resultado de cada comando dos Steps 1-4 (PASS/FAIL, com a saída relevante colada se houver falha), e a tabela de Lacunas deste plano copiada verbatim — é o que o mantenedor lê pra saber se a onda fechou de verdade sem abrir o arquivo inteiro.

Não há commit nesta task — é verificação; se o Step 1, 2 ou 3 falhar, a correção necessária é feita nos arquivos da task correspondente (1-5) e um commit de correção é criado ali, não aqui.

---

## Auto-revisão

1. **Toda tarefa da espinha virou task.** T1 (redirecionar) → Task 1. T2 (aposentar policy + dependência) → Task 2. T3 (auditoria do portal) → Task 3. T4 (CommandPalette) → Task 4. T5 (UI de assinatura) → Task 5. T6 (controller) → Task 6. Nenhuma tarefa da espinha ficou de fora.
2. **Varredura de placeholder:** nenhum bloco de código deste plano contém `// TODO`, `...`, ou comentário do tipo "implementar depois" — todo passo de implementação traz o arquivo inteiro ou o trecho exato a inserir/substituir, com o código real.
3. **Consistência de tipos:** `ConsoleSearchResult`/`CommandPaletteResult` usam os mesmos três campos (`kind`/`id`/`label`/`href`) do ponto de produção (`searchConsole`) até o ponto de consumo (`CommandPalette`); `SubscriptionActions.priceTable` usa o mesmo `Record<Plano, number>` que `VENDOR_PLAN_PRICE_CENTS` já tem; `RedirecionamentoPermanente` é o mesmo shape que `next.config.ts` já espalha nos outros grupos de redirect.
4. **Nenhuma query sobre tabela/coluna não confirmada:** toda coluna citada (`assignee_staff_id`, `actor_kind`, `pg_policies.tablename/policyname`, `information_schema.tables.table_name`) foi lida direto do schema real (migrations 0030/0060/0063/0064) ou de uma função já existente (`getSupportTicketAdmin`, `listAccountsAdmin`/`listEventsAdmin` via `listAccounts`/`listEvents`) durante o reconhecimento — nenhuma foi assumida.
5. **Nenhuma mutação fora de `executeCommand`:** as únicas duas tasks com escrita de negócio (Task 2 é só DDL de migration; Task 5 só conecta UI a comandos que já existem) não introduzem mutação nova. A escrita de auditoria do portal (Task 3) não é mutação de negócio — é a própria trilha, e já está documentada (reconhecimento item 8) como a exceção real e isolada desta onda, pela mesma razão que impede reusar `executeCommand`/`withPlatformAggregation` (exigem `Actor` de staff).
6. **Nada planejado em `retention-jobs.ts`:** nenhuma task deste plano cria, modifica ou sequer lê `packages/db/src/retention-jobs.ts`. Confirmado por leitura de cada task acima.
