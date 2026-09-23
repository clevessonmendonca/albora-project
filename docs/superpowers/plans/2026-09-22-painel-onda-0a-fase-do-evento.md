# Onda 0A — Fase unificada do evento (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Álbora um vocabulário único de fase do evento — `rascunho | antes | durante | depois` — derivado no domínio, consumido por toda superfície, e com o encerramento de evento finalmente escrevível.

**Architecture:** A fase é **derivada, não armazenada**: uma função pura em `@albora/core` lê `status` mais `comecaEm`/`terminaEm` e devolve a fase. Nenhuma coluna nova, nenhum campo que possa divergir da verdade, nenhuma migration. O que falta no caminho de dados é pontual: `ResumoEvento` não traz `status` (a listagem por isso inventou um enum próprio), e `events.status` aceita `'ended'` desde a migration 0056 sem que nada jamais escreva esse valor.

**Tech Stack:** TypeScript, pnpm workspaces, vitest, Next.js App Router, node-postgres.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§6.1, §6.2), commit `8868ba42`.

## Global Constraints

- Toda tabela com dado de evento tem `event_id`, RLS **FORÇADO**, política com `NULLIF(current_setting('app.event_id', true), '')::uuid`. Este plano não cria tabela, mas nenhuma query nova pode cruzar eventos.
- Sempre `SET LOCAL`, nunca `SET`. Os helpers `comConta`/`withEvent` já fazem isso — use-os, não abra conexão à mão.
- Migrations são forward-only. Este plano **não tem migration**.
- Nenhum hex hardcodado em componente; cor sai de token.
- Nenhuma string de domínio (`noiva`, `casamento`, `noivos`) no núcleo, no schema ou no JSX.
- Por padrão, **nenhum comentário**. Mantenha um só se for invariante de segurança/correção invisível no código, workaround com link, supressão com motivo, ou contrato que o nome e a assinatura não carregam.
- Commits em Conventional Commits com escopo: `feat(core):`, `fix(admin):`, `refactor(db):`.
- Convenção de export do repositório: nome em pt-BR no `index.ts`, mais alias em inglês marcado com `/** English alias — preferred for new code. @see <nome> */`.
- Nunca fazer merge de MR sem pedido explícito.

## Pré-requisito de ambiente

Os testes de `packages/db` rodam contra **Postgres de verdade** via `prepararBanco()`/`semear()` de `packages/db/src/testes/banco.ts`. O `pnpm db:up` usa Docker; nesta máquina o Docker não sobe. Use o Postgres local (Homebrew) com um banco dedicado a esta worktree e exporte a variável de conexão que `testes/banco.ts` lê antes de rodar a suíte de `db`. Os testes de `packages/core` e de `apps/web/lib` são puros e não precisam de banco.

Node 22 em shell não-interativo: exporte o PATH do Node 22 antes de qualquer `pnpm`, senão o pnpm recusa.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `packages/core/src/fase.ts` *(criar)* | A função pura `faseDoEvento` e seus tipos. Único lugar que decide fase. |
| `packages/core/src/fase.test.ts` *(criar)* | Testes da fase, incluindo os instantes exatos de borda. |
| `packages/core/src/index.ts` *(modificar)* | Export pt-BR e alias em inglês. |
| `packages/db/src/moderation-event.ts` *(modificar)* | `status` em `ResumoEvento` e no SELECT da listagem; nova `encerrarEvento`. |
| `packages/db/src/moderation-event.test.ts` *(modificar)* | Cobertura de `status` na listagem e do encerramento. |
| `packages/db/src/index.ts` *(modificar)* | Export de `encerrarEvento` e alias. |
| `apps/web/lib/api/event-status.ts` *(criar)* | Validação pura do `status` pedido no corpo do PATCH — pura para poder ser testada sem mock de autenticação. |
| `apps/web/lib/api/event-status.test.ts` *(criar)* | Testes da validação. |
| `apps/web/app/api/admin/events/[eventId]/route.ts` *(modificar)* | Aceita `status: "ended"`, gated a papel couple. |
| `apps/web/app/admin/page.tsx` *(modificar)* | Consome `faseDoEvento`; o enum paralelo morre. |
| `docs/redesign/painel.md` *(modificar)* | Marcado como superado pela spec nova. |

---

### Task 1: `faseDoEvento` no núcleo

**Files:**
- Create: `packages/core/src/fase.ts`
- Test: `packages/core/src/fase.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Evento` de `./tipos` (tem `comecaEm: Date`, `terminaEm: Date`).
- Produces: `faseDoEvento(evento: EventoComFase, agora: Date): FaseDoEvento`, com `FaseDoEvento = "rascunho" | "antes" | "durante" | "depois"`, `StatusDoEvento = "draft" | "active" | "ended"` e `EventoComFase = Pick<Evento, "comecaEm" | "terminaEm"> & { status: StatusDoEvento }`. As tasks 2, 5 e todas as ondas seguintes dependem destes nomes.

- [ ] **Step 1: Escrever o teste que falha**

Crie `packages/core/src/fase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { faseDoEvento } from "./fase";

const em = (iso: string) => new Date(iso);

const janela = {
  comecaEm: em("2026-06-01T22:00:00Z"),
  terminaEm: em("2026-06-02T04:00:00Z"),
};

describe("fase do evento", () => {
  it("rascunho ignora o calendário", () => {
    const evento = { ...janela, status: "draft" as const };

    expect(faseDoEvento(evento, em("2026-05-01T00:00:00Z"))).toBe("rascunho");
    expect(faseDoEvento(evento, em("2026-06-02T00:00:00Z"))).toBe("rascunho");
    expect(faseDoEvento(evento, em("2027-01-01T00:00:00Z"))).toBe("rascunho");
  });

  it("encerrado à mão vence a janela que ainda não acabou", () => {
    const evento = { ...janela, status: "ended" as const };

    expect(faseDoEvento(evento, em("2026-06-02T00:00:00Z"))).toBe("depois");
  });

  it("antes do começo", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-01T21:59:59Z"))).toBe("antes");
  });

  it("no instante exato do começo já está durante", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-01T22:00:00Z"))).toBe("durante");
  });

  it("no instante exato do fim ainda está durante", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-02T04:00:00Z"))).toBe("durante");
  });

  it("passado o fim, depois", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-02T04:00:01Z"))).toBe("depois");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run packages/core/src/fase.test.ts
```

Esperado: FAIL, não resolve o módulo `./fase`.

- [ ] **Step 3: Implementar**

Crie `packages/core/src/fase.ts`:

```ts
import type { Evento } from "./tipos";

export type StatusDoEvento = "draft" | "active" | "ended";

export type EventoComFase = Pick<Evento, "comecaEm" | "terminaEm"> & {
  status: StatusDoEvento;
};

export type FaseDoEvento = "rascunho" | "antes" | "durante" | "depois";

/** A listagem derivava fase de datas e o painel lia `status` do banco: dois vocabulários para o mesmo evento. Esta é a única fonte. */
export function faseDoEvento(evento: EventoComFase, agora: Date): FaseDoEvento {
  if (evento.status === "draft") return "rascunho";
  if (evento.status === "ended") return "depois";
  if (agora.getTime() < evento.comecaEm.getTime()) return "antes";
  if (agora.getTime() > evento.terminaEm.getTime()) return "depois";
  return "durante";
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run packages/core/src/fase.test.ts
```

Esperado: PASS, 6 testes.

- [ ] **Step 5: Exportar do pacote**

Em `packages/core/src/index.ts`, junto dos outros exports de tipo do topo, some:

```ts
export type { EventoComFase, FaseDoEvento, StatusDoEvento } from "./fase";
export { faseDoEvento } from "./fase";
```

E na seção de aliases em inglês no fim do arquivo (onde já vivem `interactionMode` e `interactionOpen`):

```ts
/** English alias — preferred for new code. @see faseDoEvento */
export { faseDoEvento as eventPhase } from "./fase";
```

- [ ] **Step 6: Conferir tipos**

```bash
pnpm typecheck
```

Esperado: sem erro.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/fase.ts packages/core/src/fase.test.ts packages/core/src/index.ts
git commit -m "feat(core): fase do evento derivada de status e calendário"
```

---

### Task 2: `status` na listagem de eventos

Hoje `listarEventosDoHost` faz `SELECT id, slug, pack_id, starts_at, ends_at` e devolve `ResumoEvento`, que não tem `status`. É exatamente por isso que a página de listagem inventou o enum próprio.

**Files:**
- Modify: `packages/db/src/moderation-event.ts:17-23` (tipo), `:25-38` (`EventoDoHost`), `:93-110` (query)
- Test: `packages/db/src/moderation-event.test.ts`

**Interfaces:**
- Consumes: `StatusDoEvento` de `@albora/core` (Task 1).
- Produces: `ResumoEvento` passa a ter `status: StatusDoEvento`. `EventoDoHost` herda em vez de redeclarar.

- [ ] **Step 1: Escrever o teste que falha**

Em `packages/db/src/moderation-event.test.ts`, dentro do `describe("moderacao do evento pelo host", ...)`, some:

```ts
  it("a listagem traz o status do evento", async () => {
    const deA = await listarEventosDoHost(app, dados.a.contaId);
    const evento = deA.find((e) => e.eventoId === dados.a.eventoId);

    expect(evento?.status).toBe("active");
  });
```

O semeador cria evento com `status` explícito `'active'`, então este é o valor esperado.

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run packages/db/src/moderation-event.test.ts -t "traz o status"
```

Esperado: FAIL — `status` é `undefined`, e o TypeScript acusa propriedade inexistente em `ResumoEvento`.

- [ ] **Step 3: Implementar**

Em `packages/db/src/moderation-event.ts`, importe o tipo do núcleo e acrescente o campo:

```ts
import type { StatusDoEvento } from "@albora/core";

export type ResumoEvento = {
  eventoId: string;
  slug: string;
  packId: string;
  comecaEm: Date;
  terminaEm: Date;
  /** `draft` = ainda não publicado; convidado não acessa (task 6, gap I1). */
  status: StatusDoEvento;
};
```

Em `EventoDoHost`, **remova** a linha `status: "draft" | "active" | "ended";` e o comentário que a acompanha — o campo agora vem de `ResumoEvento`.

Na query de `listarEventosDoHost`, inclua a coluna e o mapeamento:

```ts
    const { rows } = await c.query<Omit<LinhaCompleta, "panic" | "hardened" | "has_minors">>(
      `SELECT id, slug, pack_id, starts_at, ends_at, status
         FROM events
        ORDER BY starts_at DESC`,
    );
    return rows.map((l) => ({
      eventoId: l.id,
      slug: l.slug,
      packId: l.pack_id,
      comecaEm: l.starts_at,
      terminaEm: l.ends_at,
      status: l.status as StatusDoEvento,
    }));
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run packages/db/src/moderation-event.test.ts
pnpm typecheck
```

Esperado: todos os testes do arquivo passam e o typecheck fica limpo. Se o typecheck acusar `mapEvento`, é porque o cast de `status` lá ficou redundante — remova o cast, não mude o tipo.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/moderation-event.ts packages/db/src/moderation-event.test.ts
git commit -m "feat(db): listagem de eventos passa a trazer status"
```

---

### Task 3: `encerrarEvento` no banco

`events.status` aceita `'ended'` desde a migration 0056 e nada nunca escreveu esse valor.

**Files:**
- Modify: `packages/db/src/moderation-event.ts` (ao lado de `publicarEvento`, linha 176), `packages/db/src/index.ts`
- Test: `packages/db/src/moderation-event.test.ts`

**Interfaces:**
- Produces: `encerrarEvento(pool: Pool, accountId: string, eventoId: string): Promise<EventoDoHost | null>`. A Task 4 consome.

- [ ] **Step 1: Escrever o teste que falha**

Em `packages/db/src/moderation-event.test.ts`, acrescente ao import de `./moderation-event` o nome `encerrarEvento`, e adicione:

```ts
  it("encerra um evento publicado", async () => {
    const depois = await encerrarEvento(app, dados.a.contaId, dados.a.eventoId);

    expect(depois?.status).toBe("ended");
  });

  it("nao encerra evento de outra conta", async () => {
    const cruzado = await encerrarEvento(app, dados.a.contaId, dados.b.eventoId);

    expect(cruzado).toBeNull();
  });
```

Coloque estes dois testes **no fim do describe**: o primeiro muda o estado do evento `a`, e os testes anteriores assumem `active`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run packages/db/src/moderation-event.test.ts -t "encerra"
```

Esperado: FAIL — `encerrarEvento` não existe.

- [ ] **Step 3: Implementar**

Em `packages/db/src/moderation-event.ts`, logo depois de `publicarEvento`:

```ts
export async function encerrarEvento(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<EventoDoHost | null> {
  return comConta(pool, accountId, async (c) => {
    await c.query(
      `UPDATE events SET status = 'ended' WHERE id = $1 AND status = 'active'`,
      [eventoId],
    );

    const { rows } = await c.query<LinhaCompleta>(
      `SELECT ${COLUNAS} FROM events WHERE id = $1`,
      [eventoId],
    );
    return rows[0] ? mapEvento(rows[0]) : null;
  });
}
```

A cláusula `AND status = 'active'` é o que impede reencerrar um evento e impede encerrar um rascunho; o `comConta` é o que garante o isolamento por conta.

Em `packages/db/src/index.ts`, ao lado de `publicarEvento` no bloco de exports de `./moderation-event`, some `encerrarEvento`, e junto dos aliases em inglês:

```ts
/** English alias — preferred for new code. @see encerrarEvento */
export { encerrarEvento as endEvent } from "./moderation-event";
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run packages/db/src/moderation-event.test.ts
pnpm typecheck
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/moderation-event.ts packages/db/src/moderation-event.test.ts packages/db/src/index.ts
git commit -m "feat(db): encerrar evento escreve status ended"
```

---

### Task 4: PATCH aceita encerramento

O handler hoje tem `const publicar = corpo.status !== undefined && corpo.status === "active";` e recusa qualquer outro valor com 422. A validação sai para um módulo puro porque testá-la dentro do route handler exigiria simular sessão, papel e rate limit.

**Files:**
- Create: `apps/web/lib/api/event-status.ts`
- Test: `apps/web/lib/api/event-status.test.ts`
- Modify: `apps/web/app/api/admin/events/[eventId]/route.ts:32-41` (tipo `Corpo`), `:137` (parsing), `:152-156` (validação), `:160` (papéis), `:186-188` (escrita)

**Interfaces:**
- Consumes: `encerrarEvento` de `@albora/db` (Task 3).
- Produces: `statusPedido(v: unknown): "active" | "ended" | null`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/lib/api/event-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { statusPedido } from "./event-status";

describe("status pedido no corpo do PATCH", () => {
  it("aceita publicar e encerrar", () => {
    expect(statusPedido("active")).toBe("active");
    expect(statusPedido("ended")).toBe("ended");
  });

  it("recusa rascunho: voltar para draft reabriria um evento já público", () => {
    expect(statusPedido("draft")).toBeNull();
  });

  it("recusa lixo", () => {
    expect(statusPedido("")).toBeNull();
    expect(statusPedido(3)).toBeNull();
    expect(statusPedido(null)).toBeNull();
    expect(statusPedido({ status: "active" })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run apps/web/lib/api/event-status.test.ts
```

Esperado: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar o módulo**

Crie `apps/web/lib/api/event-status.ts`:

```ts
export type StatusPedido = "active" | "ended";

export function statusPedido(v: unknown): StatusPedido | null {
  return v === "active" || v === "ended" ? v : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run apps/web/lib/api/event-status.test.ts
```

Esperado: PASS, 3 testes.

- [ ] **Step 5: Ligar no handler**

Em `apps/web/app/api/admin/events/[eventId]/route.ts`:

Importe `encerrarEvento` no bloco de `@albora/db` e `statusPedido` de `@/lib/api/event-status`.

Troque o comentário do campo `status` no tipo `Corpo` por:

```ts
  /** `"active"` publica, `"ended"` encerra. Voltar para `"draft"` nunca é aceito. */
  status?: unknown;
```

Troque a linha do `publicar` por:

```ts
  const pedido = corpo.status !== undefined ? statusPedido(corpo.status) : undefined;
  const publicar = pedido === "active";
  const encerrar = pedido === "ended";
```

Troque a validação de status por:

```ts
  if (corpo.status !== undefined && pedido === null) {
    return errorResponse(422, "validation_error", "Só aceita status active ou ended", {
      campos: ["status"],
    });
  }
```

No teste de "nada para atualizar", troque `!publicar` por `!publicar && !encerrar`.

Encerrar é ação destrutiva e fica com papel couple, como `haMenores`:

```ts
  const allowedRoles =
    haMenores !== undefined || encerrar ? COUPLE_HOST_ROLES : ANY_HOST_ROLES;
```

E depois do bloco `if (publicar) { ... }`:

```ts
    if (encerrar) {
      evento = await encerrarEvento(getPool(), auth.host.accountId, eventId);
    }
```

- [ ] **Step 6: Conferir**

```bash
pnpm typecheck
pnpm lint
pnpm vitest run apps/web/lib/api/
```

Esperado: tudo limpo.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/api/event-status.ts apps/web/lib/api/event-status.test.ts "apps/web/app/api/admin/events/[eventId]/route.ts"
git commit -m "feat(admin): PATCH do evento aceita encerramento com papel couple"
```

---

### Task 5: A listagem consome a fase e o enum paralelo morre

**Files:**
- Modify: `apps/web/app/admin/page.tsx:23-31` (remover), `:83` e `:106-118` (consumir)

**Interfaces:**
- Consumes: `faseDoEvento` de `@albora/core` (Task 1), `ResumoEvento.status` (Task 2).

- [ ] **Step 1: Remover o enum paralelo**

Em `apps/web/app/admin/page.tsx`, apague inteiro:

```ts
type StatusEvento = "vivo" | "agendado" | "encerrado";

function statusDoEvento(
  e: Pick<ResumoEvento, "comecaEm" | "terminaEm">,
  agora: Date,
): StatusEvento {
  if (e.terminaEm && e.terminaEm < agora) return "encerrado";
  if (e.comecaEm <= agora) return "vivo";
  return "agendado";
}
```

Se `ResumoEvento` ficar sem uso no import de `@albora/db`, remova o tipo do import.

- [ ] **Step 2: Consumir a fase**

Some ao import de `@albora/core`:

```ts
import { faseDoEvento } from "@albora/core";
```

Troque `const status = statusDoEvento(e, agora);` por:

```ts
              const fase = faseDoEvento(e, agora);
```

Troque a condição que escurece o nome de evento encerrado:

```ts
                        fase === "depois" ? "text-ink-2" : "text-ink"
```

E troque o bloco dos três selos por quatro, agora incluindo o rascunho que a listagem nunca mostrou:

```tsx
                    {fase === "durante" && (
                      <Badge tone="accent">
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none"
                        />
                        ao vivo
                      </Badge>
                    )}
                    {fase === "antes" && <Badge tone="outline">agendado</Badge>}
                    {fase === "rascunho" && <Badge tone="outline">rascunho</Badge>}
                    {fase === "depois" && <Badge tone="neutral">encerrado</Badge>}
```

- [ ] **Step 3: Conferir**

```bash
pnpm typecheck
pnpm lint
```

Esperado: limpo. Um evento em rascunho agora aparece marcado como tal na listagem, coisa que o enum antigo não sabia dizer.

- [ ] **Step 4: Conferir que nenhum enum paralelo sobrou**

```bash
grep -rn '"vivo"\|"agendado"\|"encerrado"' apps/web/app apps/web/features
```

Esperado: só as strings de texto visível nos `Badge` que você acabou de escrever. Nenhuma declaração de tipo, nenhuma função de derivação.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/page.tsx
git commit -m "refactor(admin): listagem usa a fase do núcleo e perde o enum paralelo"
```

---

### Task 6: Marcar a spec antiga como superada

O repositório não pode carregar duas verdades sobre o mesmo painel (spec §14.5).

**Files:**
- Modify: `docs/redesign/painel.md` (topo do arquivo)

- [ ] **Step 1: Escrever o aviso**

No topo de `docs/redesign/painel.md`, logo abaixo do título, insira:

```markdown
> **Superado.** A arquitetura de informação e as telas descritas aqui foram substituídas por
> `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md`. Este documento fica
> como registro das decisões que levaram até lá; não implemente a partir dele.
```

- [ ] **Step 2: Conferir que nada aponta para ele como se fosse corrente**

```bash
grep -rn "redesign/painel.md" docs/ --include=*.md
```

Onde outro documento citar este como guia de implementação, acrescente a mesma ressalva em uma linha.

- [ ] **Step 3: Commit**

```bash
git add docs/redesign/painel.md
git commit -m "docs(redesign): marca a spec antiga do painel como superada"
```

---

## Fechamento da onda

- [ ] **Suíte completa**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm guards
```

Esperado: tudo verde, incluindo os guards de isolamento e de tokens, que são bloqueantes.

Atenção: o hook de pre-push roda a suíte inteira e passa de quinze minutos. Rode o `pnpm test` antes de empurrar, para não descobrir um vermelho por timeout no push.

- [ ] **Verificar os artefatos antes de declarar pronto**

```bash
git log --oneline -6
git status --short
```

Seis commits novos, árvore limpa. Se a verificação falhar, pare e reporte a lacuna em vez de seguir.

## O que esta onda não faz

Não toca em uma única tela do painel além da listagem, não cria migration, não mexe em componente, e não expõe o encerramento na interface — o botão de encerrar evento entra na Onda 6, sobre o caminho de escrita que esta onda abriu. A Onda 0B (fundação de UI: `useAdminResource`, adoção de `Dialog`/`BottomSheet`/`ToastContainer`/`Skeleton`, morte do `adminClasses`, shell e navegação responsivos) é um plano separado e depende só da Task 1 deste.
