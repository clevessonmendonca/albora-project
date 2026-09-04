# 0016 — Camadas do console interno: use case como unidade, garantia por envelope

- **Status:** Accepted
- **Data:** 2026-09-04
- **Relaciona-se com:** [0002](./0002-event-as-tenancy-boundary.md), [0013](./0013-acesso-por-conta-sob-rls.md), [0014](./0014-convencao-pt-en-na-base-de-codigo.md)

## Contexto

O console interno (back-office de equipe: analytics, contas, assinatura, suporte, LGPD, auditoria) traz para dentro do produto uma classe de operação que ele nunca teve: **mutação de dado de cliente feita por alguém que não é o cliente**. Reembolso, troca de plano, exclusão de conta a pedido, revelação de contato, impersonação.

Cada uma dessas operações precisa, sem exceção, de cinco garantias: capacidade do ator, política contextual, transação, trilha de auditoria e limite de tenant. Hoje essas garantias seriam **lembradas** — cada handler faria as cinco coisas na ordem certa, e o dia em que um handler esquecer a quarta é o dia em que existe um reembolso sem registro.

O desenho anterior deste console (spec de 2026-09-04) resolvia identidade, RBAC e auditoria muito bem, mas deixava a regra de negócio se formar dentro de `apps/web/lib` e `app/**/route.ts`. Com quatro ondas de entrega e sete domínios (contas, eventos, assinatura, tickets, LGPD, impersonação, equipe), isso converge para um monólito de regra em `apps/web` — exatamente o formato onde as cinco garantias viram convenção.

Um segundo defeito, mais concreto: o desenho dizia que "falha de auditoria não derruba a leitura". Aplicado uniformemente, isso significa que um reembolso pode ser bem-sucedido **e** perder sua linha de auditoria. É o inverso do que a auditoria existe para garantir.

## Decisão

### 1. Quatro camadas, dependência unidirecional

```
apps/web/app/console/**     rota RSC + server action — sem regra de negócio
apps/web/lib/console/**     sessão, cookie, adaptação request → Actor
packages/application/**     casos de uso: queries/ e commands/
packages/core/**            domínio puro: autorização, políticas, tipos
packages/db/**              repositórios, queries, transações
packages/integrations/**    billing, e-mail, storage (fronteira externa)
```

Direção: `app → application → core`, `application → db`, `application → integrations`.
`core` **nunca** importa `db`, `application` ou `apps/*`. Guard bloqueante, no mesmo molde do guard `pack → core` já existente.

A rota não executa regra. Ela resolve o ator, chama um caso de uso, renderiza o resultado.

### 2. O envelope de comando é a decisão central

As cinco garantias não são convenção — são uma função. Nenhuma mutação do console roda fora dela:

```ts
executeCommand({
  actor,       // { staffUserId, roles, sessionId, requestId, reauthenticatedAt }
  capability,  // Capability
  reason,      // string não-vazia
  target,      // { kind, id }
  context,     // dados da política: valor, estado atual, contagem
  run,         // (tx, audit) => Promise<T>
})
```

Ordem interna, fixa: `authorize()` → `BEGIN` → `run(tx)` → `INSERT audit_log` **na mesma transação** → `COMMIT`.

Consequência deliberada: **se a auditoria falhar, a mutação não acontece.** Um reembolso sem registro é pior que um reembolso que não ocorreu — o primeiro é irreversível e invisível, o segundo o financeiro tenta de novo.

O lado de leitura tem envelope próprio, `executeQuery({ actor, capability, run })`, sem transação obrigatória; sua auditoria é informacional e pode falhar sem derrubar a leitura. É aqui, e só aqui, que vale a regra "auditoria não derruba".

### 3. Autorização em duas camadas: capacidade e política

Capacidade sozinha não responde "reembolsar **quanto**". A decisão passa a ser um valor com quatro saídas, não um booleano:

```ts
authorize({ actor, capability, resource, context }): Decision
// { allowed } | { denied, reason }
// | { needsApproval, approverCapability } | { needsReauth }
```

`needsApproval` e `needsReauth` existirem como saída de primeira classe é o que torna step-up e segunda aprovação estruturais em vez de enxertados depois.

Onde mora cada coisa:

- **quem tem qual papel** → banco (`staff_role_assignments`), muda com gente entrando e saindo;
- **qual papel tem qual capacidade** → código, em git, revisado em PR;
- **qual contexto restringe uma capacidade** → código, ao lado das capacidades.

### 4. `owner` não é superpoder eterno

Operações de alto risco exigem step-up ou segunda aprovação **independente de papel**: exclusão de conta a pedido, reembolso acima de limiar, impersonação, mudança de papel de staff. `owner` é o papel de partida da migração de `platform_operators`, tratado explicitamente como **migração de legado**, não como arquitetura final.

### 5. Duas tabelas de registro, não três

| Tabela | O quê | Escrita |
|---|---|---|
| `audit_log` | Negócio e compliance: reembolso, exclusão, revelação de PII, mudança de papel, agregação cross-tenant | Append-only por GRANT, **dentro da transação** do comando |
| `security_events` | Login falho, magic link abusado, capacidade negada, rate limit, reuso de sessão | Assíncrona, alto volume, retenção própria |

`application_logs` **não vira tabela.** Latência, stack e request_id são observabilidade — vão para stdout, onde já vão. Log de aplicação em Postgres é um índice que ninguém consulta pagando escrita em toda requisição.

### 6. Cross-tenant continua tendo um caminho, agora com nome que assusta

O primitivo `comAgregacao` em `packages/db` permanece. O console **nunca** o chama direto; chama o envelope de aplicação:

```ts
withPlatformAggregation({ actor, capability, reason, run })
```

que garante capacidade, motivo não-vazio, pool do papel `albora_agregador`, linha em `audit_log` e o `BYPASSRLS` isolado num só lugar. Nome em inglês por [ADR 0014](./0014-convencao-pt-en-na-base-de-codigo.md) — `packages/application` é código novo, e inglês é o canônico para código novo em pacotes compartilhados.

### 7. Repositório exige contexto, nunca assume

Assinatura de repositório que toca dado de evento recebe o contexto de tenant explicitamente:

```ts
getAccount({ accountId, tenantContext })   // sim
getAccount(accountId)                       // não
```

O isolamento deixa de depender de o desenvolvedor lembrar do `SET LOCAL`.

### 8. Analytics: costura agora, precomputação quando doer

Toda query de painel vive em `packages/application/src/analytics/`, preferindo `analytics_snapshots` já materializado. **Sem** matview, cache ou warehouse nesta fase: o produto tem volume próximo de zero e otimizar isso agora é otimizar nada. A costura é o que importa — trocar para precomputado depois toca um diretório.

## Alternativas rejeitadas

- **Manter a regra em `apps/web/lib` e refatorar quando doer.** É a opção barata hoje e cara em toda onda seguinte: as sete telas de mutação nascem acopladas ao Next, e o custo da extração cresce com cada uma.
- **Backend separado (serviço próprio).** Resolveria o acoplamento, mas paga deploy, rede, auth de serviço e observabilidade próprios para um time que ainda não existe. Server Actions + camada de aplicação dão a mesma fronteira sem a operação.
- **ORM.** O produto depende de RLS, `SET LOCAL`, advisory locks transacionais e agregação analítica — exatamente o que ORM esconde mal. SQL direto sob repositório permanece.
- **Três tabelas de log.** Ver §5.
- **Auditoria assíncrona uniforme.** Ver §2: é o defeito que este ADR corrige.

## Consequências

**Ganha-se:** as cinco garantias viram estruturais; onda C (mutação) nasce sobre trilho pronto; step-up e aprovação têm lugar desde o dia um; teste de caso de uso não precisa de Next.

**Paga-se:** dois pacotes novos e uma indireção a mais entre rota e SQL. Onda A cresce de 12 para 14 tarefas. Um comando que precise fugir do envelope é sinal de erro de desenho, não de rigidez — e a fuga é visível em review.

**Fica em aberto:** o limiar de valor que dispara `needsApproval` em reembolso é decisão de negócio, definida na Onda C, não aqui.
