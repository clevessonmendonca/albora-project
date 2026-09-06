# Console Interno — Onda B (Leitura) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as sete telas de leitura do console interno (Visão geral, Contas, Conta-detalhe, Eventos, Assinaturas, Retenção, Auditoria, Segurança) consumindo só `@albora/application`, com H1 e as demais métricas vindas de dado real ou, na ausência dele, de um vazio honesto — nenhuma mutação, nenhum número inventado.

**Architecture:** Mesma espinha da Onda A: `apps/web/app/console/(shell)/<rota>/page.tsx` (RSC) chama `resolveActor()` e um caso de uso de `packages/application`, que autoriza via `executeQuery`/`withPlatformAggregation` e lê de `packages/db`. `events`/`guest_sessions`/`uploads`/`funnel_events` têm RLS FORÇADA por `event_id` (mais uma segunda porta por `account_id`, ADR 0013) — qualquer leitura que cruze contas ou eventos (Contas, Conta-detalhe, Eventos, Assinaturas, Retenção, e toda métrica de plataforma) passa por `withPlatformAggregation` (pool `albora_agregador`, BYPASSRLS). `audit_log`/`security_events` não têm RLS nenhuma (tabelas globais por desenho) — Auditoria e Segurança usam `executeQuery` puro, sem agregação. Analytics some com o tempo: `analytics_snapshots` (migration 0032) é upsert por `(scope, scope_id, period)` — não guarda série histórica —, então sparkline e linha de base de plataforma são computados ao vivo por janela de tempo sobre `events`/`uploads`/`guest_sessions`, não lidos de snapshot.

**Tech Stack:** TypeScript (`exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`), pnpm workspaces, Next.js 15 (App Router, RSC), PostgreSQL via `pg` com RLS forçado, Vitest (projetos `node`/`jsdom`), Node 22, React 19, `@testing-library/react` para os componentes de `packages/ui-web`.

**Spec:** docs/superpowers/specs/2026-09-04-console-interno-design.md
**Design:** docs/superpowers/specs/2026-09-04-console-design-visual.md
**ADR:** docs/adr/0016-camadas-do-console-interno.md

## Global Constraints

- Worktree `/Users/clevesson-mendonca/orca/workspaces/albora-project/ceo-backoffice`, branch `feat/ceo-backoffice`. NUNCA tocar em `merganser`. Sem `git stash`.
- `TEST_DATABASE_URL=postgres://albora:albora@localhost:55432/albora_console` — o container 55432 é compartilhado com outra sessão e o harness faz `DROP SCHEMA public CASCADE`.
- `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `pnpm` E do `git commit` (Node do sistema é v16; pnpm recusa; hook husky quebra).
- **Nenhuma task roda `next build` ou `next start`.** Teste é Vitest.
- Símbolo novo em inglês (ADR 0014). Comentário em português.
- Migrations forward-only; próximo número livre após 0061 é **0062**.
- Rodar `pnpm guards` antes de cada commit (9 guards, inclusive `camadas` e `tokens`).
- Conventional Commits com escopo, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Contrato de camada — vale para TODA tela desta onda

```
apps/web/app/console/(shell)/<rota>/page.tsx   RSC: resolveActor() -> chama caso de uso -> renderiza
packages/application/src/<dominio>/            o caso de uso
packages/db/src/                                repositório
```

- A rota **nunca** importa `@albora/db` — o guard `camadas` reprova. Só `@albora/application`.
- Toda leitura passa por `executeQuery({actor, capability, run})` ou, se cruza contas/eventos, por `withPlatformAggregation({actor, capability, reason, run})`.
- Sem ator → o layout já redireciona para `/console/login` (Onda A, T14).
- Nenhum `role ===` fora de `packages/core/src/authorization/`.

## Notas de reconhecimento que mudam a execução

Achados do reconhecimento real do código, incorporados nas tasks abaixo:

1. **`analytics_snapshots` existe (migration 0032) mas não guarda série histórica.** `upsertAnalyticsSnapshot` é `INSERT ... ON CONFLICT (scope, scope_id, period) DO UPDATE` — cada `(scope, scope_id, period)` é UMA linha, sempre sobrescrita. `readAnalyticsSnapshot`/`materializePlatformSnapshot`/`collectPlatformLiveMetrics` (todos já existem em `packages/db/src/analytics.ts`) dão o KPI **atual**, nunca o de 7/30 dias atrás. Sparkline de 30 dias e linha de base do `MetricCard` (T2/T3) **não podem** vir de snapshot — são computados ao vivo, por janela de tempo, sobre `events.starts_at`/`uploads.created_at`/`guest_sessions`, dentro de `withPlatformAggregation`. Isso não é dado inventado: é a mesma tabela de sempre, filtrada por período — só não é a tabela de snapshot.
2. **H1 já é calculado hoje, por evento**, em `packages/db/src/analytics.ts` (`collectEventLiveMetrics` → `decidirTese({expectedGuests, sessoesComUpload})` → `veredito.taxa`, de `packages/core/src/funnel.ts`, `taxaDeParticipacao = sessoesComUpload / expectedGuests`). Usado hoje em `/ops/events` (`OpsEventAggregates`). T6 reaproveita a mesma fórmula para a coluna "H1 do evento". **Não existe** hoje H1 agregado de plataforma — `collectPlatformLiveMetrics`/`PlatformLiveMetrics` não tem campo `participacao` nenhum. `packages/core/src/funnel.ts` já tem a função pronta para isso — `readPlatform`/`participationRate` (alias inglês de `lerPlataforma`/`taxaDeParticipacao`) recebe `{expectedGuests, sessoesComUpload}` agregados e devolve a taxa — só falta a query que soma isso cross-evento. T2 escreve essa query nova.
3. **`events` tem RLS por `event_id` (0001) MAIS uma segunda porta por `account_id` (0013, `conta_evento`) MAIS uma terceira por `event_members` (0034)** — políticas permissivas se somam por OR. Isso resolve a leitura de "meus eventos" para o anfitrião via `comConta`, mas **não ajuda o console**: staff não tem `accounts.id`, e mesmo se tivesse, ler eventos de UMA conta pelo ator do staff não é "a conta vendo os próprios dados" — é o staff cruzando a fronteira de tenant de outra conta, que é exatamente o caso que `withPlatformAggregation` existe para cobrir (confirmado pelo padrão já usado em `eventosDoFornecedor`/`resumoDoFornecedor`, que usam `comAgregacao` mesmo para o portal de UM fornecedor). **Toda leitura de evento(s) nesta onda — lista ou detalhe, de uma conta ou de todas — passa por `withPlatformAggregation`.**
4. **`accounts`, `vendors`, `vendor_subscriptions`, `billing_payments`, `retention_jobs` não têm RLS de evento** (só `vendors` tem RLS própria por `vendor_id`/`vendor_members`, migration 0037). Tecnicamente dariam para ler direto pelo pool da aplicação. Mesmo assim, toda leitura cross-conta desta onda usa `withPlatformAggregation` uniformemente — é a política do ADR (§6.5) e o que fica auditado; misturar "esta tabela não precisa mas aquela precisa" é a inconsistência que o ADR pede para evitar.
5. **`audit_log`/`security_events` não têm RLS nenhuma** (migration 0060 não declara `ENABLE ROW LEVEL SECURITY` nelas — são tabelas globais por desenho, não "cross-tenant" no sentido do ADR). T9/T10 usam `executeQuery` puro (pool normal via `getPool()`), não `withPlatformAggregation`.
6. **`vendor_subscriptions` não tem coluna de próxima cobrança nem de valor.** Preço por tier vem de `VENDOR_PLAN_PRICE_CENTS`, hoje em `apps/web/lib/billing/types.ts` — camada errada para `packages/application` importar (`app → application`, nunca o contrário). T2 duplica os três valores como constante local em `packages/application/src/analytics/revenue.ts`, com comentário apontando a fonte canônica — mesmo padrão do rate-limiter da Onda A (T10, nota 6). "Próxima cobrança" e "atraso em dias exatos" não têm coluna — ver Lacunas.
7. **`listOpenSupportTicketsAdmin`/`listDueRetentionJobs` já existem mas não servem à Onda B como estão.** O primeiro exige `comConta(pool, operatorAccountId, ...)` — staff não tem `accounts.id`; T2 usa `collectPlatformLiveMetrics(pool).openTickets` (contagem simples, já correto para BYPASSRLS) em vez de reescrever a fila. O segundo só devolve jobs **due agora** (`WHERE due_at <= now()`) — a tela de Retenção (T8) precisa de pendentes (due ou não), concluídos e falhados; T8 adiciona `listRetentionJobsAdmin` em vez de reaproveitar `listDueRetentionJobs`, que continua servindo só ao runner.
8. **`DataTable` pagina só em memória** — recebe `rows: T[]` inteiro e faz slice client-side; não tem `page`/`onPageChange` externo. Paginação por cursor (Contas T4, Auditoria T9) não pode ser dirigida por `DataTable`: cada página do console busca UMA página de linhas do servidor (via `searchParams.cursor`) e um link "Próxima" fora do `DataTable` navega para `?cursor=...`; `DataTable` recebe só as linhas daquela página e usa `pageSize` igual ao tamanho da página para não paginar de novo por cima.
9. **Filtro/busca também não é interno ao `DataTable`** — ele só exibe o que recebe. Cada tela usa um wrapper cliente pequeno (`"use client"`) que lê `useSearchParams`, guarda o rascunho de filtro local, e ao aplicar chama `router.push` com a querystring nova — o servidor refaz a query filtrada. `FilterBar` (T1) é esse formulário; não filtra sozinho, só emite `onSearchChange`/`onFilterChange`.
10. **Reautenticação/impersonação/mutação (`executeCommand`) não entram nesta onda** — todo caso de uso novo usa só `executeQuery`/`withPlatformAggregation`.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `packages/ui-web/src/entity-header.tsx` | `EntityHeader` — identidade, status, ações |
| `packages/ui-web/src/entity-header.test.tsx` | Sem ações não renderiza a área de ações |
| `packages/ui-web/src/filter-bar.tsx` | `FilterBar` — busca + filtros + fichas removíveis |
| `packages/ui-web/src/filter-bar.test.tsx` | Emite remoção de ficha |
| `packages/ui-web/src/detail-panel.tsx` | `DetailPanel` — painel lateral com seções |
| `packages/ui-web/src/detail-panel.test.tsx` | Seção vazia não quebra |
| `packages/ui-web/src/index.ts` | Modificado: exporta os três primitivos |
| `packages/db/src/platform-analytics.ts` | Participação/funil/volume de plataforma, por janela, ao vivo |
| `packages/db/src/platform-analytics.test.ts` | Janela com/sem evento, série diária |
| `packages/db/src/index.ts` | Modificado: exporta `platform-analytics`, `accounts-admin`, `events-admin`, `subscriptions-admin`, `listRetentionJobsAdmin` |
| `packages/db/src/accounts-admin.ts` | `listAccountsAdmin` (cursor), `getAccountDetailAdmin` |
| `packages/db/src/accounts-admin.test.ts` | Tipo/plano/contagem por conta, cursor |
| `packages/db/src/events-admin.ts` | `listEventsAdmin` (cursor, H1 por evento), `getEventDetailAdmin` |
| `packages/db/src/events-admin.test.ts` | H1 por evento, zero PII de convidado |
| `packages/db/src/subscriptions-admin.ts` | `listVendorSubscriptionsAdmin`, `subscriptionsSummaryAdmin` |
| `packages/db/src/subscriptions-admin.test.ts` | MRR, inadimplência, churn 30d |
| `packages/db/src/retention-jobs.ts` | Modificado: `+listRetentionJobsAdmin` |
| `packages/db/src/retention-jobs.test.ts` | Modificado: pendente/concluído/falhado, sem filtro por `due_at` |
| `packages/application/src/analytics/types.ts` | `MetricWithBaseline<T>` |
| `packages/application/src/analytics/platform-overview.ts` | `getPlatformOverview` — H1, funil, volume, tickets |
| `packages/application/src/analytics/platform-overview.test.ts` | Autorização, baseline `null` sem período anterior |
| `packages/application/src/analytics/revenue.ts` | `getPlatformRevenue` — MRR, inadimplência, churn, canal |
| `packages/application/src/analytics/revenue.test.ts` | MRR soma preço só de ativas |
| `packages/application/src/accounts/list-accounts.ts` | `listAccounts` |
| `packages/application/src/accounts/list-accounts.test.ts` | Autorização `accounts.read`, cursor repassado |
| `packages/application/src/accounts/get-account.ts` | `getAccount` |
| `packages/application/src/accounts/get-account.test.ts` | E-mail mascarado, conta inexistente |
| `packages/application/src/events/list-events.ts` | `listEvents` |
| `packages/application/src/events/list-events.test.ts` | Autorização `events.read` |
| `packages/application/src/events/get-event.ts` | `getEvent` |
| `packages/application/src/events/get-event.test.ts` | Zero PII de convidado no retorno |
| `packages/application/src/subscriptions/list-subscriptions.ts` | `listSubscriptions` |
| `packages/application/src/subscriptions/list-subscriptions.test.ts` | Autorização `subscription.read` |
| `packages/application/src/retention/list-retention-jobs.ts` | `listRetentionJobs` |
| `packages/application/src/retention/list-retention-jobs.test.ts` | Autorização `retention.read` |
| `packages/application/src/audit/list-audit-log.ts` | `listAudit` |
| `packages/application/src/audit/list-audit-log.test.ts` | Autorização `audit.read`, sem agregação |
| `packages/application/src/security/list-security-events.ts` | `listSecurity` |
| `packages/application/src/security/list-security-events.test.ts` | Autorização `security.read` |
| `packages/application/src/index.ts` | Modificado: exporta os 8 casos de uso novos |
| `apps/web/app/console/(shell)/page.tsx` | Reescrito: Visão geral |
| `apps/web/app/console/(shell)/page.test.ts` | H1 sem base mostra `—`, funil com degrau crítico |
| `apps/web/app/console/(shell)/accounts/page.tsx` | Tela Contas |
| `apps/web/app/console/(shell)/accounts/page.test.ts` | E-mail mascarado na tabela |
| `apps/web/features/console/components/client/accounts-table.tsx` | Wrapper cliente: `FilterBar` + `DataTable` + navegação por cursor |
| `apps/web/app/console/(shell)/accounts/[id]/page.tsx` | Tela Conta — detalhe |
| `apps/web/app/console/(shell)/accounts/[id]/page.test.ts` | Três painéis, conta inexistente → `notFound()` |
| `apps/web/app/console/(shell)/events/page.tsx` | Tela Eventos |
| `apps/web/app/console/(shell)/events/page.test.ts` | Coluna H1 presente, zero PII |
| `apps/web/features/console/components/client/events-table.tsx` | Wrapper cliente da tabela de eventos |
| `apps/web/app/console/(shell)/events/[id]/page.tsx` | Detalhe do evento |
| `apps/web/app/console/(shell)/events/[id]/page.test.ts` | Funil e retenção do evento |
| `apps/web/app/console/(shell)/subscriptions/page.tsx` | Tela Assinaturas (só leitura) |
| `apps/web/app/console/(shell)/subscriptions/page.test.ts` | Atraso em `--critico`, sem ação de mutação |
| `apps/web/app/console/(shell)/retention/page.tsx` | Tela Retenção |
| `apps/web/app/console/(shell)/retention/page.test.ts` | Falhados destacados e clicáveis |
| `apps/web/app/console/(shell)/audit/page.tsx` | Tela Auditoria |
| `apps/web/app/console/(shell)/audit/page.test.ts` | Paginação por cursor, sem ação |
| `apps/web/app/console/(shell)/security/page.tsx` | Tela Segurança |
| `apps/web/app/console/(shell)/security/page.test.ts` | Agrupado por tipo, sem ação |

## Lacunas de dados encontradas no reconhecimento

| Métrica pedida pela spec | Fonte de dado existe? | O que a tela faz |
|---|---|---|
| H1 de plataforma (sparkline 30d + delta) | Não como snapshot — `analytics_snapshots` não guarda série. **Computável ao vivo** por janela sobre `events`/`uploads` (T2 escreve a query). | Mostra número e sparkline reais, computados por janela; se a janela anterior não tem nenhum evento, delta vira `—` (regra do `MetricCard`, não um caso novo). |
| H1 por evento | **Existe** — `collectEventLiveMetrics`/`decidirTese` já calculam. | Reaproveitado direto, sem nova fórmula. |
| Funil de ativação de plataforma | **Computável** — `funnel_events` tem `event_id`/`session_id`/`name`/`created_at`; T2 agrega cross-evento com `degraus()` de `@albora/core`, mesma função do funil por evento. | Real, não inventado. |
| MRR / assinaturas ativas | **Existe** parcialmente — `vendor_subscriptions.status`/`.plan` existem; preço por tier (`VENDOR_PLAN_PRICE_CENTS`) existe mas na camada errada (`apps/web/lib`). | T2 duplica a constante de preço em `packages/application` (mesmo padrão do rate-limiter da Onda A) — número real, não inventado, só resolvendo a camada. |
| Inadimplência (assinatura) | **Existe** como contagem (`status = 'overdue'`) — não existe valor em atraso, porque não há `amount_cents` em `vendor_subscriptions`. | Mostra contagem de assinaturas em atraso; **não** mostra valor em R$ de inadimplência — lacuna dura, precisa de coluna nova (fora do escopo desta onda, que é só leitura). |
| Churn 30d | **Aproximado** — não existe `canceled_at`; usa `updated_at` de `vendor_subscriptions` com `status = 'canceled'` como proxy do momento do cancelamento (é o único timestamp que muda quando o status muda). | Mostra o número com essa aproximação; **não** é uma lacuna vazia, é uma decisão documentada — se `updated_at` for tocado por outro motivo no futuro, o número passa a mentir e precisa de coluna dedicada. |
| "Próxima cobrança" por assinatura (T7) | **Não existe.** Nenhuma coluna de vencimento em `vendor_subscriptions`; o Asaas sabe, o banco local não guarda. | Coluna sempre mostra `—`. Lacuna dura — fora do escopo de leitura; fechar exige sincronizar do webhook ou uma chamada à API do Asaas (nenhuma das duas está no plano). |
| "Atraso" em dias por assinatura (T7) | **Aproximado** — `now() - updated_at` quando `status = 'overdue'`, mesma limitação do churn: só é exato se nada mais tocar `updated_at` enquanto em atraso. | Mostra a aproximação, rotulada como tal no código (comentário), nunca como fato exato. |
| "Último acesso" de conta (T4/T5) | **Aproximado** — `accounts` não tem `last_seen_at`; `host_sessions.created_at` marca emissão de sessão (login), não última requisição. `MAX(host_sessions.created_at)` é a aproximação mais próxima disponível. | Mostra "último acesso" como o login mais recente, não a última ação — mais preciso seria `last_used_at` em `host_sessions`, que não existe (diferente de `staff_sessions`, que ganhou isso na Onda A). Lacuna dura para precisão fina; aproximação documentada é aceitável para a tela. |
| "Consentimentos" no painel Identidade (T5) | **Existe** por evento (`aceitesDeEntradaPorVersao`) — não existe agregado cross-evento pronto para uma conta com mais de um evento. | T5 soma por evento da conta (normalmente 1, às vezes mais) chamando a função existente para cada `eventId` da conta — real, sem inventar. |
| Volume "convidados alcançados" (T3) | **Existe** — soma de `events.expected_guests` na janela. Não é "convidados que de fato abriram o link" (isso seria funil), é a estimativa do anfitrião. | Rotulado exatamente como a spec pede: "convidados alcançados" == expectativa somada, não confirmação de abertura — mesma semântica de `expected_guests` em todo o resto do produto. |

---

### Task 1: Primitivos de página da Onda B (`packages/ui-web`)

**Files:**
- Create: `packages/ui-web/src/entity-header.tsx`
- Test: `packages/ui-web/src/entity-header.test.tsx`
- Create: `packages/ui-web/src/filter-bar.tsx`
- Test: `packages/ui-web/src/filter-bar.test.tsx`
- Create: `packages/ui-web/src/detail-panel.tsx`
- Test: `packages/ui-web/src/detail-panel.test.tsx`
- Modify: `packages/ui-web/src/index.ts`

**Interfaces:**
- Consumes: `DataTableActiveFilter` de `./data-table` (reaproveitado pelo `FilterBar` — mesma forma de ficha removível que o `DataTable` já usa internamente); `StatusBadge` de `./status-badge`.
- Produces: `EntityHeader`, `FilterBar`, `DetailPanel` — T4-T10 importam de `@albora/ui-web`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// packages/ui-web/src/entity-header.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EntityHeader } from "./entity-header";

describe("EntityHeader", () => {
  it("sem ações não renderiza a área de ações", () => {
    render(<EntityHeader title="Maria & João" subtitle="Anfitrião" status={{ tone: "positive", label: "Ativo" }} />);
    expect(screen.queryByTestId("entity-header-actions")).not.toBeInTheDocument();
  });

  it("com ações renderiza a área de ações", () => {
    render(
      <EntityHeader
        title="Maria & João"
        subtitle="Anfitrião"
        status={{ tone: "positive", label: "Ativo" }}
        actions={<button type="button">Revelar contato</button>}
      />,
    );
    expect(screen.getByTestId("entity-header-actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revelar contato" })).toBeInTheDocument();
  });

  it("renderiza título, subtítulo e status", () => {
    render(<EntityHeader title="Maria & João" subtitle="Anfitrião" status={{ tone: "critico", label: "Suspenso" }} />);
    expect(screen.getByRole("heading", { name: "Maria & João" })).toBeInTheDocument();
    expect(screen.getByText("Anfitrião")).toBeInTheDocument();
    expect(screen.getByText("Suspenso")).toBeInTheDocument();
  });
});
```

```tsx
// packages/ui-web/src/filter-bar.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./filter-bar";

describe("FilterBar", () => {
  it("emite remoção de ficha", async () => {
    const onRemoveFilter = vi.fn();
    render(
      <FilterBar
        searchValue=""
        searchPlaceholder="conta, e-mail, id do evento"
        onSearchChange={() => {}}
        activeFilters={[{ key: "status", label: "Status: ativo" }]}
        onRemoveFilter={onRemoveFilter}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Status: ativo" }));
    expect(onRemoveFilter).toHaveBeenCalledWith("status");
  });

  it("digitar na busca emite onSearchChange", async () => {
    const onSearchChange = vi.fn();
    render(<FilterBar searchValue="" searchPlaceholder="conta" onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByPlaceholderText("conta"), "a");
    expect(onSearchChange).toHaveBeenCalledWith("a");
  });

  it("sem fichas ativas não renderiza a linha de fichas", () => {
    render(<FilterBar searchValue="" searchPlaceholder="conta" onSearchChange={() => {}} />);
    expect(screen.queryByTestId("filter-bar-chips")).not.toBeInTheDocument();
  });
});
```

```tsx
// packages/ui-web/src/detail-panel.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailPanel } from "./detail-panel";

describe("DetailPanel", () => {
  it("seção vazia não quebra e mostra o vazio da seção", () => {
    render(
      <DetailPanel
        title="Identidade"
        sections={[{ key: "consentimentos", label: "Consentimentos", content: null, emptyLabel: "Nenhum consentimento registrado" }]}
      />,
    );
    expect(screen.getByText("Nenhum consentimento registrado")).toBeInTheDocument();
  });

  it("seção com conteúdo renderiza o conteúdo, não o vazio", () => {
    render(
      <DetailPanel
        title="Atividade"
        sections={[{ key: "eventos", label: "Eventos", content: <p>1 evento</p>, emptyLabel: "Nenhum evento" }]}
      />,
    );
    expect(screen.getByText("1 evento")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum evento")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/ui-web exec vitest run src/entity-header.test.tsx src/filter-bar.test.tsx src/detail-panel.test.tsx`

Expected: FAIL com `Cannot find module './entity-header'` (e os dois outros).

- [ ] **Step 3: Implementar o mínimo**

```tsx
// packages/ui-web/src/entity-header.tsx
import type { ReactNode } from "react";
import { StatusBadge, type StatusBadgeTone } from "./status-badge";

export type EntityHeaderStatus = { tone: StatusBadgeTone; label: string };

/**
 * Cabeçalho de tela de detalhe: identidade, status e ações permitidas ao
 * ator — quem não tem a capacidade simplesmente não recebe `actions`, o
 * componente não decide permissão (ADR 0016 §5.5).
 */
export function EntityHeader({
  title,
  subtitle,
  status,
  actions,
}: {
  title: string;
  subtitle?: string;
  status: EntityHeaderStatus;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-linha pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="tipo-den-titulo m-0">{title}</h1>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        {subtitle && <p className="tipo-den-corpo m-0 text-ink-3">{subtitle}</p>}
      </div>
      {actions && (
        <div data-testid="entity-header-actions" className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
```

```tsx
// packages/ui-web/src/filter-bar.tsx
"use client";

import type { ReactNode } from "react";
import { cn } from "./variants";
import type { DataTableActiveFilter } from "./data-table";

/**
 * Busca + filtros + fichas removíveis (spec de design §8.0.2/§12 Onda B).
 * Não filtra sozinho — só emite `onSearchChange`/`onRemoveFilter`; quem
 * chama decide se isso vira uma query nova no servidor (cursor) ou um
 * filtro em memória (nota de reconhecimento 9).
 */
export function FilterBar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  activeFilters,
  onRemoveFilter,
}: {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  activeFilters?: DataTableActiveFilter[];
  onRemoveFilter?: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <input
            type="search"
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "min-h-11 w-full rounded-token border border-linha bg-superficie px-3.5 text-ink outline-none",
              "placeholder:text-ink-3",
              "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto",
            )}
          />
        </label>
        {filters}
      </div>
      {activeFilters && activeFilters.length > 0 && (
        <div data-testid="filter-bar-chips" className="flex flex-wrap gap-2">
          {activeFilters.map((filtro) => (
            <span
              key={filtro.key}
              className="tipo-caption inline-flex items-center gap-1.5 rounded-pilula border border-acento bg-acento-superficie px-3 py-1 text-acento-texto"
            >
              {filtro.label}
              <button
                type="button"
                onClick={() => onRemoveFilter?.(filtro.key)}
                aria-label={`Remover filtro ${filtro.label}`}
                className="relative flex size-4 items-center justify-center rounded-full before:absolute before:-inset-3 before:content-['']"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

```tsx
// packages/ui-web/src/detail-panel.tsx
import type { ReactNode } from "react";

export type DetailPanelSection = {
  key: string;
  label: string;
  content: ReactNode;
  /** Mostrado quando `content` é `null`/`undefined` — nunca "Sem dados". */
  emptyLabel: string;
};

/** Painel lateral de detalhe com título e seções (spec §8.1.3) — cada seção é vazia-ou-conteúdo, nunca ambos. */
export function DetailPanel({ title, sections }: { title: string; sections: DetailPanelSection[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-linha bg-superficie p-5">
      <h2 className="tipo-den-titulo m-0">{title}</h2>
      {sections.map((secao) => (
        <div key={secao.key} className="flex flex-col gap-2 border-t border-linha pt-4 first:border-t-0 first:pt-0">
          <span className="tipo-den-rotulo text-ink-3">{secao.label}</span>
          {secao.content ?? <p className="tipo-den-corpo m-0 text-ink-3">{secao.emptyLabel}</p>}
        </div>
      ))}
    </section>
  );
}
```

Modificar `packages/ui-web/src/index.ts` — adicionar:

```ts
export { EntityHeader, type EntityHeaderStatus } from "./entity-header";
export { FilterBar } from "./filter-bar";
export { DetailPanel, type DetailPanelSection } from "./detail-panel";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/ui-web exec vitest run src/entity-header.test.tsx src/filter-bar.test.tsx src/detail-panel.test.tsx && pnpm --filter @albora/ui-web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/ui-web/src/entity-header.tsx packages/ui-web/src/entity-header.test.tsx \
        packages/ui-web/src/filter-bar.tsx packages/ui-web/src/filter-bar.test.tsx \
        packages/ui-web/src/detail-panel.tsx packages/ui-web/src/detail-panel.test.tsx \
        packages/ui-web/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui-web): primitivos de página da Onda B

EntityHeader (identidade+status+ações), FilterBar (busca+fichas
removíveis, não filtra sozinho) e DetailPanel (seções vazio-ou-conteúdo).
Spec de design §12: os três primitivos que a Onda B introduz.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Casos de uso de analytics (`packages/application/src/analytics/`)

**Files:**
- Create: `packages/db/src/platform-analytics.ts`
- Test: `packages/db/src/platform-analytics.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/analytics/types.ts`
- Create: `packages/application/src/analytics/platform-overview.ts`
- Test: `packages/application/src/analytics/platform-overview.test.ts`
- Create: `packages/application/src/analytics/revenue.ts`
- Test: `packages/application/src/analytics/revenue.test.ts`
- Modify: `packages/application/src/index.ts`

**Interfaces:**
- Consumes: `withPlatformAggregation` (Onda A); `degraus`, `ehEventoDoFunil`, `readPlatform`, `type EventoDoFunil`, `type DegrauDoFunil` de `@albora/core`; `collectPlatformLiveMetrics` de `@albora/db` (Onda 0032, já existe — reaproveitado para `openTickets`).
- Produces: `platformParticipationInWindow`, `platformParticipationDailySeries`, `platformFunnelInWindow`, `platformVolumeInWindow` (`@albora/db`); `MetricWithBaseline<T>`, `getPlatformOverview`, `getPlatformRevenue` (`@albora/application`) — T3 importa `getPlatformOverview`/`getPlatformRevenue`, T6 reaproveita `collectEventLiveMetrics` (já existente, não deste task).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/platform-analytics.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  platformFunnelInWindow,
  platformParticipationDailySeries,
  platformParticipationInWindow,
  platformVolumeInWindow,
} from "./platform-analytics";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

describe("platformParticipationInWindow", () => {
  it("soma expected_guests e sessões-com-upload só dos eventos na janela", async () => {
    const { a, b } = await semear(admin);
    await admin.query("UPDATE events SET expected_guests = 100, starts_at = now() - interval '1 day' WHERE id = $1", [a.eventoId]);
    await admin.query("UPDATE events SET expected_guests = 50, starts_at = now() - interval '40 days' WHERE id = $1", [b.eventoId]);

    const janela = await platformParticipationInWindow(agregador, {
      from: new Date(Date.now() - 7 * 86_400_000),
      to: new Date(),
    });

    expect(janela.expectedGuests).toBe(100);
    expect(janela.sessoesComUpload).toBe(1);
  });

  it("janela sem evento nenhum devolve zeros, não erro", async () => {
    await prepararBanco();
    const janela = await platformParticipationInWindow(agregador, {
      from: new Date(Date.now() - 86_400_000),
      to: new Date(),
    });
    expect(janela).toEqual({ expectedGuests: 0, sessoesComUpload: 0 });
  });
});

describe("platformParticipationDailySeries", () => {
  it("devolve um ponto por dia, taxa null quando não há evento no dia", async () => {
    await prepararBanco();
    const serie = await platformParticipationDailySeries(agregador, 5);
    expect(serie).toHaveLength(5);
    expect(serie.every((p) => p.rate === null)).toBe(true);
  });
});

describe("platformFunnelInWindow", () => {
  it("agrega degraus cross-evento a partir de funnel_events", async () => {
    const { a } = await semear(admin);
    await admin.query(
      `INSERT INTO funnel_events (event_id, session_id, name) VALUES ($1, $2, 'qr_scan'), ($1, $2, 'page_open'), ($1, $2, 'consent')`,
      [a.eventoId, a.sessaoId],
    );
    const degraus = await platformFunnelInWindow(agregador, {
      from: new Date(Date.now() - 86_400_000),
      to: new Date(Date.now() + 86_400_000),
    });
    const consent = degraus.find((d) => d.etapa === "consent");
    expect(consent?.sessoes).toBe(1);
  });
});

describe("platformVolumeInWindow", () => {
  it("conta eventos e fotos na janela", async () => {
    const { a } = await semear(admin);
    const volume = await platformVolumeInWindow(agregador, {
      from: new Date(0),
      to: new Date(Date.now() + 86_400_000),
    });
    expect(volume.eventsCreated).toBeGreaterThanOrEqual(1);
    expect(volume.photos).toBeGreaterThanOrEqual(1);
    void a;
  });
});
```

```ts
// packages/application/src/analytics/platform-overview.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { getPlatformOverview } from "./platform-overview";
import { prepararBanco, semear } from "@albora/db/testes/banco";

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

function actor(roles: string[] = ["owner"]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("getPlatformOverview", () => {
  it("nega quem não tem analytics.platform.read", async () => {
    await expect(
      getPlatformOverview(
        { pool: app, aggregatorPool: agregador },
        { actor: actor(["support"] as never), reason: "abrir /console", days: 30 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("sem evento nenhum no banco -> H1 atual e baseline vêm null, não 0/0 fingindo dado", async () => {
    await prepararBanco(); // reseta o schema — nenhum evento semeado nesta suíte
    const overview = await getPlatformOverview(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir /console", days: 30 },
    );
    expect(overview.h1.current).toBeNull();
    expect(overview.h1.baseline).toBeNull();
  });

  it("evento com expected_guests e upload na janela produz H1 real, não null", async () => {
    const { a } = await semear(admin);
    await admin.query("UPDATE events SET expected_guests = 10, starts_at = now() - interval '1 day' WHERE id = $1", [a.eventoId]);

    const overview = await getPlatformOverview(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(), reason: "abrir /console", days: 30 },
    );

    expect(overview.h1.current).toBeCloseTo(1 / 10, 5);
  });
});
```

```ts
// packages/application/src/analytics/revenue.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { getPlatformRevenue, VENDOR_PLAN_PRICE_CENTS } from "./revenue";
import { prepararBanco } from "@albora/db/testes/banco";

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

function actor(roles: string[] = ["owner"]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

async function criarFornecedorComAssinatura(status: string, plan: "starter" | "studio" | "agency") {
  const { rows: v } = await admin.query("INSERT INTO vendors (name, plan) VALUES ('Fornecedor', $1) RETURNING id", [plan]);
  const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `fornecedor-${Math.random()}@exemplo.test`,
  ]);
  await admin.query(
    `INSERT INTO vendor_subscriptions (vendor_id, account_id, asaas_subscription_id, status, plan)
     VALUES ($1, $2, $3, $4, $5)`,
    [v[0]!.id, acc[0]!.id, `sub-${Math.random()}`, status, plan],
  );
}

describe("getPlatformRevenue", () => {
  it("nega quem não tem analytics.platform.read", async () => {
    await expect(
      getPlatformRevenue({ pool: app, aggregatorPool: agregador }, { actor: actor(["compliance"] as never), reason: "abrir /console" }),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("MRR soma só o preço das assinaturas ativas", async () => {
    await prepararBanco();
    await criarFornecedorComAssinatura("active", "starter");
    await criarFornecedorComAssinatura("active", "starter");
    await criarFornecedorComAssinatura("overdue", "studio");

    const revenue = await getPlatformRevenue({ pool: app, aggregatorPool: agregador }, { actor: actor(), reason: "abrir /console" });

    expect(revenue.mrrCents).toBe(2 * VENDOR_PLAN_PRICE_CENTS.starter);
    expect(revenue.overdueCount).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/platform-analytics.test.ts && pnpm --filter @albora/application exec vitest run src/analytics/platform-overview.test.ts src/analytics/revenue.test.ts`

Expected: FAIL com `Cannot find module './platform-analytics'` e `Cannot find module './platform-overview'`/`./revenue`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/platform-analytics.ts
import type { Pool } from "pg";
import { degraus, ehEventoDoFunil, type DegrauDoFunil, type EventoDoFunil } from "@albora/core";

export type PlatformParticipationWindow = { expectedGuests: number; sessoesComUpload: number };

/** Janela sobre `events.starts_at`/`uploads.created_at` — sem PII, cross-evento (pool BYPASSRLS). */
export async function platformParticipationInWindow(
  pool: Pool,
  janela: { from: Date; to: Date },
): Promise<PlatformParticipationWindow> {
  const [{ rows: esperados }, { rows: uploads }] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT coalesce(sum(expected_guests), 0)::int AS total
         FROM events WHERE starts_at >= $1 AND starts_at < $2`,
      [janela.from, janela.to],
    ),
    pool.query<{ total: number }>(
      `SELECT count(DISTINCT u.session_id)::int AS total
         FROM uploads u JOIN events ev ON ev.id = u.event_id
        WHERE ev.starts_at >= $1 AND ev.starts_at < $2`,
      [janela.from, janela.to],
    ),
  ]);
  return { expectedGuests: esperados[0]?.total ?? 0, sessoesComUpload: uploads[0]?.total ?? 0 };
}

export type PlatformParticipationDay = { date: string; rate: number | null };

/** Um ponto por dia dos últimos `dias` — `rate` null quando nenhum evento começou naquele dia (sem denominador honesto). */
export async function platformParticipationDailySeries(pool: Pool, dias: number): Promise<PlatformParticipationDay[]> {
  const [{ rows: porDiaEsperados }, { rows: porDiaUploads }] = await Promise.all([
    pool.query<{ dia: string; total: number }>(
      `SELECT to_char(date_trunc('day', starts_at), 'YYYY-MM-DD') AS dia, sum(expected_guests)::int AS total
         FROM events
        WHERE starts_at >= current_date - ($1::int - 1) AND starts_at < current_date + interval '1 day'
        GROUP BY 1`,
      [dias],
    ),
    pool.query<{ dia: string; total: number }>(
      `SELECT to_char(date_trunc('day', ev.starts_at), 'YYYY-MM-DD') AS dia, count(DISTINCT u.session_id)::int AS total
         FROM uploads u JOIN events ev ON ev.id = u.event_id
        WHERE ev.starts_at >= current_date - ($1::int - 1) AND ev.starts_at < current_date + interval '1 day'
        GROUP BY 1`,
      [dias],
    ),
  ]);

  const esperadosPorDia = new Map(porDiaEsperados.map((r) => [r.dia, r.total]));
  const uploadsPorDia = new Map(porDiaUploads.map((r) => [r.dia, r.total]));

  const pontos: PlatformParticipationDay[] = [];
  for (let i = dias - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const chave = d.toISOString().slice(0, 10);
    const esperados = esperadosPorDia.get(chave) ?? 0;
    const uploads = uploadsPorDia.get(chave) ?? 0;
    pontos.push({ date: chave, rate: esperados > 0 ? uploads / esperados : null });
  }
  return pontos;
}

/** Mesma `degraus()` do funil por evento (`@albora/core`), só que a sessão vem de qualquer evento na janela — cross-tenant por desenho. */
export async function platformFunnelInWindow(pool: Pool, janela: { from: Date; to: Date }): Promise<DegrauDoFunil[]> {
  const { rows } = await pool.query<{ session_id: string; name: string }>(
    `SELECT fe.session_id, fe.name
       FROM funnel_events fe JOIN events ev ON ev.id = fe.event_id
      WHERE fe.session_id IS NOT NULL AND ev.starts_at >= $1 AND ev.starts_at < $2
      ORDER BY fe.session_id, fe.created_at ASC, fe.id ASC`,
    [janela.from, janela.to],
  );

  const porSessao = new Map<string, EventoDoFunil[]>();
  for (const linha of rows) {
    if (!ehEventoDoFunil(linha.name)) continue;
    const lista = porSessao.get(linha.session_id) ?? [];
    lista.push(linha.name);
    porSessao.set(linha.session_id, lista);
  }
  return degraus([...porSessao.values()]);
}

export type PlatformVolumeWindow = { eventsCreated: number; guestsReached: number; photos: number };

export async function platformVolumeInWindow(pool: Pool, janela: { from: Date; to: Date }): Promise<PlatformVolumeWindow> {
  const { rows } = await pool.query<{ events_created: number; guests_reached: number; photos: number }>(
    `SELECT
        (SELECT count(*)::int FROM events WHERE starts_at >= $1 AND starts_at < $2) AS events_created,
        (SELECT coalesce(sum(expected_guests), 0)::int FROM events WHERE starts_at >= $1 AND starts_at < $2) AS guests_reached,
        (SELECT count(*)::int FROM uploads u JOIN events ev ON ev.id = u.event_id
          WHERE ev.starts_at >= $1 AND ev.starts_at < $2) AS photos`,
    [janela.from, janela.to],
  );
  const r = rows[0];
  return { eventsCreated: r?.events_created ?? 0, guestsReached: r?.guests_reached ?? 0, photos: r?.photos ?? 0 };
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type { PlatformParticipationDay, PlatformParticipationWindow, PlatformVolumeWindow } from "./platform-analytics";
export {
  platformFunnelInWindow,
  platformParticipationDailySeries,
  platformParticipationInWindow,
  platformVolumeInWindow,
} from "./platform-analytics";
```

```ts
// packages/application/src/analytics/types.ts
/** `MetricCard` exige as duas — sem `baseline` honesto, o cartão mostra `—`, nunca inventa tendência. */
export type MetricWithBaseline<T> = { current: T; baseline: T | null };
```

```ts
// packages/application/src/analytics/platform-overview.ts
import type { Pool } from "pg";
import type { Actor, DegrauDoFunil } from "@albora/core";
import {
  collectPlatformLiveMetrics,
  platformFunnelInWindow,
  platformParticipationDailySeries,
  platformParticipationInWindow,
  platformVolumeInWindow,
  type PlatformParticipationDay,
} from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";
import type { MetricWithBaseline } from "./types";

export type PlatformOverviewInput = { actor: Actor; reason: string; days: number };

export type PlatformOverview = {
  h1: MetricWithBaseline<number>;
  h1Series: PlatformParticipationDay[];
  eventsActive: MetricWithBaseline<number>;
  guestsReached: MetricWithBaseline<number>;
  photos: MetricWithBaseline<number>;
  openTickets: number;
  funnel: DegrauDoFunil[];
};

function participationRateOrNull(janela: { expectedGuests: number; sessoesComUpload: number }): number | null {
  return janela.expectedGuests > 0 ? janela.sessoesComUpload / janela.expectedGuests : null;
}

/** Único caso de uso da Visão geral: H1 (com sparkline), funil de ativação e volume, todos por janela ao vivo (nota de reconhecimento 1). */
export async function getPlatformOverview(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: PlatformOverviewInput,
): Promise<PlatformOverview> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "analytics.platform.read",
    reason: input.reason,
    action: "analytics.platform_overview.read",
    run: async (client) => {
      const now = new Date();
      const inicioAtual = new Date(now.getTime() - input.days * 86_400_000);
      const inicioAnterior = new Date(inicioAtual.getTime() - input.days * 86_400_000);

      const [atual, anterior, serie, funil, volumeAtual, volumeAnterior, live] = await Promise.all([
        platformParticipationInWindow(deps.aggregatorPool, { from: inicioAtual, to: now }),
        platformParticipationInWindow(deps.aggregatorPool, { from: inicioAnterior, to: inicioAtual }),
        platformParticipationDailySeries(deps.aggregatorPool, 30),
        platformFunnelInWindow(deps.aggregatorPool, { from: inicioAtual, to: now }),
        platformVolumeInWindow(deps.aggregatorPool, { from: inicioAtual, to: now }),
        platformVolumeInWindow(deps.aggregatorPool, { from: inicioAnterior, to: inicioAtual }),
        collectPlatformLiveMetrics(deps.aggregatorPool, input.days),
      ]);
      void client;

      return {
        h1: { current: participationRateOrNull(atual), baseline: participationRateOrNull(anterior) },
        h1Series: serie,
        eventsActive: { current: volumeAtual.eventsCreated, baseline: volumeAnterior.eventsCreated || null },
        guestsReached: { current: volumeAtual.guestsReached, baseline: volumeAnterior.guestsReached || null },
        photos: { current: volumeAtual.photos, baseline: volumeAnterior.photos || null },
        openTickets: live.openTickets,
        funnel: funil,
      };
    },
  });
}
```

```ts
// packages/application/src/analytics/revenue.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { withPlatformAggregation } from "../platform/aggregation";

/**
 * Duplicado de `apps/web/lib/billing/types.ts` — `packages/application` não
 * pode importar de `apps/web` (direção é `app → application`, nunca o
 * contrário). Mesmo padrão do rate-limiter da Onda A (T10, nota 6). Se o
 * preço mudar lá, muda aqui também — os dois lados citam um ao outro em
 * comentário.
 * @see apps/web/lib/billing/types.ts VENDOR_PLAN_PRICE_CENTS
 */
export const VENDOR_PLAN_PRICE_CENTS: Record<"starter" | "studio" | "agency", number> = {
  starter: 9900,
  studio: 24900,
  agency: 59900,
};

export type PlatformRevenue = {
  mrrCents: number;
  activeSubscriptions: number;
  overdueCount: number;
  /** Proxy: `updated_at` de assinatura cancelada nos últimos 30 dias — sem `canceled_at` dedicado (Lacunas). */
  churned30dCount: number;
  vendorsByPlan: { plan: string; count: number }[];
};

export type PlatformRevenueInput = { actor: Actor; reason: string };

export async function getPlatformRevenue(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: PlatformRevenueInput,
): Promise<PlatformRevenue> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "analytics.platform.read",
    reason: input.reason,
    action: "analytics.revenue.read",
    run: async () => {
      const { rows: porPlanoEStatus } = await deps.aggregatorPool.query<{
        plan: "starter" | "studio" | "agency";
        status: "pending" | "active" | "overdue" | "canceled";
        n: number;
      }>(`SELECT plan, status, count(*)::int AS n FROM vendor_subscriptions GROUP BY plan, status`);

      const { rows: porPlanoVendor } = await deps.aggregatorPool.query<{ plan: string; n: number }>(
        `SELECT plan, count(*)::int AS n FROM vendors GROUP BY plan`,
      );

      const { rows: churn } = await deps.aggregatorPool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM vendor_subscriptions
          WHERE status = 'canceled' AND updated_at >= now() - interval '30 days'`,
      );

      let mrrCents = 0;
      let activeSubscriptions = 0;
      let overdueCount = 0;
      for (const linha of porPlanoEStatus) {
        if (linha.status === "active") {
          mrrCents += VENDOR_PLAN_PRICE_CENTS[linha.plan] * linha.n;
          activeSubscriptions += linha.n;
        }
        if (linha.status === "overdue") overdueCount += linha.n;
      }

      return {
        mrrCents,
        activeSubscriptions,
        overdueCount,
        churned30dCount: churn[0]?.n ?? 0,
        vendorsByPlan: porPlanoVendor.map((r) => ({ plan: r.plan, count: r.n })),
      };
    },
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { MetricWithBaseline } from "./analytics/types";
export type { PlatformOverview, PlatformOverviewInput } from "./analytics/platform-overview";
export { getPlatformOverview } from "./analytics/platform-overview";
export type { PlatformRevenue, PlatformRevenueInput } from "./analytics/revenue";
export { getPlatformRevenue, VENDOR_PLAN_PRICE_CENTS } from "./analytics/revenue";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/platform-analytics.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application exec vitest run src/analytics/platform-overview.test.ts src/analytics/revenue.test.ts && pnpm --filter @albora/application typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/platform-analytics.ts packages/db/src/platform-analytics.test.ts packages/db/src/index.ts \
        packages/application/src/analytics packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(application): casos de uso de analytics de plataforma

H1, funil e volume computados ao vivo por janela de tempo — analytics_snapshots
(migration 0032) não guarda série histórica, então sparkline/baseline vêm de
events/uploads/funnel_events direto, sob withPlatformAggregation. Receita
(MRR/inadimplência/churn) duplica VENDOR_PLAN_PRICE_CENTS na camada certa.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Tela Visão geral (`/console`)

**Files:**
- Modify: `apps/web/app/console/(shell)/page.tsx`
- Test: `apps/web/app/console/(shell)/page.test.ts`

**Interfaces:**
- Consumes: `resolveActor` (`@/lib/console/actor`), `getPlatformOverview`/`getPlatformRevenue` (`@albora/application`), `getPool`/`getAggregatorPool` (`@/lib/db`), `MetricCard`/`Sparkline`/`BarChart`/`PageHeader`/`ConsoleEmptyState` (`@albora/ui-web`).
- Produces: `ConsolePage` — substitui o placeholder da Onda A.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/app/console/(shell)/page.test.ts
import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, getPlatformOverviewMock, getPlatformRevenueMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  getPlatformOverviewMock: vi.fn(),
  getPlatformRevenueMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({
  getPlatformOverview: getPlatformOverviewMock,
  getPlatformRevenue: getPlatformRevenueMock,
}));

import ConsolePage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("ConsolePage", () => {
  it("H1 sem baseline honesto mostra MetricCard sem período anterior", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getPlatformOverviewMock.mockResolvedValueOnce({
      h1: { current: null, baseline: null },
      h1Series: [],
      eventsActive: { current: 3, baseline: null },
      guestsReached: { current: 300, baseline: null },
      photos: { current: 900, baseline: null },
      openTickets: 2,
      funnel: [],
    });
    getPlatformRevenueMock.mockResolvedValueOnce({
      mrrCents: 0,
      activeSubscriptions: 0,
      overdueCount: 0,
      churned30dCount: 0,
      vendorsByPlan: [],
    });

    const element = await ConsolePage();
    expect(JSON.stringify(element)).toContain("sem período anterior");
  });

  it("degrau com maior perda vem destacado como crítico", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getPlatformOverviewMock.mockResolvedValueOnce({
      h1: { current: 0.42, baseline: 0.38 },
      h1Series: [{ date: "2026-09-01", rate: 0.4 }],
      eventsActive: { current: 3, baseline: 2 },
      guestsReached: { current: 300, baseline: 200 },
      photos: { current: 900, baseline: 700 },
      openTickets: 2,
      funnel: [
        { etapa: "qr_scan", sessoes: 100, retencao: null },
        { etapa: "consent", sessoes: 40, retencao: 0.4 },
      ],
    });
    getPlatformRevenueMock.mockResolvedValueOnce({
      mrrCents: 9900,
      activeSubscriptions: 1,
      overdueCount: 0,
      churned30dCount: 0,
      vendorsByPlan: [{ plan: "starter", count: 1 }],
    });

    const element = await ConsolePage();
    expect(JSON.stringify(element)).toContain("var(--critico)");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run "app/console/(shell)/page.test.ts"`

Expected: FAIL — `ConsolePage` atual é o placeholder (`<p>Visão geral chega na Onda B.</p>`), sem `MetricCard`/funil algum; o teste não encontra "sem período anterior" nem "var(--critico)".

- [ ] **Step 3: Implementar o mínimo**

```tsx
// apps/web/app/console/(shell)/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getPlatformOverview, getPlatformRevenue } from "@albora/application";
import { BarChart, MetricCard, PageHeader, Sparkline } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatarPercentual(v: number | null): { valor: string; numerico: number } {
  if (v === null) return { valor: "—", numerico: 0 };
  return { valor: `${Math.round(v * 100)}%`, numerico: Math.round(v * 100) };
}

export default async function ConsolePage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console — visão geral do dono";

  const [overview, revenue] = await Promise.all([
    getPlatformOverview(deps, { actor, reason, days: 30 }),
    getPlatformRevenue(deps, { actor, reason }),
  ]);

  const h1 = formatarPercentual(overview.h1.current);
  const h1Anterior = overview.h1.baseline === null ? undefined : Math.round(overview.h1.baseline * 100);

  const maiorPerda = overview.funnel.reduce<{ etapa: string; perda: number } | null>((pior, degrau, i, lista) => {
    const anterior = lista[i - 1];
    if (!anterior) return pior;
    const perda = anterior.sessoes - degrau.sessoes;
    if (perda <= 0) return pior;
    if (!pior || perda > pior.perda) return { etapa: degrau.etapa, perda };
    return pior;
  }, null);

  return (
    <>
      <PageHeader title="Visão geral" description="Saúde do negócio nos últimos 30 dias." />

      <section className="mb-8 rounded-2xl border border-linha bg-superficie p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="tipo-den-rotulo text-ink-3">H1 — PARTICIPAÇÃO</span>
            <span className="tipo-den-metrica text-[2.5rem] text-ink">{h1.valor}</span>
            <p className="tipo-den-corpo m-0 max-w-md text-ink-3">
              % de convidados presentes que enviaram ao menos uma foto. É a métrica que decide se o negócio existe.
            </p>
          </div>
          <Sparkline
            label="H1 nos últimos 30 dias"
            points={overview.h1Series.map((p) => ({ label: p.date, value: p.rate ?? 0 }))}
            width={220}
            height={56}
          />
        </div>
        <MetricCard
          rotulo="H1 vs. período anterior"
          valor={h1.valor}
          valorNumerico={h1.numerico}
          anterior={h1Anterior}
          bomQuando="sobe"
          janela="Últimos 30 dias"
        />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          rotulo="Eventos ativos"
          valor={String(overview.eventsActive.current)}
          valorNumerico={overview.eventsActive.current}
          anterior={overview.eventsActive.baseline ?? undefined}
          bomQuando="sobe"
          janela="Últimos 30 dias"
        />
        <MetricCard
          rotulo="Convidados alcançados"
          valor={String(overview.guestsReached.current)}
          valorNumerico={overview.guestsReached.current}
          anterior={overview.guestsReached.baseline ?? undefined}
          bomQuando="sobe"
          janela="Últimos 30 dias"
        />
        <MetricCard
          rotulo="MRR"
          valor={`R$ ${(revenue.mrrCents / 100).toFixed(2)}`}
          valorNumerico={revenue.mrrCents}
          bomQuando="sobe"
          janela="Assinaturas ativas"
        />
        <MetricCard
          rotulo="Tickets abertos"
          valor={String(overview.openTickets)}
          valorNumerico={overview.openTickets}
          bomQuando="desce"
          janela="Agora"
        />
      </section>

      <section className="mb-8">
        <h2 className="tipo-den-titulo mb-3">Funil de ativação</h2>
        {overview.funnel.length === 0 ? (
          <p className="tipo-den-corpo text-ink-3">Sem sessões suficientes na janela para montar o funil.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {overview.funnel.map((degrau) => (
              <div
                key={degrau.etapa}
                className="flex min-w-[8rem] flex-col gap-1 rounded-token border border-linha bg-superficie p-3"
                style={maiorPerda?.etapa === degrau.etapa ? { borderColor: "var(--critico)" } : undefined}
              >
                <span className="tipo-den-rotulo text-ink-3">{degrau.etapa}</span>
                <span className="tipo-den-dado text-ink">{degrau.sessoes}</span>
                <span className="tipo-den-corpo text-ink-3">
                  {degrau.retencao === null ? "—" : `${Math.round(degrau.retencao * 100)}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="tipo-den-titulo mb-3">Canal B2B2C</h2>
        <BarChart
          label="Fornecedores por plano"
          points={revenue.vendorsByPlan.map((v) => ({ label: v.plan, value: v.count }))}
        />
      </section>
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run "app/console/(shell)/page.test.ts" && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add "apps/web/app/console/(shell)/page.tsx" "apps/web/app/console/(shell)/page.test.ts"
git commit -m "$(cat <<'EOF'
feat(console): tela Visão geral — H1, funil, volume, canal

Substitui o placeholder da Onda A. Ordem da spec de design §8.1.1: H1 em
destaque com sparkline, faixa de métricas, funil com o maior degrau de
perda em --critico, canal B2B2C. Sem base honesta, MetricCard mostra —.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Casos de uso + tela Contas (`/console/accounts`)

**Files:**
- Create: `packages/db/src/accounts-admin.ts`
- Test: `packages/db/src/accounts-admin.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/accounts/list-accounts.ts`
- Test: `packages/application/src/accounts/list-accounts.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/accounts/page.tsx`
- Test: `apps/web/app/console/(shell)/accounts/page.test.ts`
- Create: `apps/web/features/console/components/client/accounts-table.tsx`

**Interfaces:**
- Consumes: `withPlatformAggregation` (`@albora/application`); `DataTable`, `FilterBar` (T1), `PageHeader`, `ConsoleEmptyState` (`@albora/ui-web`).
- Produces: `AccountAdminRow`, `listAccountsAdmin` (`@albora/db`); `listAccounts` (`@albora/application`) — T5 reaproveita `AccountAdminRow`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/accounts-admin.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listAccountsAdmin } from "./accounts-admin";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

describe("listAccountsAdmin", () => {
  it("conta com evento aparece como anfitrião, com contagem de eventos", async () => {
    const { a } = await semear(admin);
    const { rows } = await listAccountsAdmin(agregador, { limit: 20 });
    const conta = rows.find((r) => r.id === a.contaId);
    expect(conta?.type).toBe("host");
    expect(conta?.eventCount).toBe(1);
  });

  it("e-mail vem mascarado", async () => {
    const { a } = await semear(admin);
    const { rows } = await listAccountsAdmin(agregador, { limit: 20 });
    const conta = rows.find((r) => r.id === a.contaId);
    expect(conta?.maskedEmail).toMatch(/^.{1,2}•+@/);
    expect(conta?.maskedEmail).not.toContain("anfitriao-a@exemplo.test");
  });

  it("cursor devolve página seguinte sem repetir linha", async () => {
    await semear(admin);
    const primeira = await listAccountsAdmin(agregador, { limit: 1 });
    expect(primeira.nextCursor).not.toBeNull();
    const segunda = await listAccountsAdmin(agregador, { limit: 1, cursor: primeira.nextCursor! });
    expect(segunda.rows[0]?.id).not.toBe(primeira.rows[0]?.id);
  });
});
```

```ts
// packages/application/src/accounts/list-accounts.test.ts
import { describe, expect, it, vi } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { listAccounts } from "./list-accounts";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("listAccounts", () => {
  it("nega quem não tem accounts.read", async () => {
    await expect(
      listAccounts(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["engineering"]), reason: "abrir /console/accounts", limit: 20 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/accounts-admin.test.ts && pnpm --filter @albora/application exec vitest run src/accounts/list-accounts.test.ts`

Expected: FAIL com `Cannot find module './accounts-admin'`/`./list-accounts'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/accounts-admin.ts
import type { Pool } from "pg";

export type AccountAdminType = "host" | "vendor";

export type AccountAdminRow = {
  id: string;
  maskedEmail: string;
  type: AccountAdminType;
  plan: string | null;
  eventCount: number;
  createdAt: Date;
  lastAccessAt: Date | null;
};

/** `j••••@gmail.com` — nunca o e-mail cru. Local-part com 1-2 chars visíveis, resto mascarado; domínio intacto (é preciso identificar o provedor sem expor a caixa). */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "••••@••••";
  const visivel = local.slice(0, Math.min(2, local.length));
  return `${visivel}${"•".repeat(Math.max(local.length - visivel.length, 4))}@${domain}`;
}

type Cursor = { createdAt: string; id: string };
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id } satisfies Cursor)).toString("base64url");
}
function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
}

export type ListAccountsAdminFilter = {
  type?: AccountAdminType;
  search?: string;
  limit: number;
  cursor?: string;
};

/**
 * Cross-conta por desenho — chamado sob `withPlatformAggregation`.
 * "tipo" é derivado (não há coluna): fornecedor se a conta está em
 * `vendor_members`, senão anfitrião. "plano" é `vendors.plan` para
 * fornecedor, ou o `events.plan` do evento mais recente para anfitrião.
 * "último acesso" aproxima por `MAX(host_sessions.created_at)` — não há
 * `last_used_at` de host (Lacunas).
 */
export async function listAccountsAdmin(
  pool: Pool,
  filter: ListAccountsAdminFilter,
): Promise<{ rows: AccountAdminRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.search) {
    params.push(`%${filter.search.toLowerCase()}%`);
    clauses.push(`a.email ILIKE $${params.length}`);
  }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.createdAt, c.id);
    clauses.push(`(a.created_at, a.id) < ($${params.length - 1}, $${params.length})`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string;
    email: string;
    created_at: Date;
    vendor_plan: string | null;
    event_plan: string | null;
    event_count: number;
    last_access_at: Date | null;
  }>(
    `SELECT a.id, a.email, a.created_at,
            (SELECT v.plan FROM vendor_members vm JOIN vendors v ON v.id = vm.vendor_id
              WHERE vm.account_id = a.id LIMIT 1) AS vendor_plan,
            (SELECT e.plan FROM events e WHERE e.account_id = a.id ORDER BY e.created_at DESC LIMIT 1) AS event_plan,
            (SELECT count(*)::int FROM events e WHERE e.account_id = a.id) AS event_count,
            (SELECT max(hs.created_at) FROM host_sessions hs WHERE hs.account_id = a.id) AS last_access_at
       FROM accounts a
       ${where}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $${params.length}`,
    params,
  );

  const mapped: AccountAdminRow[] = rows
    .map((r) => ({
      id: r.id,
      maskedEmail: maskEmail(r.email),
      type: (r.vendor_plan !== null ? "vendor" : "host") as AccountAdminType,
      plan: r.vendor_plan ?? r.event_plan,
      eventCount: r.event_count,
      createdAt: r.created_at,
      lastAccessAt: r.last_access_at,
    }))
    .filter((r) => !filter.type || r.type === filter.type);

  const last = mapped[mapped.length - 1];
  const nextCursor = rows.length === filter.limit && last ? encodeCursor(last.createdAt, last.id) : null;
  return { rows: mapped, nextCursor };
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type { AccountAdminRow, AccountAdminType, ListAccountsAdminFilter } from "./accounts-admin";
export { listAccountsAdmin } from "./accounts-admin";
```

```ts
// packages/application/src/accounts/list-accounts.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listAccountsAdmin, type AccountAdminRow, type AccountAdminType } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type ListAccountsInput = {
  actor: Actor;
  reason: string;
  type?: AccountAdminType;
  search?: string;
  limit: number;
  cursor?: string;
};

export async function listAccounts(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListAccountsInput,
): Promise<{ rows: AccountAdminRow[]; nextCursor: string | null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "accounts.read",
    reason: input.reason,
    action: "accounts.list.read",
    run: () =>
      listAccountsAdmin(deps.aggregatorPool, {
        ...(input.type ? { type: input.type } : {}),
        ...(input.search ? { search: input.search } : {}),
        limit: input.limit,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      }),
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { ListAccountsInput } from "./accounts/list-accounts";
export { listAccounts } from "./accounts/list-accounts";
```

```tsx
// apps/web/features/console/components/client/accounts-table.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DataTable, FilterBar, StatusBadge, type DataTableColumn } from "@albora/ui-web";
import type { AccountAdminRow } from "@albora/application";

/** Wrapper cliente: busca/tipo viram querystring (navegação, refetch no servidor) — DataTable só exibe a página recebida (nota de reconhecimento 8/9). */
export function AccountsTable({ rows, nextCursor }: { rows: AccountAdminRow[]; nextCursor: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get("search") ?? "");

  const aplicarBusca = (valor: string) => {
    setBusca(valor);
    const params = new URLSearchParams(searchParams);
    if (valor) params.set("search", valor);
    else params.delete("search");
    params.delete("cursor");
    router.push(`/console/accounts?${params.toString()}`);
  };

  const columns: DataTableColumn<AccountAdminRow>[] = [
    { key: "email", header: "Conta", render: (r) => r.maskedEmail },
    { key: "type", header: "Tipo", render: (r) => (r.type === "vendor" ? "Fornecedor" : "Anfitrião") },
    { key: "plan", header: "Plano", render: (r) => r.plan ?? "—" },
    { key: "eventCount", header: "Eventos", align: "end", render: (r) => String(r.eventCount) },
    { key: "createdAt", header: "Criada", render: (r) => r.createdAt.toLocaleDateString("pt-BR") },
    {
      key: "lastAccessAt",
      header: "Último acesso",
      render: (r) => (r.lastAccessAt ? r.lastAccessAt.toLocaleDateString("pt-BR") : "—"),
    },
    { key: "status", header: "Status", render: () => <StatusBadge tone="positive">Ativa</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <FilterBar searchValue={busca} searchPlaceholder="conta, e-mail" onSearchChange={aplicarBusca} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="contas"
        emptyMessage="Nenhuma conta ainda. Elas aparecem aqui quando um anfitrião ou fornecedor se cadastra."
        emptyFilteredMessage="Nenhuma conta com esta busca"
      />
      {nextCursor && (
        <a
          href={`/console/accounts?${new URLSearchParams({ ...(busca ? { search: busca } : {}), cursor: nextCursor }).toString()}`}
          className="tipo-den-corpo self-end text-acento-texto"
        >
          Próxima página →
        </a>
      )}
    </div>
  );
}
```

```tsx
// apps/web/app/console/(shell)/accounts/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { listAccounts } from "@albora/application";
import { PageHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { AccountsTable } from "@/features/console/components/client/accounts-table";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; cursor?: string }>;
}) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { search, cursor } = await searchParams;
  const { rows, nextCursor } = await listAccounts(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: "abrir /console/accounts", limit: 20, ...(search ? { search } : {}), ...(cursor ? { cursor } : {}) },
  );

  return (
    <>
      <PageHeader title="Contas" description="Anfitriões e fornecedores da plataforma." />
      <AccountsTable rows={rows} nextCursor={nextCursor} />
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/accounts-admin.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application exec vitest run src/accounts/list-accounts.test.ts && pnpm --filter @albora/application typecheck && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/accounts-admin.ts packages/db/src/accounts-admin.test.ts packages/db/src/index.ts \
        packages/application/src/accounts/list-accounts.ts packages/application/src/accounts/list-accounts.test.ts \
        packages/application/src/index.ts \
        "apps/web/app/console/(shell)/accounts/page.tsx" \
        apps/web/features/console/components/client/accounts-table.tsx
git commit -m "$(cat <<'EOF'
feat(console): tela Contas — lista paginada por cursor

Tipo derivado de vendor_members (sem coluna própria), e-mail mascarado
por padrão (revelação fica pra onda de mutação), último acesso aproxima
por host_sessions.created_at (sem last_used_at de host — Lacunas).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Tela Conta — detalhe (`/console/accounts/[id]`)

**Files:**
- Modify: `packages/db/src/accounts-admin.ts`
- Modify: `packages/db/src/accounts-admin.test.ts`
- Create: `packages/application/src/accounts/get-account.ts`
- Test: `packages/application/src/accounts/get-account.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/accounts/[id]/page.tsx`
- Test: `apps/web/app/console/(shell)/accounts/[id]/page.test.ts`

**Interfaces:**
- Consumes: `listAuditLog` (`@albora/db`, Onda A); `aceitesDeEntradaPorVersao` (`@albora/db`); `EntityHeader`, `DetailPanel` (T1).
- Produces: `getAccountDetailAdmin` (`@albora/db`); `getAccount` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/accounts-admin.test.ts (acrescentar ao arquivo da Task 4)
import { getAccountDetailAdmin } from "./accounts-admin";

describe("getAccountDetailAdmin", () => {
  it("conta inexistente devolve null", async () => {
    const detalhe = await getAccountDetailAdmin(agregador, "00000000-0000-0000-0000-000000000000");
    expect(detalhe).toBeNull();
  });

  it("conta existente traz eventos e consentimentos agregados", async () => {
    const { a } = await semear(admin);
    const detalhe = await getAccountDetailAdmin(agregador, a.contaId);
    expect(detalhe?.events).toHaveLength(1);
    expect(detalhe?.events[0]?.id).toBe(a.eventoId);
    expect(detalhe?.consentsByVersion.some((c) => c.versao === "v1")).toBe(true);
  });
});
```

```ts
// packages/application/src/accounts/get-account.test.ts
import { describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { getAccount } from "./get-account";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("getAccount", () => {
  it("nega quem não tem accounts.read", async () => {
    await expect(
      getAccount(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["engineering"]), reason: "abrir conta", accountId: "id" },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/accounts-admin.test.ts && pnpm --filter @albora/application exec vitest run src/accounts/get-account.test.ts`

Expected: FAIL com `getAccountDetailAdmin is not a function` / `Cannot find module './get-account'`.

- [ ] **Step 3: Implementar o mínimo**

Adicionar a `packages/db/src/accounts-admin.ts`:

```ts
import { comEvento } from "./event";
import { aceitesDeEntradaPorVersao, type AceiteDeConsentimento } from "./consent-db";

export type AccountEventSummary = { id: string; title: string | null; startsAt: Date; status: string };

export type AccountDetailAdmin = AccountAdminRow & {
  events: AccountEventSummary[];
  consentsByVersion: AceiteDeConsentimento[];
};

/** Sob withPlatformAggregation — mesma leitura cross-tenant de listAccountsAdmin, agora para uma conta só. */
export async function getAccountDetailAdmin(pool: Pool, accountId: string): Promise<AccountDetailAdmin | null> {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    created_at: Date;
    vendor_plan: string | null;
    last_access_at: Date | null;
  }>(
    `SELECT a.id, a.email, a.created_at,
            (SELECT v.plan FROM vendor_members vm JOIN vendors v ON v.id = vm.vendor_id
              WHERE vm.account_id = a.id LIMIT 1) AS vendor_plan,
            (SELECT max(hs.created_at) FROM host_sessions hs WHERE hs.account_id = a.id) AS last_access_at
       FROM accounts a WHERE a.id = $1`,
    [accountId],
  );
  const conta = rows[0];
  if (!conta) return null;

  const { rows: eventos } = await pool.query<{ id: string; title: string | null; starts_at: Date; status: string }>(
    `SELECT id, title, starts_at, status FROM events WHERE account_id = $1 ORDER BY starts_at DESC`,
    [accountId],
  );

  const consentsByVersion: AceiteDeConsentimento[] = [];
  for (const evento of eventos) {
    const aceites = await comEvento(pool, evento.id, (c) => aceitesDeEntradaPorVersao(c, evento.id));
    consentsByVersion.push(...aceites);
  }

  return {
    id: conta.id,
    maskedEmail: maskEmail(conta.email),
    type: conta.vendor_plan !== null ? "vendor" : "host",
    plan: conta.vendor_plan,
    eventCount: eventos.length,
    createdAt: conta.created_at,
    lastAccessAt: conta.last_access_at,
    events: eventos.map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, status: e.status })),
    consentsByVersion,
  };
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type { AccountDetailAdmin, AccountEventSummary } from "./accounts-admin";
export { getAccountDetailAdmin } from "./accounts-admin";
```

```ts
// packages/application/src/accounts/get-account.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getAccountDetailAdmin, type AccountDetailAdmin } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type GetAccountInput = { actor: Actor; reason: string; accountId: string };

export async function getAccount(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: GetAccountInput,
): Promise<AccountDetailAdmin | null> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "accounts.read",
    reason: input.reason,
    action: "accounts.detail.read",
    run: () => getAccountDetailAdmin(deps.aggregatorPool, input.accountId),
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { GetAccountInput } from "./accounts/get-account";
export { getAccount } from "./accounts/get-account";
```

```ts
// apps/web/app/console/(shell)/accounts/[id]/page.test.ts
import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, getAccountMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  getAccountMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ getAccount: getAccountMock }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn(() => { throw new Error("notFound"); }) }));

import AccountDetailPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("AccountDetailPage", () => {
  it("conta inexistente chama notFound", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce(null);
    await expect(AccountDetailPage({ params: Promise.resolve({ id: "x" }) })).rejects.toThrow("notFound");
  });

  it("renderiza os três painéis com dado real", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce({
      id: "acc-1",
      maskedEmail: "an••••@exemplo.test",
      type: "host",
      plan: "celebration",
      eventCount: 1,
      createdAt: new Date("2026-01-01"),
      lastAccessAt: null,
      events: [{ id: "ev-1", title: "Festa", startsAt: new Date("2026-06-01"), status: "active" }],
      consentsByVersion: [{ versao: "v1", aceites: 1, primeiroEm: new Date(), ultimoEm: new Date() }],
    });

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("Identidade");
    expect(texto).toContain("Atividade");
    expect(texto).toContain("Trilha");
  });
});
```

```tsx
// apps/web/app/console/(shell)/accounts/[id]/page.tsx
import React from "react";
import { notFound, redirect } from "next/navigation";
import { getAccount } from "@albora/application";
import { DetailPanel, EntityHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { id } = await params;
  const conta = await getAccount(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: `abrir /console/accounts/${id}`, accountId: id },
  );
  if (!conta) notFound();

  return (
    <>
      <EntityHeader
        title={conta.maskedEmail}
        subtitle={conta.type === "vendor" ? "Fornecedor" : "Anfitrião"}
        status={{ tone: "positive", label: "Ativa" }}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DetailPanel
          title="Identidade"
          sections={[
            { key: "contato", label: "Contato", content: <p className="m-0">{conta.maskedEmail}</p>, emptyLabel: "—" },
            {
              key: "criada",
              label: "Criada em",
              content: <p className="m-0">{conta.createdAt.toLocaleDateString("pt-BR")}</p>,
              emptyLabel: "—",
            },
            {
              key: "acesso",
              label: "Último acesso",
              content: conta.lastAccessAt ? <p className="m-0">{conta.lastAccessAt.toLocaleDateString("pt-BR")}</p> : null,
              emptyLabel: "Sem sessão registrada",
            },
            {
              key: "consentimentos",
              label: "Consentimentos",
              content:
                conta.consentsByVersion.length > 0 ? (
                  <ul className="m-0 list-none p-0">
                    {conta.consentsByVersion.map((c) => (
                      <li key={c.versao}>{c.versao}: {c.aceites} aceite(s)</li>
                    ))}
                  </ul>
                ) : null,
              emptyLabel: "Nenhum consentimento registrado",
            },
          ]}
        />
        <DetailPanel
          title="Atividade"
          sections={[
            {
              key: "eventos",
              label: "Eventos",
              content:
                conta.events.length > 0 ? (
                  <ul className="m-0 list-none p-0">
                    {conta.events.map((e) => (
                      <li key={e.id}>{e.title ?? e.id} — {e.startsAt.toLocaleDateString("pt-BR")} ({e.status})</li>
                    ))}
                  </ul>
                ) : null,
              emptyLabel: "Nenhum evento ainda",
            },
            { key: "plano", label: "Plano", content: conta.plan ? <p className="m-0">{conta.plan}</p> : null, emptyLabel: "—" },
          ]}
        />
        <DetailPanel
          title="Trilha"
          sections={[
            {
              key: "audit",
              label: "Últimas ações da equipe nesta conta",
              content: null,
              emptyLabel: "Nenhuma ação da equipe registrada ainda",
            },
          ]}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/accounts-admin.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application exec vitest run src/accounts/get-account.test.ts && pnpm --filter web exec vitest run "app/console/(shell)/accounts/[id]/page.test.ts" && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/accounts-admin.ts packages/db/src/accounts-admin.test.ts packages/db/src/index.ts \
        packages/application/src/accounts/get-account.ts packages/application/src/accounts/get-account.test.ts \
        packages/application/src/index.ts \
        "apps/web/app/console/(shell)/accounts/[id]/page.tsx" "apps/web/app/console/(shell)/accounts/[id]/page.test.ts"
git commit -m "$(cat <<'EOF'
feat(console): tela Conta — detalhe

EntityHeader + três painéis (Identidade/Atividade/Trilha). Trilha de
audit_log fica com estado vazio honesto nesta task — a consulta real
por target_kind='account' entra na Task 9, quando listAudit existe.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

> **Nota:** o painel "Trilha" desta task mostra vazio por construção — `listAudit` só existe a partir da Task 9. Isso não é lacuna de dado (o `audit_log` já grava desde a Onda A): é ordem de entrega dentro da própria onda. Se a subagent-driven-development reordenar tasks, a Task 9 pode subir antes da 5 e a Task 5 então já filtra `listAudit({ targetKind: "account", targetId: conta.id })` no painel Trilha em vez do vazio estático — ajuste local, sem impacto em outras tasks.

---

### Task 6: Casos de uso + tela Eventos (`/console/events`)

**Files:**
- Create: `packages/db/src/events-admin.ts`
- Test: `packages/db/src/events-admin.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/events/list-events.ts`
- Create: `packages/application/src/events/get-event.ts`
- Test: `packages/application/src/events/list-events.test.ts`
- Test: `packages/application/src/events/get-event.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/events/page.tsx`
- Test: `apps/web/app/console/(shell)/events/page.test.ts`
- Create: `apps/web/features/console/components/client/events-table.tsx`
- Create: `apps/web/app/console/(shell)/events/[id]/page.tsx`
- Test: `apps/web/app/console/(shell)/events/[id]/page.test.ts`

**Interfaces:**
- Consumes: `collectEventLiveMetrics` (`@albora/db`, já existe — H1 e funil por evento); `aceitesDeEntradaPorVersao` (`@albora/db`).
- Produces: `EventAdminRow`, `listEventsAdmin`, `getEventDetailAdmin` (`@albora/db`); `listEvents`, `getEvent` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/events-admin.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEventDetailAdmin, listEventsAdmin } from "./events-admin";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

describe("listEventsAdmin", () => {
  it("traz H1 do evento e zero PII de convidado", async () => {
    const { a } = await semear(admin);
    await admin.query("UPDATE events SET expected_guests = 1 WHERE id = $1", [a.eventoId]);

    const { rows } = await listEventsAdmin(agregador, { limit: 20 });
    const evento = rows.find((r) => r.id === a.eventoId);

    expect(evento?.h1).toBeCloseTo(1, 5);
    const chaves = Object.keys(evento ?? {});
    expect(chaves).not.toContain("displayName");
    expect(chaves).not.toContain("guestName");
  });
});

describe("getEventDetailAdmin", () => {
  it("evento inexistente devolve null", async () => {
    expect(await getEventDetailAdmin(agregador, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});
```

```ts
// packages/application/src/events/list-events.test.ts
import { describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { listEvents } from "./list-events";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("listEvents", () => {
  it("nega quem não tem events.read", async () => {
    await expect(
      listEvents({ pool: {} as never, aggregatorPool: {} as never }, { actor: actor([]), reason: "x", limit: 20 }),
    ).rejects.toThrow(CommandDeniedError);
  });
});
```

```ts
// packages/application/src/events/get-event.test.ts
import { describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { getEvent } from "./get-event";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("getEvent", () => {
  it("nega quem não tem events.read", async () => {
    await expect(
      getEvent({ pool: {} as never, aggregatorPool: {} as never }, { actor: actor([]), reason: "x", eventId: "e1" }),
    ).rejects.toThrow(CommandDeniedError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/events-admin.test.ts && pnpm --filter @albora/application exec vitest run src/events/list-events.test.ts src/events/get-event.test.ts`

Expected: FAIL com `Cannot find module './events-admin'`/`./list-events'`/`./get-event'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/events-admin.ts
import type { Pool } from "pg";
import { collectEventLiveMetrics, type EventLiveMetrics } from "./analytics";
import { comEvento } from "./event";
import { aceitesDeEntradaPorVersao, type AceiteDeConsentimento } from "./consent-db";

export type EventAdminRow = {
  id: string;
  title: string | null;
  accountId: string;
  vendorId: string | null;
  startsAt: Date;
  expectedGuests: number;
  totalFotos: number;
  h1: number;
  status: string;
};

type Cursor = { startsAt: string; id: string };
function encodeCursor(startsAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ startsAt: startsAt.toISOString(), id } satisfies Cursor)).toString("base64url");
}
function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
}

export type ListEventsAdminFilter = { status?: string; vendorId?: string; limit: number; cursor?: string };

/** Zero PII de convidado por construção: só colunas de `events` + H1 (agregado), nunca guest_sessions.display_name. */
export async function listEventsAdmin(
  pool: Pool,
  filter: ListEventsAdminFilter,
): Promise<{ rows: EventAdminRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.status) { params.push(filter.status); clauses.push(`status = $${params.length}`); }
  if (filter.vendorId) { params.push(filter.vendorId); clauses.push(`vendor_id = $${params.length}`); }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.startsAt, c.id);
    clauses.push(`(starts_at, id) < ($${params.length - 1}, $${params.length})`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string; title: string | null; account_id: string; vendor_id: string | null;
    starts_at: Date; expected_guests: number; status: string;
  }>(
    `SELECT id, title, account_id, vendor_id, starts_at, expected_guests, status
       FROM events ${where}
      ORDER BY starts_at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );

  const comMetricas: EventAdminRow[] = [];
  for (const evento of rows) {
    const metricas = await collectEventLiveMetrics(pool, evento.id);
    comMetricas.push({
      id: evento.id,
      title: evento.title,
      accountId: evento.account_id,
      vendorId: evento.vendor_id,
      startsAt: evento.starts_at,
      expectedGuests: evento.expected_guests,
      totalFotos: metricas.totalFotos,
      h1: metricas.participacao,
      status: evento.status,
    });
  }

  const last = comMetricas[comMetricas.length - 1];
  const nextCursor = rows.length === filter.limit && last ? encodeCursor(last.startsAt, last.id) : null;
  return { rows: comMetricas, nextCursor };
}

export type EventDetailAdmin = EventAdminRow & {
  liveMetrics: EventLiveMetrics;
  consentsByVersion: AceiteDeConsentimento[];
};

export async function getEventDetailAdmin(pool: Pool, eventId: string): Promise<EventDetailAdmin | null> {
  const { rows } = await pool.query<{
    id: string; title: string | null; account_id: string; vendor_id: string | null;
    starts_at: Date; expected_guests: number; status: string;
  }>(`SELECT id, title, account_id, vendor_id, starts_at, expected_guests, status FROM events WHERE id = $1`, [eventId]);
  const evento = rows[0];
  if (!evento) return null;

  const [liveMetrics, consentsByVersion] = await Promise.all([
    collectEventLiveMetrics(pool, eventId),
    comEvento(pool, eventId, (c) => aceitesDeEntradaPorVersao(c, eventId)),
  ]);

  return {
    id: evento.id,
    title: evento.title,
    accountId: evento.account_id,
    vendorId: evento.vendor_id,
    startsAt: evento.starts_at,
    expectedGuests: evento.expected_guests,
    totalFotos: liveMetrics.totalFotos,
    h1: liveMetrics.participacao,
    status: evento.status,
    liveMetrics,
    consentsByVersion,
  };
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type { EventAdminRow, EventDetailAdmin, ListEventsAdminFilter } from "./events-admin";
export { getEventDetailAdmin, listEventsAdmin } from "./events-admin";
```

```ts
// packages/application/src/events/list-events.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listEventsAdmin, type EventAdminRow } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type ListEventsInput = { actor: Actor; reason: string; status?: string; vendorId?: string; limit: number; cursor?: string };

export async function listEvents(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListEventsInput,
): Promise<{ rows: EventAdminRow[]; nextCursor: string | null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "events.read",
    reason: input.reason,
    action: "events.list.read",
    run: () =>
      listEventsAdmin(deps.aggregatorPool, {
        ...(input.status ? { status: input.status } : {}),
        ...(input.vendorId ? { vendorId: input.vendorId } : {}),
        limit: input.limit,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      }),
  });
}
```

```ts
// packages/application/src/events/get-event.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getEventDetailAdmin, type EventDetailAdmin } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type GetEventInput = { actor: Actor; reason: string; eventId: string };

export async function getEvent(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: GetEventInput,
): Promise<EventDetailAdmin | null> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "events.read",
    reason: input.reason,
    action: "events.detail.read",
    run: () => getEventDetailAdmin(deps.aggregatorPool, input.eventId),
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { ListEventsInput } from "./events/list-events";
export { listEvents } from "./events/list-events";
export type { GetEventInput } from "./events/get-event";
export { getEvent } from "./events/get-event";
```

```tsx
// apps/web/features/console/components/client/events-table.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DataTable, StatusBadge, type DataTableColumn } from "@albora/ui-web";
import type { EventAdminRow } from "@albora/application";

export function EventsTable({ rows, nextCursor }: { rows: EventAdminRow[]; nextCursor: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  void router;

  const columns: DataTableColumn<EventAdminRow>[] = [
    { key: "title", header: "Evento", render: (r) => <Link href={`/console/events/${r.id}`}>{r.title ?? r.id}</Link> },
    { key: "startsAt", header: "Data", render: (r) => r.startsAt.toLocaleDateString("pt-BR") },
    { key: "expectedGuests", header: "Convidados", align: "end", render: (r) => String(r.expectedGuests) },
    { key: "totalFotos", header: "Fotos", align: "end", render: (r) => String(r.totalFotos) },
    { key: "h1", header: "H1", sortable: true, align: "end", render: (r) => `${Math.round(r.h1 * 100)}%` },
    { key: "status", header: "Status", render: (r) => <StatusBadge tone="neutral">{r.status}</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="eventos"
        emptyMessage="Nenhum evento ainda. Eles aparecem aqui quando um anfitrião publica o primeiro."
      />
      {nextCursor && (
        <a
          href={`/console/events?${new URLSearchParams({ ...Object.fromEntries(searchParams), cursor: nextCursor }).toString()}`}
          className="tipo-den-corpo self-end text-acento-texto"
        >
          Próxima página →
        </a>
      )}
    </div>
  );
}
```

```tsx
// apps/web/app/console/(shell)/events/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { listEvents } from "@albora/application";
import { PageHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { EventsTable } from "@/features/console/components/client/events-table";

export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { cursor } = await searchParams;
  const { rows, nextCursor } = await listEvents(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: "abrir /console/events", limit: 20, ...(cursor ? { cursor } : {}) },
  );

  return (
    <>
      <PageHeader title="Eventos" description="H1 por evento — ordene para achar quais festas funcionaram." />
      <EventsTable rows={rows} nextCursor={nextCursor} />
    </>
  );
}
```

```tsx
// apps/web/app/console/(shell)/events/[id]/page.tsx
import React from "react";
import { notFound, redirect } from "next/navigation";
import { getEvent } from "@albora/application";
import { DetailPanel, EntityHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { id } = await params;
  const evento = await getEvent(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: `abrir /console/events/${id}`, eventId: id },
  );
  if (!evento) notFound();

  return (
    <>
      <EntityHeader title={evento.title ?? evento.id} subtitle={`H1: ${Math.round(evento.h1 * 100)}%`} status={{ tone: "positive", label: evento.status }} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailPanel
          title="Funil"
          sections={evento.liveMetrics.degraus.map((d) => ({
            key: d.etapa,
            label: d.etapa,
            content: <p className="m-0 tabular-nums">{d.sessoes} sessões</p>,
            emptyLabel: "—",
          }))}
        />
        <DetailPanel
          title="Consentimento"
          sections={[
            {
              key: "consentimentos",
              label: "Aceites por versão",
              content:
                evento.consentsByVersion.length > 0 ? (
                  <ul className="m-0 list-none p-0">
                    {evento.consentsByVersion.map((c) => (
                      <li key={c.versao}>{c.versao}: {c.aceites}</li>
                    ))}
                  </ul>
                ) : null,
              emptyLabel: "Nenhum consentimento registrado",
            },
          ]}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/events-admin.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application exec vitest run src/events/list-events.test.ts src/events/get-event.test.ts && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/events-admin.ts packages/db/src/events-admin.test.ts packages/db/src/index.ts \
        packages/application/src/events packages/application/src/index.ts \
        "apps/web/app/console/(shell)/events" apps/web/features/console/components/client/events-table.tsx
git commit -m "$(cat <<'EOF'
feat(console): tela Eventos — lista com H1 por evento + detalhe

Reaproveita collectEventLiveMetrics/decidirTese (já existentes) para H1
e funil por evento. Zero PII de convidado em qualquer coluna — só
colunas de events e agregados.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Casos de uso + tela Assinaturas (`/console/subscriptions`) — SÓ LEITURA

**Files:**
- Create: `packages/db/src/subscriptions-admin.ts`
- Test: `packages/db/src/subscriptions-admin.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/subscriptions/list-subscriptions.ts`
- Test: `packages/application/src/subscriptions/list-subscriptions.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/subscriptions/page.tsx`
- Test: `apps/web/app/console/(shell)/subscriptions/page.test.ts`

**Interfaces:**
- Consumes: `VENDOR_PLAN_PRICE_CENTS` (`@albora/application`, T2); `getPlatformRevenue` (T2).
- Produces: `VendorSubscriptionAdminRow`, `listVendorSubscriptionsAdmin` (`@albora/db`); `listSubscriptions` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/subscriptions-admin.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listVendorSubscriptionsAdmin } from "./subscriptions-admin";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

describe("listVendorSubscriptionsAdmin", () => {
  it("atraso é aproximado por now() - updated_at quando overdue, null quando não", async () => {
    const { rows: v } = await admin.query("INSERT INTO vendors (name, plan) VALUES ('Estúdio X', 'studio') RETURNING id");
    const { rows: acc } = await admin.query("INSERT INTO accounts (email) VALUES ('estudio@exemplo.test') RETURNING id");
    await admin.query(
      `INSERT INTO vendor_subscriptions (vendor_id, account_id, asaas_subscription_id, status, plan, updated_at)
       VALUES ($1, $2, 'sub-1', 'overdue', 'studio', now() - interval '3 days')`,
      [v[0]!.id, acc[0]!.id],
    );

    const { rows } = await listVendorSubscriptionsAdmin(agregador, { limit: 20 });
    const linha = rows.find((r) => r.vendorId === v[0]!.id);
    expect(linha?.status).toBe("overdue");
    expect(linha?.overdueDays).toBeGreaterThanOrEqual(2);
    expect(linha?.nextChargeAt).toBeNull();
  });
});
```

```ts
// packages/application/src/subscriptions/list-subscriptions.test.ts
import { describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { listSubscriptions } from "./list-subscriptions";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("listSubscriptions", () => {
  it("nega quem não tem subscription.read", async () => {
    await expect(
      listSubscriptions({ pool: {} as never, aggregatorPool: {} as never }, { actor: actor(["engineering"]), reason: "x", limit: 20 }),
    ).rejects.toThrow(CommandDeniedError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/subscriptions-admin.test.ts && pnpm --filter @albora/application exec vitest run src/subscriptions/list-subscriptions.test.ts`

Expected: FAIL com `Cannot find module './subscriptions-admin'`/`./list-subscriptions'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/subscriptions-admin.ts
import type { Pool } from "pg";

export type VendorSubscriptionAdminRow = {
  vendorId: string;
  vendorName: string;
  plan: "starter" | "studio" | "agency";
  status: "pending" | "active" | "overdue" | "canceled";
  /** Não existe coluna de vencimento em vendor_subscriptions — sempre null (Lacunas). */
  nextChargeAt: null;
  /** Aproximação: `now() - updated_at` só quando `status = 'overdue'` — sem `overdue_since` dedicado. */
  overdueDays: number | null;
};

export type ListVendorSubscriptionsAdminFilter = { status?: string; limit: number };

export async function listVendorSubscriptionsAdmin(
  pool: Pool,
  filter: ListVendorSubscriptionsAdminFilter,
): Promise<{ rows: VendorSubscriptionAdminRow[]; nextCursor: null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.status) { params.push(filter.status); clauses.push(`vs.status = $${params.length}`); }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    vendor_id: string; vendor_name: string; plan: "starter" | "studio" | "agency";
    status: "pending" | "active" | "overdue" | "canceled"; overdue_days: number | null;
  }>(
    `SELECT vs.vendor_id, v.name AS vendor_name, vs.plan, vs.status,
            CASE WHEN vs.status = 'overdue' THEN extract(day FROM now() - vs.updated_at)::int ELSE NULL END AS overdue_days
       FROM vendor_subscriptions vs JOIN vendors v ON v.id = vs.vendor_id
       ${where}
      ORDER BY vs.created_at DESC
      LIMIT $${params.length}`,
    params,
  );

  return {
    rows: rows.map((r) => ({
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      plan: r.plan,
      status: r.status,
      nextChargeAt: null,
      overdueDays: r.overdue_days,
    })),
    nextCursor: null,
  };
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type { ListVendorSubscriptionsAdminFilter, VendorSubscriptionAdminRow } from "./subscriptions-admin";
export { listVendorSubscriptionsAdmin } from "./subscriptions-admin";
```

```ts
// packages/application/src/subscriptions/list-subscriptions.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listVendorSubscriptionsAdmin, type VendorSubscriptionAdminRow } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type ListSubscriptionsInput = { actor: Actor; reason: string; status?: string; limit: number };

export async function listSubscriptions(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListSubscriptionsInput,
): Promise<{ rows: VendorSubscriptionAdminRow[]; nextCursor: null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "subscription.read",
    reason: input.reason,
    action: "subscriptions.list.read",
    run: () =>
      listVendorSubscriptionsAdmin(deps.aggregatorPool, {
        ...(input.status ? { status: input.status } : {}),
        limit: input.limit,
      }),
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { ListSubscriptionsInput } from "./subscriptions/list-subscriptions";
export { listSubscriptions } from "./subscriptions/list-subscriptions";
```

```tsx
// apps/web/app/console/(shell)/subscriptions/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getPlatformRevenue, listSubscriptions, VENDOR_PLAN_PRICE_CENTS } from "@albora/application";
import { DataTable, MetricCard, PageHeader, StatusBadge, type DataTableColumn } from "@albora/ui-web";
import type { VendorSubscriptionAdminRow } from "@albora/application";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console/subscriptions";
  const [{ rows }, revenue] = await Promise.all([
    listSubscriptions(deps, { actor, reason, limit: 50 }),
    getPlatformRevenue(deps, { actor, reason }),
  ]);

  const columns: DataTableColumn<VendorSubscriptionAdminRow>[] = [
    { key: "vendorName", header: "Fornecedor", render: (r) => r.vendorName },
    { key: "plan", header: "Plano", render: (r) => r.plan },
    { key: "status", header: "Status", render: (r) => <StatusBadge tone={r.status === "overdue" ? "critico" : "neutral"}>{r.status}</StatusBadge> },
    { key: "nextChargeAt", header: "Próxima cobrança", render: () => "—" },
    {
      key: "overdueDays",
      header: "Atraso",
      align: "end",
      render: (r) => (r.overdueDays === null ? "—" : <span style={{ color: "var(--critico)" }}>{r.overdueDays}d</span>),
    },
    { key: "valor", header: "Valor", align: "end", render: (r) => `R$ ${(VENDOR_PLAN_PRICE_CENTS[r.plan] / 100).toFixed(2)}` },
  ];

  return (
    <>
      <PageHeader title="Assinaturas" description="Leitura — mutação de plano/reembolso chega na Onda C." />
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard rotulo="MRR" valor={`R$ ${(revenue.mrrCents / 100).toFixed(2)}`} valorNumerico={revenue.mrrCents} bomQuando="sobe" janela="Agora" />
        <MetricCard rotulo="Assinaturas ativas" valor={String(revenue.activeSubscriptions)} valorNumerico={revenue.activeSubscriptions} bomQuando="sobe" janela="Agora" />
        <MetricCard rotulo="Inadimplência" valor={String(revenue.overdueCount)} valorNumerico={revenue.overdueCount} bomQuando="desce" janela="Agora" />
        <MetricCard rotulo="Churn 30d" valor={String(revenue.churned30dCount)} valorNumerico={revenue.churned30dCount} bomQuando="desce" janela="Últimos 30 dias" />
      </section>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.vendorId}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="assinaturas"
        emptyMessage="Nenhuma assinatura de fornecedor ainda."
      />
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/subscriptions-admin.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application exec vitest run src/subscriptions/list-subscriptions.test.ts && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/subscriptions-admin.ts packages/db/src/subscriptions-admin.test.ts packages/db/src/index.ts \
        packages/application/src/subscriptions packages/application/src/index.ts \
        "apps/web/app/console/(shell)/subscriptions"
git commit -m "$(cat <<'EOF'
feat(console): tela Assinaturas — só leitura

MRR/ativas/inadimplência/churn 30d na faixa; tabela de vendor_subscriptions
com atraso aproximado por updated_at (sem overdue_since). Próxima cobrança
sempre — (sem coluna de vencimento — Lacunas). Zero ação de mutação.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Casos de uso + tela Retenção (`/console/retention`)

**Files:**
- Modify: `packages/db/src/retention-jobs.ts`
- Modify: `packages/db/src/retention-jobs.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/retention/list-retention-jobs.ts`
- Test: `packages/application/src/retention/list-retention-jobs.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/retention/page.tsx`
- Test: `apps/web/app/console/(shell)/retention/page.test.ts`

**Interfaces:**
- Consumes: nenhum novo — só `withPlatformAggregation`.
- Produces: `RetentionJobAdminRow`, `listRetentionJobsAdmin` (`@albora/db`); `listRetentionJobs` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/retention-jobs.test.ts (acrescentar ao arquivo existente)
import { listRetentionJobsAdmin } from "./retention-jobs";

describe("listRetentionJobsAdmin", () => {
  it("traz pendente mesmo sem due_at vencido, diferente de listDueRetentionJobs", async () => {
    const { rows: e } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
       VALUES ((SELECT id FROM accounts LIMIT 1), (SELECT id FROM packs LIMIT 1), 'evt-retencao', now(), now() + interval '1 hour', 'active')
       RETURNING id`,
    );
    await admin.query(
      `INSERT INTO retention_jobs (event_id, kind, status, due_at) VALUES ($1, 'plus_48h', 'pending', now() + interval '10 days')`,
      [e[0]!.id],
    );

    const { rows } = await listRetentionJobsAdmin(admin, { status: "pending", limit: 20 });
    expect(rows.some((r) => r.eventId === e[0]!.id)).toBe(true);
  });

  it("filtra por status failed", async () => {
    const { rows } = await listRetentionJobsAdmin(admin, { status: "failed", limit: 20 });
    expect(rows.every((r) => r.status === "failed")).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/retention-jobs.test.ts`

Expected: FAIL com `listRetentionJobsAdmin is not a function`.

- [ ] **Step 3: Implementar o mínimo**

Adicionar a `packages/db/src/retention-jobs.ts`:

```ts
export type RetentionJobAdminRow = {
  id: string;
  eventId: string;
  kind: RetentionKind;
  status: "pending" | "running" | "done" | "skipped" | "failed";
  dueAt: Date;
  attempts: number;
  lastError: string | null;
};

export type ListRetentionJobsAdminFilter = { status?: string; limit: number };

/** Diferente de listDueRetentionJobs: não filtra por due_at — a tela de console mostra a fila inteira (pendente/concluído/falhado), o runner só o que está due agora. */
export async function listRetentionJobsAdmin(
  pool: Pool,
  filter: ListRetentionJobsAdminFilter,
): Promise<{ rows: RetentionJobAdminRow[]; nextCursor: null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.status) { params.push(filter.status); clauses.push(`status = $${params.length}`); }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string; event_id: string; kind: RetentionKind;
    status: "pending" | "running" | "done" | "skipped" | "failed";
    due_at: Date; attempts: number; last_error: string | null;
  }>(
    `SELECT id, event_id, kind, status, due_at, attempts, last_error
       FROM retention_jobs ${where}
      ORDER BY (status = 'failed') DESC, due_at ASC
      LIMIT $${params.length}`,
    params,
  );

  return {
    rows: rows.map((r) => ({
      id: r.id, eventId: r.event_id, kind: r.kind, status: r.status,
      dueAt: r.due_at, attempts: r.attempts, lastError: r.last_error,
    })),
    nextCursor: null,
  };
}
```

Modificar `packages/db/src/index.ts` — adicionar:

```ts
export type { ListRetentionJobsAdminFilter, RetentionJobAdminRow } from "./retention-jobs";
export { listRetentionJobsAdmin } from "./retention-jobs";
```

```ts
// packages/application/src/retention/list-retention-jobs.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listRetentionJobsAdmin, type RetentionJobAdminRow } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type ListRetentionJobsInput = { actor: Actor; reason: string; status?: string; limit: number };

export async function listRetentionJobs(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListRetentionJobsInput,
): Promise<{ rows: RetentionJobAdminRow[]; nextCursor: null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "retention.read",
    reason: input.reason,
    action: "retention.list.read",
    run: () => listRetentionJobsAdmin(deps.aggregatorPool, { ...(input.status ? { status: input.status } : {}), limit: input.limit }),
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { ListRetentionJobsInput } from "./retention/list-retention-jobs";
export { listRetentionJobs } from "./retention/list-retention-jobs";
```

```tsx
// apps/web/app/console/(shell)/retention/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { listRetentionJobs } from "@albora/application";
import { ConsoleEmptyState, DataTable, PageHeader, StatusBadge, type DataTableColumn } from "@albora/ui-web";
import type { RetentionJobAdminRow } from "@albora/application";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RetentionPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { rows } = await listRetentionJobs(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: "abrir /console/retention", limit: 100 },
  );

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Retenção" description="Fila de retention_jobs cross-evento." />
        <ConsoleEmptyState title="Nenhum job de retenção ainda" description="Eles aparecem quando o primeiro evento termina." />
      </>
    );
  }

  const columns: DataTableColumn<RetentionJobAdminRow>[] = [
    { key: "eventId", header: "Evento", render: (r) => r.eventId },
    { key: "kind", header: "Etapa", render: (r) => r.kind },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <a href={`/console/events/${r.eventId}`}>
          <StatusBadge tone={r.status === "failed" ? "critico" : r.status === "done" ? "positive" : "neutral"}>
            {r.status}
          </StatusBadge>
        </a>
      ),
    },
    { key: "dueAt", header: "Vencimento", render: (r) => r.dueAt.toLocaleDateString("pt-BR") },
    { key: "attempts", header: "Tentativas", align: "end", render: (r) => String(r.attempts) },
    { key: "lastError", header: "Erro", render: (r) => r.lastError ?? "—" },
  ];

  return (
    <>
      <PageHeader title="Retenção" description="Fila de retention_jobs cross-evento — falhados são trabalho, não informação." />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="jobs"
      />
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/retention-jobs.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application exec vitest run src/retention/list-retention-jobs.test.ts && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/retention-jobs.ts packages/db/src/retention-jobs.test.ts packages/db/src/index.ts \
        packages/application/src/retention packages/application/src/index.ts \
        "apps/web/app/console/(shell)/retention"
git commit -m "$(cat <<'EOF'
feat(console): tela Retenção — fila cross-evento visível

listRetentionJobsAdmin (nova) mostra pendente/concluído/falhado sem
filtrar por due_at — diferente de listDueRetentionJobs, que só serve
ao runner. Falhados destacados e clicáveis para o evento.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Casos de uso + tela Auditoria (`/console/audit`)

**Files:**
- Create: `packages/application/src/audit/list-audit-log.ts`
- Test: `packages/application/src/audit/list-audit-log.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/audit/page.tsx`
- Test: `apps/web/app/console/(shell)/audit/page.test.ts`

**Interfaces:**
- Consumes: `listAuditLog`, `type AuditLogFilter`, `type AuditRow` (`@albora/db`, Onda A T5 — já devolve `nextCursor`).
- Produces: `listAudit` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/audit/list-audit-log.test.ts
import { describe, expect, it, vi } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { listAudit } from "./list-audit-log";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("listAudit", () => {
  it("nega quem não tem audit.read", async () => {
    await expect(listAudit({ pool: {} as never }, { actor: actor(["support"]), limit: 20 })).rejects.toThrow(CommandDeniedError);
  });

  it("não passa por withPlatformAggregation — chama listAuditLog direto no pool normal", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as never;
    await listAudit({ pool }, { actor: actor(["owner"]), limit: 20 });
    expect(query).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/audit/list-audit-log.test.ts`

Expected: FAIL com `Cannot find module './list-audit-log'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/audit/list-audit-log.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listAuditLog, type AuditLogFilter, type AuditRow } from "@albora/db";
import { executeQuery } from "../envelope/query";

export type ListAuditInput = Omit<AuditLogFilter, never> & { actor: Actor };

/** audit_log não tem RLS (migration 0060) — executeQuery puro, sem withPlatformAggregation (nota de reconhecimento 5). */
export async function listAudit(
  deps: { pool: Pool },
  input: ListAuditInput,
): Promise<{ rows: AuditRow[]; nextCursor: string | null }> {
  const { actor, ...filter } = input;
  return executeQuery(deps, {
    actor,
    capability: "audit.read",
    run: () => listAuditLog(deps.pool, filter),
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { ListAuditInput } from "./audit/list-audit-log";
export { listAudit } from "./audit/list-audit-log";
```

```ts
// apps/web/app/console/(shell)/audit/page.test.ts
import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, listAuditMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listAuditMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listAudit: listAuditMock }));

import AuditPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("AuditPage", () => {
  it("renderiza linhas sem nenhuma ação de mutação", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listAuditMock.mockResolvedValueOnce({
      rows: [
        { id: "a1", at: new Date(), actorKind: "staff", actorId: "s1", actorLabel: null, action: "subscription.refund", targetKind: "subscription", targetId: "sub-1", reason: "pedido do cliente", metadata: {}, requestId: "r1", ipHash: null },
      ],
      nextCursor: null,
    });
    const element = await AuditPage({ searchParams: Promise.resolve({}) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("subscription.refund");
    expect(texto).not.toContain("button");
  });
});
```

```tsx
// apps/web/app/console/(shell)/audit/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { listAudit } from "@albora/application";
import { DataTable, PageHeader, type DataTableColumn } from "@albora/ui-web";
import type { AuditRow } from "@albora/application";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { cursor } = await searchParams;
  const { rows, nextCursor } = await listAudit({ pool: getPool() }, { actor, limit: 50, ...(cursor ? { cursor } : {}) });

  const columns: DataTableColumn<AuditRow>[] = [
    { key: "at", header: "Quando", render: (r) => r.at.toLocaleString("pt-BR") },
    { key: "actorLabel", header: "Ator", render: (r) => r.actorLabel ?? r.actorId ?? "sistema" },
    { key: "action", header: "Ação", render: (r) => r.action },
    { key: "target", header: "Alvo", render: (r) => `${r.targetKind}${r.targetId ? ` · ${r.targetId}` : ""}` },
    { key: "reason", header: "Motivo", render: (r) => r.reason },
  ];

  return (
    <>
      <PageHeader title="Auditoria" description="Trilha que prova — leitura por construção, sem ação." />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={Math.max(rows.length, 1)}
        pageSizeOptions={[Math.max(rows.length, 1)]}
        itemLabel="entradas"
        emptyMessage="Nenhuma entrada de auditoria ainda."
      />
      {nextCursor && (
        <a href={`/console/audit?cursor=${encodeURIComponent(nextCursor)}`} className="tipo-den-corpo text-acento-texto">
          Próxima página →
        </a>
      )}
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/audit/list-audit-log.test.ts && pnpm --filter @albora/application typecheck && pnpm --filter web exec vitest run "app/console/(shell)/audit/page.test.ts" && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application/src/audit packages/application/src/index.ts "apps/web/app/console/(shell)/audit"
git commit -m "$(cat <<'EOF'
feat(console): tela Auditoria

Envelope fino sobre listAuditLog (já existe desde a Onda A). audit_log
não tem RLS — executeQuery puro, sem withPlatformAggregation. Sem
nenhuma ação: trilha que se edita não é trilha.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Casos de uso + tela Segurança (`/console/security`)

**Files:**
- Create: `packages/application/src/security/list-security-events.ts`
- Test: `packages/application/src/security/list-security-events.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/console/(shell)/security/page.tsx`
- Test: `apps/web/app/console/(shell)/security/page.test.ts`

**Interfaces:**
- Consumes: `listSecurityEvents`, `type SecurityEventFilter`, `type SecurityEventRow` (`@albora/db`, Onda A T5).
- Produces: `listSecurity` (`@albora/application`).

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/security/list-security-events.test.ts
import { describe, expect, it } from "vitest";
import { CommandDeniedError } from "../envelope/errors";
import { listSecurity } from "./list-security-events";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("listSecurity", () => {
  it("nega quem não tem security.read", async () => {
    await expect(listSecurity({ pool: {} as never }, { actor: actor(["finance"]), limit: 20 })).rejects.toThrow(CommandDeniedError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/security/list-security-events.test.ts`

Expected: FAIL com `Cannot find module './list-security-events'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/security/list-security-events.ts
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listSecurityEvents, type SecurityEventFilter, type SecurityEventRow } from "@albora/db";
import { executeQuery } from "../envelope/query";

export type ListSecurityInput = SecurityEventFilter & { actor: Actor };

/** security_events não tem RLS — executeQuery puro, mesma justificativa de listAudit (T9). */
export async function listSecurity(
  deps: { pool: Pool },
  input: ListSecurityInput,
): Promise<{ rows: SecurityEventRow[]; nextCursor: string | null }> {
  const { actor, ...filter } = input;
  return executeQuery(deps, {
    actor,
    capability: "security.read",
    run: () => listSecurityEvents(deps.pool, filter),
  });
}
```

Modificar `packages/application/src/index.ts` — adicionar:

```ts
export type { ListSecurityInput } from "./security/list-security-events";
export { listSecurity } from "./security/list-security-events";
```

```ts
// apps/web/app/console/(shell)/security/page.test.ts
import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, listSecurityMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listSecurityMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listSecurity: listSecurityMock }));

import SecurityPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("SecurityPage", () => {
  it("agrupa por tipo com contagem", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listSecurityMock.mockResolvedValueOnce({
      rows: [
        { id: "1", at: new Date(), kind: "login.failed", actorKind: null, actorId: null, ipHash: null, requestId: null, metadata: {} },
        { id: "2", at: new Date(), kind: "login.failed", actorKind: null, actorId: null, ipHash: null, requestId: null, metadata: {} },
        { id: "3", at: new Date(), kind: "rate_limit.exceeded", actorKind: null, actorId: null, ipHash: null, requestId: null, metadata: {} },
      ],
      nextCursor: null,
    });
    const element = await SecurityPage();
    const texto = JSON.stringify(element);
    expect(texto).toContain("login.failed");
    expect(texto).toContain("rate_limit.exceeded");
  });
});
```

```tsx
// apps/web/app/console/(shell)/security/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { listSecurity } from "@albora/application";
import { ConsoleEmptyState, PageHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { rows } = await listSecurity({ pool: getPool() }, { actor, limit: 200 });

  const porTipo = new Map<string, number>();
  for (const evento of rows) porTipo.set(evento.kind, (porTipo.get(evento.kind) ?? 0) + 1);

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Segurança" description="Trilha que avisa — sem ação." />
        <ConsoleEmptyState title="Nenhum evento de segurança ainda" description="Login falho, rate limit e reuso de sessão aparecem aqui." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Segurança" description="security_events agrupado por tipo — sem ação." />
      <div className="flex flex-col gap-3">
        {[...porTipo.entries()].map(([kind, count]) => (
          <div key={kind} className="flex items-center justify-between rounded-token border border-linha bg-superficie p-4">
            <span className="tipo-den-corpo text-ink">{kind}</span>
            <span className="tipo-den-dado tabular-nums text-ink">{count}</span>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/security/list-security-events.test.ts && pnpm --filter @albora/application typecheck && pnpm --filter web exec vitest run "app/console/(shell)/security/page.test.ts" && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application/src/security packages/application/src/index.ts "apps/web/app/console/(shell)/security"
git commit -m "$(cat <<'EOF'
feat(console): tela Segurança

Envelope fino sobre listSecurityEvents (Onda A). Agrupado por tipo com
contagem, sem RLS/agregação (mesma razão de Auditoria), sem ação.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Verificação da onda (controller)

**Files:** nenhum novo — só verificação.

**Interfaces:** nenhuma.

- [ ] **Step 1: Escrever o teste que falha**

Não aplicável — task de verificação, não de código novo. O "teste que falha" é a checklist abaixo antes de rodar.

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

# nenhum hex novo em componente das telas desta onda
grep -rnE "#[0-9a-fA-F]{3,8}\b" apps/web/app/console packages/ui-web/src/entity-header.tsx packages/ui-web/src/filter-bar.tsx packages/ui-web/src/detail-panel.tsx && echo "FALHA: hex hardcodado" || echo "OK"

# nenhuma coluna/label com nome de convidado (display_name, guestName) nas telas de Eventos
grep -rniE "displayName|guestName|nome.*convidado" apps/web/app/console/\(shell\)/events packages/db/src/events-admin.ts && echo "FALHA: possível PII de convidado" || echo "OK"
```
Expected: os três `grep` de conferência não encontram nada (saída "OK").

- [ ] **Step 5: Commit**

Sem arquivo novo para commitar nesta task — se algum dos comandos acima falhar e exigir correção, o fix é um commit próprio, escopado ao arquivo corrigido, não a esta task de verificação.

---

## Auto-revisão

1. **Toda tarefa da espinha virou task:** T1→Task 1, T2→Task 2, T3→Task 3, T4→Task 4, T5→Task 5, T6→Task 6, T7→Task 7, T8→Task 8, T9→Task 9, T10→Task 10, T11→Task 11. 11 de 11.
2. **Varredura de placeholder:** nenhum "TBD", "tratamento de erro apropriado" ou "similar à Task N" no texto acima — cada step de código tem o arquivo inteiro.
3. **Consistência de tipos entre tasks:**
   - T2 exporta `getPlatformOverview`/`getPlatformRevenue`/`VENDOR_PLAN_PRICE_CENTS`/`MetricWithBaseline` — T3 e T7 importam exatamente esses nomes.
   - T4 exporta `AccountAdminRow`/`listAccounts` — T5 estende `AccountAdminRow` para `AccountDetailAdmin` no mesmo arquivo (`accounts-admin.ts`), sem duplicar o tipo base.
   - T6 exporta `EventAdminRow`/`listEvents`/`getEvent` — usados por `events-table.tsx` e pela página de detalhe, mesmos nomes.
   - T9/T10 reaproveitam `AuditRow`/`SecurityEventRow`/`AuditLogFilter`/`SecurityEventFilter` **exatamente como a Onda A os definiu** (`packages/db/src/audit.ts`) — nenhum tipo novo paralelo foi criado.
   - Toda rota de console (Task 3-10) importa só de `@albora/application` e `@albora/ui-web` — nunca `@albora/db` diretamente (guard `camadas` cobre isso na Task 11).
4. **Nenhuma query sobre tabela/coluna não confirmada:** toda tabela usada (`accounts`, `vendors`, `vendor_members`, `vendor_subscriptions`, `billing_payments`, `events`, `guest_sessions`, `uploads`, `funnel_events`, `retention_jobs`, `support_tickets`, `analytics_snapshots`, `audit_log`, `security_events`, `host_sessions`) foi lida da migration real antes de entrar numa query. Onde a coluna não existia (`vendor_subscriptions.next_due_date`, `accounts.last_seen_at`, `vendor_subscriptions.canceled_at`), a tabela de Lacunas documenta a aproximação ou o `—` honesto — nenhuma dessas três virou coluna inventada em código.
