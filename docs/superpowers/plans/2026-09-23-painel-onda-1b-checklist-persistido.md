# Onda 1B — Checklist persistido (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o preparo do evento sobreviver à troca de celular, e parar de pedir à mão o que o sistema já sabe.

**Architecture:** O checklist de pré-evento tem 21 itens de conhecimento operacional real, e vive inteiro em `localStorage` (`apps/web/features/admin/lib/pre-event-checklist.ts`). Troca de aparelho, limpa o navegador, entra o cerimonialista pelo computador dele: o preparo some. Esta onda o move para o banco — mas não todo ele. Cinco dos 21 itens são **deriváveis** de dado que o evento já tem, e pedir para o anfitrião marcar à mão o que o sistema pode ver é fazer o usuário trabalhar de graça. Esses passam a ser calculados; a tabela guarda só os dezesseis que dependem de julgamento humano.

**Tech Stack:** TypeScript, Postgres com RLS, Next.js App Router, vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§6.3), commit `8868ba42`.

## Global Constraints — as não negociáveis, aqui, valendo

- **Tabela com dado de evento tem `event_id` UUID NOT NULL com FK, RLS `ENABLE` *e* `FORCE`,** e política `USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid)`. O `NULLIF` **não é opcional**: depois de um `SET LOCAL`, ao commitar o GUC volta a string vazia, e `''::uuid` estoura em vez de falhar fechado.
- **Sempre `SET LOCAL`, nunca `SET`.** Na prática: toda leitura e escrita passa por `comEvento`/`withEvent`, que já faz isso dentro de transação. Não abra conexão à mão.
- **Migrations são forward-only.** Este arquivo, depois de rodado, nunca é reescrito.
- Nenhuma query cruza eventos.
- Nunca logar PII crua.
- Botão do `Button`/`buttonClasses`, leitura pelo `useAdminResource`, placeholder pelo `Skeleton`. As ondas 0B deixaram isso pronto.
- Por padrão, **nenhum comentário** no código — exceto invariante de segurança, que aqui existe e vai comentado na migration.
- Commits em Conventional Commits. Nunca fazer merge sem pedido explícito.

## Ambiente

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
export TEST_DATABASE_URL="postgres://albora:albora@localhost:5432/albora_test_onda0a"
```

A suíte de `packages/db` é excluída do `pnpm test` (`vitest.config.ts:5`) e roda com config própria: `pnpm vitest run --config vitest.isolamento.config.ts <arquivo>`. Rodar vitest direto ali casa zero arquivo e sai com código 1, parecendo teste vermelho.

## Os cinco que o sistema já sabe

| Item do checklist | Derivado de |
|---|---|
| `missoes` | o evento tem ao menos uma missão |
| `identidade` | `identityTokens` não está vazio |
| `expected-guests` | `expectedGuests` maior que zero |
| `plano` | o plano não é o gratuito |
| `gate` | `interacaoAbreEm` não é nulo |

`menores` fica manual de propósito: o item é "ligado **se aplicável**", e só o casal sabe se aplica.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/migrations/0059_event_checklist.sql` *(criar)* | A tabela e a política. |
| `packages/db/src/checklist.ts` *(criar)* | Ler, marcar e desmarcar. |
| `packages/db/src/checklist.test.ts` *(criar)* | Testes contra banco real, inclusive isolamento. |
| `packages/db/src/index.ts` *(modificar)* | Exports. |
| `apps/web/features/admin/lib/pre-event-checklist.ts` *(modificar)* | Quais itens são derivados, e como combinam com os marcados. |
| `apps/web/features/admin/lib/pre-event-checklist.test.ts` *(criar)* | Testes da combinação. |
| `apps/web/app/api/admin/events/[eventId]/checklist/route.ts` *(criar)* | GET e PATCH. |
| `apps/web/features/admin/components/client/pre-event-checklist.tsx` *(modificar)* | Lê e escreve no servidor. |

---

### Task 1: A tabela

**Files:**
- Create: `packages/db/migrations/0059_event_checklist.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- 0059 — checklist de preparo do evento, no servidor
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- O checklist vivia em localStorage: trocar de celular, limpar o navegador ou
-- entrar pelo computador do cerimonialista apagava o preparo da festa. Preparo
-- de evento e trabalho de varias pessoas em varios aparelhos.
--
-- Presenca da linha = item feito. Desmarcar apaga a linha, em vez de gravar
-- `false`: nao existe diferenca util entre "nunca marcou" e "desmarcou", e a
-- ausencia mantem a tabela pequena.
--
-- Os itens derivaveis do proprio dado (missoes, identidade, convidados
-- esperados, plano, gate) NAO entram aqui — sao calculados na leitura. Gravar
-- copia de algo que o banco ja sabe e criar duas verdades.

CREATE TABLE event_checklist (
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_key   text NOT NULL,
  done_at    timestamptz NOT NULL DEFAULT now(),
  done_by    uuid REFERENCES accounts(id) ON DELETE SET NULL,
  PRIMARY KEY (event_id, item_key)
);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — ENABLE sozinho nao vale para o dono da
-- tabela, e a aplicacao costuma conectar como dono.
--
-- 🔴 O NULLIF e obrigatorio: apos um SET LOCAL, ao commitar, o GUC customizado
-- volta a string vazia (nao a NULL), e ''::uuid ESTOURA. Ver 0001.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE event_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checklist FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON event_checklist
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

GRANT SELECT, INSERT, DELETE ON event_checklist TO albora_app;

COMMENT ON TABLE event_checklist IS
  'Itens de preparo marcados a mao. Os derivaveis do proprio evento sao calculados na leitura, nao gravados aqui.';
```

Confira, antes de rodar, se as tabelas vizinhas concedem privilégio a `albora_app` do mesmo jeito — se o projeto usa `GRANT ... ON ALL TABLES` numa migration anterior, a linha de `GRANT` aqui é redundante e deve sair.

- [ ] **Step 2: Rodar contra o banco de teste e conferir que a política existe**

```bash
pnpm vitest run --config vitest.isolamento.config.ts packages/db/src/moderation-event.test.ts
```

O `prepararBanco()` roda todas as migrations do zero, então a suíte existente passar já prova que a migration aplica sem erro.

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/0059_event_checklist.sql
git commit -m "feat(db): tabela do checklist de preparo, com RLS forçado"
```

---

### Task 2: Ler, marcar, desmarcar

**Files:**
- Create: `packages/db/src/checklist.ts`
- Test: `packages/db/src/checklist.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Produces: `lerChecklist(cliente: PoolClient, eventoId: string): Promise<string[]>`, `marcarItemChecklist(cliente, eventoId, itemKey, accountId: string | null): Promise<void>`, `desmarcarItemChecklist(cliente, eventoId, itemKey): Promise<void>`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `packages/db/src/checklist.test.ts`, seguindo o mesmo preâmbulo de `moderation-event.test.ts` (`prepararBanco`, `semear`, pools `admin` e `app`):

```ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  desmarcarItemChecklist,
  lerChecklist,
  marcarItemChecklist,
} from "./checklist";
import { comEvento } from "./event";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("checklist de preparo", () => {
  it("começa vazio", async () => {
    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens).toEqual([]);
  });

  it("marca e lê de volta", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "prova-qr", dados.a.contaId),
    );

    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens).toContain("prova-qr");
  });

  it("marcar duas vezes não quebra nem duplica", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "telao", dados.a.contaId),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "telao", dados.a.contaId),
    );

    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens.filter((i) => i === "telao")).toHaveLength(1);
  });

  it("desmarca", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "mc", dados.a.contaId),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      desmarcarItemChecklist(c, dados.a.eventoId, "mc"),
    );

    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens).not.toContain("mc");
  });

  it("o checklist de um evento não vaza para o outro", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "pecas", dados.a.contaId),
    );

    const doOutro = await comEvento(app, dados.b.eventoId, (c) =>
      lerChecklist(c, dados.b.eventoId),
    );

    expect(doOutro).not.toContain("pecas");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run --config vitest.isolamento.config.ts packages/db/src/checklist.test.ts
```

- [ ] **Step 3: Implementar**

```ts
import type { PoolClient } from "pg";

export async function lerChecklist(cliente: PoolClient, eventoId: string): Promise<string[]> {
  const { rows } = await cliente.query<{ item_key: string }>(
    `SELECT item_key FROM event_checklist WHERE event_id = $1 ORDER BY item_key`,
    [eventoId],
  );
  return rows.map((l) => l.item_key);
}

export async function marcarItemChecklist(
  cliente: PoolClient,
  eventoId: string,
  itemKey: string,
  accountId: string | null,
): Promise<void> {
  await cliente.query(
    `INSERT INTO event_checklist (event_id, item_key, done_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, item_key) DO NOTHING`,
    [eventoId, itemKey, accountId],
  );
}

export async function desmarcarItemChecklist(
  cliente: PoolClient,
  eventoId: string,
  itemKey: string,
): Promise<void> {
  await cliente.query(`DELETE FROM event_checklist WHERE event_id = $1 AND item_key = $2`, [
    eventoId,
    itemKey,
  ]);
}
```

Exporte os três de `packages/db/src/index.ts`, com os aliases em inglês que o repositório usa.

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run --config vitest.isolamento.config.ts packages/db/src/checklist.test.ts
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/checklist.ts packages/db/src/checklist.test.ts packages/db/src/index.ts
git commit -m "feat(db): ler, marcar e desmarcar itens do checklist"
```

---

### Task 3: O que o sistema já sabe

**Files:**
- Modify: `apps/web/features/admin/lib/pre-event-checklist.ts`
- Test: `apps/web/features/admin/lib/pre-event-checklist.test.ts`

**Interfaces:**
- Produces: `ITENS_DERIVADOS: Record<string, (s: SinaisDePreparo) => boolean>` e `estadoDoChecklist(marcados: string[], sinais: SinaisDePreparo): Record<string, { feito: boolean; derivado: boolean }>`.

Regras que os testes fixam: item derivado aparece feito sem ninguém marcar; item derivado **não** pode ser desmarcado à mão; item manual só fica feito se estiver na lista do servidor; e um item marcado à mão que depois vira derivado não conta duas vezes.

- [ ] **Step 1 a 4: TDD normal**

Escreva o teste, veja falhar, implemente, veja passar. `SinaisDePreparo` reaproveita os mesmos campos de `SinaisDoEvento` de `proximos-passos.ts` — se ficarem idênticos, exporte um tipo só de lá e importe aqui, em vez de manter dois.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(admin): itens deriváveis do checklist deixam de ser trabalho manual"
```

---

### Task 4: A rota

**Files:**
- Create: `apps/web/app/api/admin/events/[eventId]/checklist/route.ts`

Siga o padrão de `apps/web/app/api/admin/events/[eventId]/route.ts`: `requireConfig`, `requireHostSession`, `consume` para limite, `requireHostEventRole` com `ANY_HOST_ROLES` — preparar evento é trabalho de equipe, não só do casal —, e `withEvent` para toda leitura e escrita.

- `GET` devolve `{ marcados: string[] }`.
- `PATCH` recebe `{ item: string; feito: boolean }`, valida que `item` é uma chave conhecida do checklist (recusar chave desconhecida evita que a tabela vire depósito de lixo), e chama marcar ou desmarcar.

- [ ] **Steps: implementar, conferir com typecheck e lint, commitar**

```bash
git commit -m "feat(admin): rota do checklist de preparo"
```

---

### Task 5: A tela

**Files:**
- Modify: `apps/web/features/admin/components/client/pre-event-checklist.tsx`

- [ ] **Step 1: Trocar localStorage por servidor**

Leitura pelo `useAdminResource`; escrita otimista com rollback — marcar um item não pode esperar ida e volta de rede, e é reversível, então é seguro. Item derivado aparece marcado, desabilitado, com uma frase curta dizendo que o Álbora detectou sozinho.

- [ ] **Step 2: Aposentar o localStorage**

`readPreEventChecklist`, `writePreEventChecklist` e `preEventStorageKey` saem, junto com `checklistStorageKey` de `AdminEventPageContext` e do `PreEventPromo` — se este último usa a chave só para contar progresso, passe a contar pelo servidor.

- [ ] **Step 3: Conferir**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:isolamento && pnpm guards
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(admin): checklist de preparo sai do localStorage"
```

---

## Pronto quando

- Marcar um item num aparelho e abrir noutro mostra o item marcado.
- Os cinco itens deriváveis aparecem prontos sem ninguém tocar, e não dá para desmarcá-los à mão.
- O checklist de um evento nunca aparece em outro, com teste contra banco real provando.
- `grep -rn "localStorage" apps/web/features/admin` não retorna nada sobre checklist.
- A suíte inteira e a de isolamento continuam verdes.
