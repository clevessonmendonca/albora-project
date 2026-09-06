# Curadoria do livro — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: `superpowers:subagent-driven-development`.

**Goal:** Dar ao casal uma ordem sugerida de fotos para o livro, calculada sem modelo e sem rede, que **propõe e nunca decide**.

**Architecture:** Três sinais aritméticos sobre o thumb que já existe — hash perceptual, variância do laplaciano, histograma. Cada um vira um score por mídia, nunca um veredito. Uma função de ranking combina os scores numa ordem sugerida. Job assíncrono com claim no banco, no padrão de `ops-retencao`.

**Spec:** `docs/superpowers/specs/2026-09-04-curadoria-e-push-design.md` (§3, §4, §5)

## Global Constraints

- Node 22: `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `git commit`.
- Worktree `/Users/clevesson-mendonca/orca/workspaces/albora-project/curadoria`, branch `feat/curadoria-do-livro`. Não tocar em nenhum outro worktree.
- **Faixa de migration: 0065–0069.** Nenhum outro número.
- **Nunca** rodar `next build` nem `next start`.
- Rodar **`pnpm lint`**, **`pnpm typecheck`** e **`pnpm test`** antes de cada commit. As três.
- Testes de `packages/db/**` rodam em `pnpm test:isolamento` (Postgres em 55432, `pnpm db:up`), não em `pnpm test`.
- Toda tabela com dado de evento: `event_id` uuid NOT NULL FK, RLS **FORÇADA**, policy `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`. `SET LOCAL`, nunca `SET`.
- Migrations forward-only. Símbolo e coluna novos em inglês; prosa em português.
- **IA generativa nunca toca a mídia do convidado** (ADR 0007). Isto é classificação/aritmética, não geração.
- Commit em Conventional Commits, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

### Duas correções ao spec, que envelheceu

1. O spec cita defeitos da moderação como anti-padrões a evitar — gatilho pelo poll do telão e `inFlight` em memória. **Ambos já foram corrigidos** na branch `feat/moderacao-real` (disparo no confirm do upload, claim com `FOR UPDATE SKIP LOCKED`, `reclaimStaleModeration` para claim órfão). A orientação continua válida: **não repita os padrões**; e o padrão corrigido lá é o modelo a seguir aqui.
2. O spec diz que não existe `wrangler.toml`. Existe `apps/web/wrangler.jsonc`, e ele **já declara `triggers.crons`** em `env.homol` e `env.prod` (branch `feat/preparar-producao`). O handler novo deve assumir que haverá cron.

## Fora de escopo desta onda

- **Sinal de diversidade por embedding.** É o único que precisa de serviço externo e credencial. Fica para tarefa própria, atrás de uma porta como a de `ProvedorDeClassificadorDeImagem`.
- **UI do editor do livro.** Território do agente de admin dash — pedido, não trabalho desta frente.
- **Push.** Outra metade do spec, tarefa própria.

---

### Task 1: Schema de curadoria

**Files:** Create `packages/db/migrations/0065_curadoria.sql`

Duas tabelas: `curation_jobs` (fila por evento, no molde de `retention_jobs`) e `media_curation_scores` (um registro por mídia, com os três scores mais `computed_at`).

Regras: `event_id uuid NOT NULL` com FK e RLS **FORÇADA** com `NULLIF` nas duas. `media_curation_scores` tem PK em `upload_id` e FK `ON DELETE CASCADE`. Score é `real` ou `numeric` **nullable** — `NULL` significa **sinal ausente**, que é diferente de sinal ruim. Índice `(event_id, status)` em `curation_jobs`.

Passos: confirmar número livre (o maior nesta branch é 0055; use 0065 mesmo assim — 0056-0058 são do redesign, 0059-0061 do console, 0062+ da moderação; o runner rastreia por nome em `_migrations`, gap é inofensivo) → escrever → `node tools/guards/isolamento.mjs` → commit.

---

### Task 2: Os três sinais, puros e determinísticos

**Files:** Create `packages/curation/` (pacote novo: `package.json`, `tsconfig.json`, `src/index.ts`), `src/hash-perceptual.ts`, `src/nitidez.ts`, `src/exposicao.ts` e um teste por arquivo.

Copie o formato de `packages/core` para o scaffold. **Sem dependência nova** — os três são aritmética sobre bytes.

- `perceptualHash(pixels, width, height): bigint` — aHash ou dHash sobre luminância. Mais `hammingDistance(a, b): number`.
- `sharpnessScore(pixels, width, height): number` — variância do laplaciano sobre luminância. Maior é mais nítido.
- `exposureScore(pixels, width, height): number` — fração de pixels saturados nos extremos do histograma.

Cada função é **pura**: recebe pixels, devolve número. Nada de I/O, nada de rede, nada de decodificar imagem aqui.

Testes: imagens sintéticas geradas em código (gradiente, ruído, chapado, borrado por média móvel). Duas cópias da mesma imagem têm distância de Hamming zero; imagem borrada tem `sharpnessScore` menor que a nítida; imagem toda branca tem `exposureScore` alto. **Trave os limiares por teste** — mudar um limiar deve ser deliberado.

---

### Task 3: Ranking — propõe, nunca corta

**Files:** Create `packages/curation/src/ranking.ts` + teste

```ts
type MediaScores = { uploadId: string; hash: bigint | null; sharpness: number | null; exposure: number | null };
type Suggestion = { uploadId: string; rank: number; flags: ReadonlyArray<"duplicata" | "desfocada" | "exposicao"> };
rankForBook(scores: readonly MediaScores[], opts): readonly Suggestion[];
```

**Invariantes travados por teste:**
- A saída contém **todas** as mídias de entrada. Nenhuma some, nunca. Curadoria propõe ordem e marca com `flags`; não filtra.
- Score `null` (sinal ausente) **não** vira flag e **não** rebaixa a mídia ao fim — ela fica em posição neutra. Ausência de sinal nunca é tratada como sinal ruim.
- Duplicatas são **agrupadas**: dentro de um grupo de hash próximo, a mais nítida fica sem flag e as outras recebem `duplicata`. Nenhuma é removida.
- Determinístico: mesma entrada, mesma saída. Empate resolvido por `uploadId`, nunca por ordem de chegada.

---

### Task 4: Acesso ao banco, com claim atômico

**Files:** Create `packages/db/src/curation.ts` + teste; modificar o barrel.

`enqueueCuration`, `claimCurationJobs` (`UPDATE ... FOR UPDATE SKIP LOCKED ... RETURNING`, o padrão já usado em `moderation-queue.ts` da branch de moderação), `saveCurationScores`, `listCurationScores`, e recuperação de claim órfão por tempo — o mesmo defeito que a moderação teve.

**Nunca** `Set` em memória para dedup: não sobrevive a mais de uma instância.

Testes contra banco real via `prepararBanco()` (conecta como `albora_app`, não superusuário — é o que torna o teste de RLS válido). Incluir: dois claims concorrentes não pegam o mesmo item; item de evento A invisível sob `SET LOCAL` do evento B.

---

### Task 5: Job `/api/ops/curadoria`

**Files:** Create `apps/web/lib/api/handlers/ops-curadoria.ts`, `apps/web/app/api/ops/curadoria/route.ts` + teste

Molde: `apps/web/lib/api/handlers/ops-retencao.ts` — bearer com `CRON_SECRET`, bypass só em `APP_ENV=dev`. Lê o thumb pelo caminho que a moderação já usa, decodifica, calcula os três sinais, grava os scores.

**Degradação:** erro ao ler thumb, decodificação falhando ou timeout → score **ausente** (`NULL`), nunca score ruim, e a mídia continua no editor como qualquer outra. Falha nunca derruba o job inteiro; um item ruim não impede os outros.

Teto de rodadas contra backlog grande, como o `ops-moderacao` faz.

---

### Task 6: Verificação da onda

Rodada pelo controller. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:isolamento`, todos os guards. **Nenhum `next build`.** Conferir: `curation_jobs` e `media_curation_scores` com `FORCE ROW LEVEL SECURITY` e `NULLIF`; nenhum `Set` de dedup em memória; `rankForBook` nunca remove mídia; nenhuma dependência nova em `packages/curation`.
