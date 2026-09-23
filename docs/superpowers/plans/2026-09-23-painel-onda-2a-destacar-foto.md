# Onda 2A — Destacar foto (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao casal uma forma de dizer "esta aqui é das boas", e não só "esta aqui sai".

**Architecture:** Hoje o anfitrião só tem poder negativo sobre as fotos: liberar, ocultar, remover. Curadoria positiva não existe. Destacar é a peça que falta — um sinal por foto que depois prioriza o telão, a retrospectiva e o topo do álbum. Esta onda entrega o sinal de ponta a ponta; **quem consome** o sinal vem depois, cada superfície na sua onda.

A leitura dos destaques é uma **lista de ids**, não um campo novo em `MidiaDoAlbum`. O tipo do álbum mora no núcleo e alimenta montagem, capítulos, páginas e slots; acrescentar campo ali para um sinal que a UI só precisa cruzar seria mexer em muita coisa para pouco. A tela junta as duas leituras, como já faz com o checklist.

**Tech Stack:** TypeScript, Postgres com RLS, Next.js App Router, vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§5.1, §6.4), commit `8868ba42`.

## Global Constraints

- **`SET LOCAL`, nunca `SET`**: toda escrita passa por `comEvento`. Antes dela, `comConta` confirma que o evento é da conta — é o padrão de `ocultarMidiaDoHost`, e existe porque RLS por evento não diz nada sobre quem é o dono.
- Migration forward-only. Nunca reescreva a 0060 depois de rodada.
- Nenhuma query cruza eventos.
- Destacar é ação de curadoria, não de segurança: **não muda `state`**, não libera nem oculta nada.
- Só foto publicada pode ser destacada. Destacar algo oculto criaria um destaque invisível.
- Nunca logar PII crua.
- Botão do `Button`/`buttonClasses`, leitura pelo `useAdminResource`.
- Por padrão, **nenhum comentário**, exceto invariante de segurança.
- Commits em Conventional Commits. Nunca fazer merge sem pedido explícito.

## Ambiente

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
export TEST_DATABASE_URL="postgres://albora:albora@localhost:5432/albora_test_onda0a"
```

Suíte de `packages/db`: `pnpm vitest run --config vitest.isolamento.config.ts <arquivo>`.

## O que esta onda não faz

Não liga o destaque no telão, na retrospectiva nem na ordenação do álbum. O sinal passa a existir e a ser editável; cada consumidor entra quando a onda daquela superfície chegar. Entregar o sinal sem consumidor é deliberado: é o que permite a fusão das telas de Fotos (Onda 2B) nascer com a aba Destaques cheia de verdade.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/migrations/0060_destaque_de_foto.sql` *(criar)* | A coluna e o índice. |
| `packages/db/src/host-events.ts` *(modificar)* | Destacar, tirar destaque, listar destaques. |
| `packages/db/src/destaque.test.ts` *(criar)* | Testes contra banco real. |
| `packages/db/src/index.ts` *(modificar)* | Exports. |
| `apps/web/app/api/admin/events/[eventId]/album/route.ts` *(modificar)* | Ação no PATCH, destaques no GET. |
| `apps/web/features/admin/components/client/host-album.tsx` *(modificar)* | Destacar e tirar destaque. |

---

### Task 1: A coluna

- [ ] **Step 1: Escrever a migration**

`packages/db/migrations/0060_destaque_de_foto.sql`:

```sql
-- 0060 — destaque de foto (curadoria positiva)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Ate aqui o anfitriao so tinha poder negativo sobre a midia: liberar, ocultar,
-- remover. Destacar e o sinal positivo — "esta aqui e das boas" — que depois
-- prioriza telao, retrospectiva e topo do album.
--
-- Coluna de timestamp em vez de boolean: saber QUANDO foi destacada permite
-- ordenar por curadoria recente sem tabela extra, e `NULL` ja significa "nao
-- destacada" sem valor default mentiroso.
--
-- Nao mexe em `state`. Destacar e curadoria, nao moderacao: uma foto destacada
-- continua publicada, e ocultar uma destacada continua sendo ocultar.

ALTER TABLE uploads ADD COLUMN highlighted_at timestamptz;

-- Indice parcial: a leitura de destaques e sempre "os destaques deste evento",
-- e destaque e minoria da tabela. Indexar a tabela inteira pagaria por linha
-- que nunca aparece nessa consulta.
CREATE INDEX uploads_destaques ON uploads (event_id, highlighted_at DESC)
  WHERE highlighted_at IS NOT NULL;

COMMENT ON COLUMN uploads.highlighted_at IS
  'Quando o anfitriao destacou a foto. NULL = nao destacada. Curadoria, nao moderacao.';
```

- [ ] **Step 2: Conferir que aplica**

```bash
pnpm vitest run --config vitest.isolamento.config.ts packages/db/src/moderation-event.test.ts
```

`prepararBanco()` roda todas as migrations do zero.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(db): coluna de destaque na mídia"
```

---

### Task 2: Destacar, tirar destaque, listar

**Interfaces:**
- Produces: `destacarMidiaDoHost(pool, accountId, eventoId, midiaId, destacada: boolean): Promise<boolean>` e `listarDestaques(cliente: PoolClient, eventoId: string): Promise<string[]>`.

Regras que os testes fixam: destacar devolve `true` e a foto aparece na lista; destacar duas vezes não duplica nem muda o horário original; tirar destaque some da lista; **foto oculta não pode ser destacada** (devolve `false`); foto de outro evento devolve `false`; e a política esconde o destaque alheio numa leitura sem filtro.

- [ ] **Step 1 a 5: TDD normal, seguindo o preâmbulo de `checklist.test.ts`**

O semeador cria uma sessão de convidado por evento; para ter mídia, insira um `uploads` pelo pool `admin` no próprio teste.

```bash
git commit -m "feat(db): destacar e listar fotos destacadas"
```

---

### Task 3: A rota

`PATCH` do álbum hoje aceita `{ midiaId }` e sempre oculta. Ganha `acao`, **opcional**, com `"ocultar"` como padrão — assim nenhum cliente em voo quebra:

- `acao: "ocultar"` (ou ausente) — comportamento de hoje.
- `acao: "destacar"` / `"remover-destaque"` — chama a função nova.

`GET` passa a devolver também `destaques: string[]`.

- [ ] **Steps: implementar, typecheck, lint, commitar**

```bash
git commit -m "feat(admin): rota do álbum aceita destacar"
```

---

### Task 4: A tela

Em `host-album.tsx`, cada foto ganha "Destacar" / "Tirar destaque", e a foto destacada ganha marcação visível que **não seja só cor**. Escrita otimista com rollback, como o checklist.

- [ ] **Steps: implementar, suíte inteira, commitar**

```bash
git commit -m "feat(admin): anfitrião destaca foto no álbum"
```

---

## Resultado da execução

Quatro commits. Suíte em 2768 testes, isolamento em 438, typecheck e lint limpos, 8 guards.

O semeador de teste já criava uma foto por evento (`dados.a.uploadId`), então os testes de destaque nasceram sem precisar montar cenário. Só a foto oculta foi inserida pelo próprio teste, porque nenhuma existia.

Dois testes que valem mais que os outros: o que prova que **destacar duas vezes não mexe no horário original** — sem ele, um toque duplo reordenaria a curadoria —, e o que prova que **destacar não muda `state`**, que é a fronteira entre curadoria e moderação. Se um dia alguém fizer destacar implicar publicar, esse teste cai.

A rota manteve `acao` opcional com `"ocultar"` como padrão. Custou três linhas e garante que nenhum cliente em voo quebre no deploy.

## Pronto quando

- Destacar e tirar destaque funcionam e sobrevivem ao recarregar.
- Foto oculta não pode ser destacada, com teste provando.
- Destaque de um evento nunca aparece em outro, com teste contra banco real sem filtro na query.
- Nenhuma foto muda de `state` por causa de destaque.
- Suíte e isolamento verdes.
