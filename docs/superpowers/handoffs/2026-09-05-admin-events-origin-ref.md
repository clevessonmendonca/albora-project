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

`cookies` de `next/headers` ainda não é importado neste arquivo — confirmado por
`grep -n "next/headers" apps/web/lib/api/handlers/admin-events.ts` (zero ocorrências). `isRefToken`
também não está entre os símbolos já importados de `@albora/core` (hoje só `FUSO_PADRAO`,
`fusoIanaValido`, `instanteLocalNoFuso`, linha 10) — dá pra acrescentar como import próprio (acima)
ou juntar na linha 10 existente; decisão de estilo de quem aplica.

No início do handler que cria o evento (antes do primeiro `recordProductEvent`):

```ts
    const refCookie = (await cookies()).get(COOKIE_REF)?.value;
    const originRef = isRefToken(refCookie) ? refCookie : null;
```

Linha 184 (confirmada em `apps/web/lib/api/handlers/admin-events.ts` via
`grep -n "recordProductEvent" apps/web/lib/api/handlers/admin-events.ts` em 2026-09-05):

```ts
        void recordProductEvent(getPool(), "account_created", { originRef });
```

Linha 202 (mesma confirmação):

```ts
    void recordProductEvent(getPool(), "event_created", { originRef });
```

Hoje as duas chamadas são `recordProductEvent(getPool(), "account_created")` e
`recordProductEvent(getPool(), "event_created")`, sem terceiro argumento — o diff acima
acrescenta `{ originRef }`.

## Garantias
- `originRef` é rótulo opaco de 24 chars; nunca `event_id`, nunca PII. Não logar.
- O cookie não é limpo aqui (expira em 30 min). Se quiserem consumo único, é uma linha a mais: `(await cookies()).delete(COOKIE_REF)` — decisão do admin.
- Sem o cookie, comportamento idêntico ao atual (`originRef: null`).

## Verificação sugerida
Teste do handler: mockar `next/headers` `cookies()` devolvendo `{ get: () => ({ value: "a".repeat(24) }) }` e assertar que `recordProductEvent` foi chamado com `{ originRef: "a".repeat(24) }`.
