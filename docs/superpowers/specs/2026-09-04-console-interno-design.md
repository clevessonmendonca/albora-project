# Console Interno Albora — back-office de equipe (CEO, suporte, financeiro, compliance, ops)

**Data:** 2026-09-04
**Status:** design aprovado — revisão 2 (arquitetura em camadas, ver [ADR 0016](../../adr/0016-camadas-do-console-interno.md))
**Branch:** `feat/ceo-backoffice` (worktree isolado; o redesign premium segue em paralelo em `feat/redesign-premium-ui`)

## 1. O problema

A Albora tem hoje um console `/ops` que **só lê**: insights agregados, fila de tickets, busca de evento. Nenhuma ação. E "ser da equipe" é binário — a tabela `platform_operators` diz sim ou não, e um funcionário é literalmente *uma conta de casal comum* usando o mesmo cookie do admin do próprio casamento.

Isso não sustenta uma empresa operando: não há como o suporte responder um ticket, o financeiro emitir um reembolso, o compliance atender um pedido de titular, nem o dono ver saúde do negócio sem cruzar dado na unha. E não há trilha de auditoria consultável — só `console.log`.

Este documento desenha o console interno que fecha isso, com permissionamento por papel e auditoria como pré-requisito de qualquer mutação.

## 2. O que este console NÃO é

- **Não é o admin do casal.** `/admin` continua sendo a superfície do anfitrião sobre o próprio evento.
- **Não é o portal do fornecedor.** `/admin/vendor` continua sendo a superfície B2B2C do cerimonialista.
- **Não dá login ao convidado.** Convidado não tem conta e nunca terá — ele entra no modelo de permissão como *capacidades de uma sessão opaca escopada a um evento*, nunca como usuário.
- **Não é ferramenta de marketing.** Mídia de convidado nunca sai daqui para material promocional.

## 3. Decisões estruturantes

| Decisão | Escolha | Por quê |
|---|---|---|
| Papéis | RBAC completo desde já, cobrindo todos os atores | A equipe cresce; remodelar permissão depois é caro e arriscado |
| Identidade do staff | Tabela isolada + magic link, desenhada para plugar SSO Google depois | Staff tem poder cross-tenant; misturar com conta de cliente transforma bug de auth de cliente em brecha interna |
| Ações do staff | Atender ticket, agir na assinatura, executar LGPD, impersonar — **limitadas por papel e por política** | Cada uma mexe em dado de cliente; o limite é o que torna aceitável |
| Onde mora a regra | Camada `packages/application`, não `apps/web` | Sete domínios de mutação convergem para monólito de regra no Next; ver [ADR 0016](../../adr/0016-camadas-do-console-interno.md) |
| Ordem de entrega | Espinha (identidade + autorização + auditoria + envelopes) → leitura → mutação | Mutação sem auditoria transacional abriria exceção na régua do próprio projeto |

## 4. Três substratos de identidade

O sistema tem três tipos de ator, com mecanismos de autenticação **deliberadamente separados**. A autorização descreve as capacidades de todos; a autenticação de cada um permanece distinta.

| Substrato | Quem | Autenticação | Muda neste projeto? |
|---|---|---|---|
| **Staff** | Equipe Albora (dono, suporte, financeiro, compliance, eng/ops) | **Novo:** `staff_users` + magic link corporativo, cookie próprio `albora_staff` | Criado do zero |
| **Conta** | Anfitriões (casais) e membros de fornecedor | Existente: `accounts` + magic link, cookie `albora_host` | Intocado |
| **Sessão de convidado** | Convidado na festa | Existente: token opaco assinado, escopado a UM evento, sem login | **Intocado — e nunca ganhará login** |

**Por que staff separado:** (a) comprometer o fluxo de auth do cliente nunca deve virar acesso interno; (b) desligar um funcionário não pode depender de mexer na conta pessoal dele; (c) a auditoria fica limpa — ação de staff é distinguível de ação de cliente por construção.

### 4.1 Endurecimento da sessão de staff

A sessão de staff carrega poder cross-tenant; ela recebe controles que a sessão de anfitrião não precisa:

- **Timeout absoluto** (`expires_at`) — 12h, independente de uso.
- **Timeout de inatividade** (`last_used_at`) — 30 min sem requisição encerra.
- **Rotação** — o token roda a cada renovação; `rotated_from` guarda a cadeia. Reuso de token já rotacionado revoga a cadeia inteira e grava em `security_events`.
- **Step-up** (`reauthenticated_at`) — operação de alto risco exige reautenticação recente (15 min), independente de papel.

Cookie `albora_staff`: HttpOnly, Secure, SameSite=Lax, token opaco, hash no banco.

## 5. Autorização — capacidade, política, e onde cada coisa mora

### 5.1 Capacidades (a unidade de permissão)

Checar `papel === 'support'` espalhado pelo código é frágil. A permissão é verificada por **capacidade**:

```
analytics.platform.read      Ver métricas agregadas da plataforma
accounts.read                Ver conta de cliente (PII mascarada)
accounts.pii.reveal          Revelar contato do TITULAR DA CONTA (anfitrião/fornecedor) — registra em auditoria.
                             Nunca cobre PII de convidado: nome/contato de convidado não aparece no console
                             para nenhum papel, em nenhuma tela. Atender suporte nunca exige isso.
events.read                  Ver agregados de um evento
tickets.read / .write / .assign   Fila de suporte
subscription.read            Ver assinaturas e pagamentos
subscription.mutate          Trocar plano, cortesia, cancelar
subscription.refund          Emitir reembolso
subscription.refund.approve  Aprovar reembolso acima do limiar (só `owner`) — o solicitante nunca aprova o próprio
lgpd.dsar.read / .execute    Pedidos de titular
lgpd.delete_account          Excluir conta a pedido (irreversível)
retention.read               Fila de retenção (d330/d365)
impersonate.request / .approve    Ver como o cliente
staff.manage                 Convidar/remover staff, atribuir papel
audit.read                   Ler a trilha de auditoria
security.read                Ler eventos de segurança
```

### 5.2 Papéis (pacotes de capacidades)

| Papel | Capacidades |
|---|---|
| `owner` | Todas |
| `support` | `analytics.platform.read`, `accounts.read`, `accounts.pii.reveal`, `events.read`, `tickets.*`, `subscription.read`, `impersonate.request` |
| `finance` | `analytics.platform.read`, `accounts.read`, `subscription.read`, `subscription.mutate`, `subscription.refund`, `tickets.read` — **sem** `subscription.refund.approve` |
| `compliance` | `accounts.read`, `accounts.pii.reveal`, `lgpd.*`, `retention.read`, `audit.read`, `security.read`, `events.read` |
| `engineering` | `analytics.platform.read`, `events.read`, `retention.read`, `tickets.read`, `security.read` |

Um staff pode acumular papéis (`staff_role_assignments` é 1:N).

### 5.3 Política contextual — a segunda camada

Capacidade responde "pode reembolsar?". Não responde "pode reembolsar **este valor**, **nesta assinatura**, **agora**". A decisão é um valor com quatro saídas, não um booleano:

```ts
authorize({ actor, capability, resource, context }): Decision
// { allowed }
// | { denied, reason }
// | { needsApproval, approverCapability }
// | { needsReauth }
```

Políticas conhecidas nesta fase (limiares definidos na Onda C, com o dono):

| Capacidade | Política |
|---|---|
| `subscription.refund` | Acima de limiar → `needsApproval` por `subscription.refund.approve` (só `owner`) |
| `lgpd.delete_account` | Sempre `needsReauth` — irreversível |
| `impersonate.request` | Sempre `needsApproval` por `owner` (que pode auto-aprovar) |
| `staff.manage` (atribuir papel) | Sempre `needsReauth` |
| `accounts.pii.reveal` | Permitida, sempre auditada |

**`owner` não escapa da política.** Papel dá capacidade; política dá circunstância. Ver [ADR 0016 §4](../../adr/0016-camadas-do-console-interno.md).

### 5.4 Onde mora o quê — decisão de segurança

- **Quem tem qual papel → banco** (`staff_role_assignments`), porque muda com pessoas entrando e saindo.
- **Qual papel tem qual capacidade → código**, versionado em git (`packages/core/src/authorization/`), revisado em PR.
- **Qual contexto restringe uma capacidade → código**, ao lado das capacidades.

Por que não uma matriz editável pela UI: uma tabela de permissões que a própria UI edita é superfície de escalação de privilégio. Em código, mudar o poder de um papel exige commit revisado — e fica no histórico.

### 5.5 Enforcement

Nenhuma rota decide permissão por conta própria. Toda leitura passa por `executeQuery`, toda mutação por `executeCommand` (§6.1) — e ambos chamam `authorize` antes de qualquer outra coisa. Componente nunca decide permissão; ele apenas não recebe o dado. Regra de review: nenhum `role ===` fora de `packages/core/src/authorization/`.

### 5.6 Os outros atores no mesmo mapa

Documentados como matriz de capacidades (para clareza e para o console mostrar "o que este ator pode"), mas com enforcement onde já vive hoje:

- **Anfitrião:** administra o próprio evento (`event_members.role ∈ couple|planner`, mais o dono implícito via `events.account_id`).
- **Membro de fornecedor:** `vendor_members.role ∈ admin|staff`, escopado ao próprio fornecedor.
- **Convidado:** subir mídia no evento da sessão, reagir, remover a própria mídia. Enforcement pelo token opaco + RLS por `event_id`. **Nunca vira conta.**

## 6. Camadas e envelopes — a espinha que legitima a mutação

Detalhamento e alternativas rejeitadas em [ADR 0016](../../adr/0016-camadas-do-console-interno.md).

```
apps/web/app/console/**     rota RSC + server action — sem regra de negócio
apps/web/lib/console/**     sessão, cookie, adaptação request → Actor
packages/application/**     casos de uso: queries/ e commands/
packages/core/**            domínio puro: authorization, políticas, tipos
packages/db/**              repositórios, queries, transações
packages/integrations/**    billing, e-mail, storage
```

`core` nunca importa `db`, `application` ou `apps/*`. Guard bloqueante, no molde do guard `pack → core`.

### 6.1 Envelope de comando

Nenhuma mutação do console roda fora dele:

```ts
executeCommand({ actor, capability, reason, target, context, run })
// authorize() → BEGIN → run(tx) → INSERT audit_log NA MESMA TX → COMMIT
```

**Se a auditoria falhar, a mutação não acontece.** Um reembolso sem registro é pior que um reembolso que não ocorreu: o primeiro é irreversível e invisível, o segundo o financeiro tenta de novo.

### 6.2 Envelope de consulta

```ts
executeQuery({ actor, capability, run })
```

Sem transação obrigatória. Auditoria informacional, assíncrona, e **pode** falhar sem derrubar a leitura — é o único lugar onde essa regra vale.

### 6.3 `audit_log` (append-only)

```
audit_log(
  id, at,
  actor_kind ('staff'|'system'|'host'), actor_id, actor_label,   -- label mascarado, nunca PII crua
  action,            -- 'subscription.refund', 'lgpd.delete_account', 'aggregation.read', ...
  target_kind ('account'|'event'|'ticket'|'subscription'|'staff_user'|'platform'), target_id,
  reason TEXT NOT NULL,
  metadata JSONB,    -- ids e contadores; NUNCA nome/telefone/e-mail cru
  request_id, ip_hash
)
```

- **Append-only por grant**: o papel da aplicação recebe `INSERT` e `SELECT`, nunca `UPDATE`/`DELETE`.
- **`reason` obrigatório** — responde "por que essa pessoa mexeu nisso".
- **Sem PII crua no `metadata`** — ids e agregados.
- Leitura protegida por `audit.read` (dono e compliance). Auditoria dos auditores.

### 6.4 `security_events` (assíncrona)

```
security_events(id, at, kind, actor_kind, actor_id, ip_hash, request_id, metadata JSONB)
```

`kind ∈ login.failed | magic_link.abuse | capability.denied | rate_limit.exceeded | session.reuse | reauth.failed`.

Alto volume, retenção própria, escrita fora do caminho crítico. Leitura por `security.read`.

**`application_logs` não vira tabela.** Latência, stack e `request_id` são observabilidade e vão para stdout, onde já vão.

### 6.5 Toda agregação cross-tenant passa a gravar

O primitivo `comAgregacao` em `packages/db` permanece. O console nunca o chama direto; chama `withPlatformAggregation({ actor, capability, reason, run })`, que garante capacidade, motivo não-vazio, pool do papel `albora_agregador` e linha em `audit_log`. Efeito: "quem cruzou eventos, quando e por quê" vira consulta SQL, não `grep`.

### 6.6 Repositório exige contexto de tenant

```ts
getAccount({ accountId, tenantContext })   // sim
getAccount(accountId)                       // não
```

O isolamento deixa de depender de o desenvolvedor lembrar do `SET LOCAL`.

## 7. Analytics da plataforma (a visão do dono)

### 7.1 Caminho de dados

- Todo dado cross-evento vem por `withPlatformAggregation` (§6.5).
- **Preferir `analytics_snapshots`** (já materializado por job) para os painéis; consulta viva só no drill-down.
- Queries confinadas em `packages/application/src/analytics/`. **Sem** matview, cache ou warehouse nesta fase — o produto tem volume próximo de zero; a costura é o que importa, para que trocar por precomputado depois toque um diretório.
- **Zero PII de convidado.** Agregados apenas.

### 7.2 O que o console mostra

- **Estrela-guia — H1:** % de convidados presentes que enviaram ≥1 foto. É a hipótese que decide se o negócio existe; ela abre o console, com tendência e distribuição por evento.
- **Ativação:** funil escaneou → consentiu → primeira foto, e onde morre.
- **Volume:** eventos criados/ativos/encerrados, convidados alcançados, fotos.
- **Receita:** MRR de assinatura de fornecedor + pagamentos por evento, inadimplência.
- **Canal B2B2C:** fornecedores por plano e status, eventos por fornecedor.
- **Saúde do suporte:** tickets abertos, SLA estourado, volume.
- **Saúde operacional:** fila de retenção (pendente/falhou), falhas de export.

## 8. Mesa de suporte

O schema já existe e nunca foi usado para escrever (`support_tickets` tem `status`, `priority`, `sla_due_at`, `assignee_account_id`; `support_messages` guarda a thread).

- **Fila** com filtros (status, prioridade, SLA estourado, responsável, busca por conta/evento) e paginação. Hoje é `LIMIT 50` fixo, sem filtro.
- **Detalhe do ticket:** thread, responder (`author_kind='operator'`), atribuir, mudar status/prioridade.
- **SLA visível** com contagem regressiva e destaque de estouro (P0 15min, P1 4h, P2 24h já definidos).
- **Painel de contexto do cliente** ao lado do ticket: conta, plano, eventos, pagamentos recentes, erros recentes — **PII mascarada por padrão**, com ação explícita de revelar que grava `accounts.pii.reveal` na auditoria.

**Decisão de migração:** a policy RLS `ops_ticket_lista` dá leitura cross-tenant da fila para quem está em `platform_operators`. Com staff saindo de `accounts`, essa policy perde o sujeito. Em vez de reescrevê-la contra um GUC de staff, **a leitura da fila passa a ir por `withPlatformAggregation`** — um caminho cross-tenant sancionado só, uniformemente auditado, e um mecanismo bespoke a menos.

## 9. Administração de assinatura

- **Leitura:** todas as assinaturas de fornecedor + pagamentos por evento, status, MRR, inadimplência.
- **Mutação** (`finance`/`owner`, via `executeCommand`, `reason` obrigatório, política de limiar em reembolso): trocar plano, cortesia/desconto, cancelar, reembolsar.
- **Sempre pelo provider.** A abstração `BillingProvider` (Asaas + stub de dev) ganha as operações administrativas, em `packages/integrations`. O webhook continua sendo a fonte da verdade e a idempotência (`billing_webhook_events`) permanece. **Nunca** mexer no estado de cobrança direto no banco — isso criaria divergência silenciosa com o gateway.

## 10. LGPD e compliance

Três peças, sendo uma delas uma **regra de produto hoje descumprida**.

### 10.1 Exclusão de conta a pedido (fecha lacuna existente)

O `CLAUDE.md` exige "excluir conta exclui de verdade, e rápido". Hoje só existe o ciclo automático por evento (d330 export → d365 delete). **Não há como atender um pedido de exclusão.** O console implementa:

- Capacidade `lgpd.delete_account`, política `needsReauth` sempre, `reason` obrigatório, confirmação explícita (irreversível).
- Exclusão real: linhas no banco + bytes no R2 + revogação de tokens (Drive), reusando a maquinaria do `d365_delete`.
- **Fail-closed**, como o job de retenção já faz: se o export/purge falhar, não marca como excluído.

### 10.2 Rastreador de pedidos de titular (DSAR)

Nova tabela `dsar_requests`: tipo (acesso/portabilidade/retificação/exclusão), titular, recebido em, prazo legal, status, responsável, artefato de comprovação, concluído em. LGPD tem prazo — é preciso **provar** que foi cumprido, não lembrar que foi.

### 10.3 Monitor de retenção

Fila de `retention_jobs` cross-evento: pendentes, concluídos, **falhados** — com os falhados acionáveis. Hoje ninguém consegue ver isso; o job roda e falha em silêncio para a operação.

### 10.4 Consentimento agregado

Visão cross-evento de versões e aceites (agregado, sem nomes), estendendo o painel por evento que já existe.

## 11. Impersonação — subsistema próprio, não duas capacidades

Duas capacidades não modelam request → approve → janela → encerramento. A impersonação ganha estado explícito:

```
impersonation_requests(
  id, requester_staff_id, approver_staff_id,
  target_account_id, reason TEXT NOT NULL,
  status ('pending'|'approved'|'active'|'ended'|'denied'|'expired'),
  created_at, approved_at, started_at, expires_at, ended_at
)
```

- `impersonate.request` (suporte) + `impersonate.approve` (dono). Dono pode auto-aprovar — o registro continua existindo.
- **TTL curto** (30 min), uso único, encerramento explícito.
- Produz sessão de host **marcada**; toda ação na janela carrega `actor = staff`, `acting_as = account`, `impersonation_id`.
- **Banner persistente** na UI impersonada: "Você está vendo como <conta> — sessão da equipe".
- Auditada na emissão, na aprovação, em toda mutação tentada na janela, e no encerramento.
- **Nunca** dá acesso a mídia de convidado além do que a moderação já permite.
- Registrada de forma que possa ser **divulgada ao titular** se ele perguntar (transparência LGPD).

## 12. Estrutura e UI do console

- Superfície nova em **`/console`**, absorvendo `/ops` (rotas antigas redirecionam).
- **Sidebar persistente** (referência: Linear): Visão geral · Contas · Eventos · Assinaturas · Suporte · LGPD · Auditoria · Segurança · Equipe. Itens filtrados por capacidade.
- Construído sobre o design system já entregue (`.tipo-*`, `.elev-*`, `Button`/`Card`/`Badge`/`Switch`/`TextField`/`Select`, admin em modo claro).
- **Primitivos de console.** Entregues quando a onda que os usa chega, não os vinte de uma vez:

| Onda | Primitivos |
|---|---|
| A | `DataTable` (ordenação, filtro, paginação, vazio/carregando, `tabular-nums`, teclado); gráficos SVG token-driven (sparkline, barra, donut); `PageHeader`; `StatusBadge`; `EmptyState` |
| B | `EntityHeader`, `FilterBar`, `MetricCard`, `DetailPanel` |
| C | `ConfirmDialog`, `DangerDialog`, `Drawer`, `AuditEntry`, `Timeline` |
| D | `CommandPalette` (⌘K) |

- Modo **Operate**: densidade e escaneabilidade acima de expressão. O dado é o herói.

## 13. Não-negociáveis carregados

- Convidado nunca ganha login. Mídia de convidado nunca vira material de marketing.
- **Nunca PII crua** em log, em `metadata` de auditoria ou em `security_events`.
- Query cross-evento **só** por `withPlatformAggregation`, com motivo e linha de auditoria.
- Toda mutação por `executeCommand`; auditoria de comando na **mesma transação**.
- Nenhum `role ===` fora de `packages/core/src/authorization/`.
- `core` não importa `db`/`application`/`apps` — guard bloqueante.
- `SET LOCAL`, nunca `SET`. Migrations forward-only.
- Nenhum hex hardcodado; zero glassmorphism; alvos ≥44px; WCAG AA.
- Inglês canônico para símbolo novo em `packages/*` ([ADR 0014](../../adr/0014-convencao-pt-en-na-base-de-codigo.md)).
- Ladder de deploy: branch de feature → `stable`.

## 14. Ondas de entrega

| Onda | Entrega | Por que nesta ordem |
|---|---|---|
| **A — Espinha** | `staff_users`/sessão endurecida/magic link; autorização (capacidade + política) em `core`; `audit_log` + `security_events`; `executeCommand`/`executeQuery`/`withPlatformAggregation` em `application`; migração de `platform_operators`; shell do console + sidebar; `DataTable` + gráficos + `PageHeader`/`StatusBadge`/`EmptyState` | Nada de mutação existe antes de existir papel, política e trilho auditado |
| **B — Leitura** | Visão geral (H1, ativação, receita, canal); Contas; Eventos; Assinaturas (leitura); Retenção; Auditoria; Segurança | Dá visibilidade ao dono cedo, sem risco de escrita |
| **C — Ação** | Mesa de suporte completa; mutações de assinatura; LGPD (DSAR + exclusão a pedido); impersonação com `impersonation_requests`; limiares de política definidos com o dono | Toda mutação nasce auditada, transacional e limitada por papel e contexto |
| **D — Absorção** | `/ops` redirecionado e removido; policy `ops_ticket_lista` aposentada; portal do fornecedor migrado para `withPlatformAggregation`; `CommandPalette` | Fecha o caminho antigo só quando o novo cobre tudo |

## 15. Critério de sucesso

- O dono abre `/console` e vê a saúde do negócio — H1 na frente — sem pedir query a ninguém.
- Suporte resolve um ticket sem acesso a nada além do necessário, e cada revelação de PII fica registrada.
- Financeiro emite um reembolso; a linha de auditoria diz quem, quando e por quê — e ela existe porque a transação não teria commitado sem ela.
- Um pedido de exclusão de titular é atendido de verdade, dentro do prazo, com comprovante.
- Nenhuma consulta cross-evento acontece fora do caminho auditado.
- Um convidado continua sem nunca ter login.
