# Moderação real — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` para executar tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** Fazer o gate de moderação de fato proteger o telão — classificador que avalia conteúdo, disparado pelo pipeline de mídia, com estado em banco.

**Architecture:** A porta `ProvedorDeClassificadorDeImagem` e o motor `decidirExibicao` não mudam. Entram: um provedor real atrás da porta, uma tabela `photo_moderation` com claim explícito no lugar do `Set` em memória, e o disparo migrando do poll do telão para o confirm do upload.

**Tech Stack:** TypeScript, Vitest, Postgres com RLS forçada, Next.js App Router.

**Spec:** `docs/superpowers/specs/2026-09-04-moderacao-real-design.md`
**Prioridade:** `docs/superpowers/specs/2026-09-04-prioridade-e-arquitetura-de-dominio.md` (P0)
**Contrato de colisão:** `docs/superpowers/specs/2026-09-04-paralelismo-contrato.md`

## Global Constraints

- Node 22: `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `git commit`.
- Worktree próprio deste sub-projeto. NUNCA tocar `merganser`, `ceo-backoffice`, `planning`, nem `.claude/worktrees/**`.
- **Faixa de migration: 0062–0064.** Nenhum outro número.
- **NÃO TOCA:** `packages/application/**`, `packages/ui-web/src/index.ts` (console interno); `apps/web/features/admin/**` (admin dash) — mudança de UI da fila é pedido, não trabalho deste stream.
- Nenhuma task roda `next build` ou `next start`.
- Toda tabela com dado de evento: `event_id` uuid NOT NULL FK, RLS **FORÇADA**, policy `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`. `SET LOCAL`, nunca `SET`. `pg_advisory_xact_lock`, nunca `pg_advisory_lock`.
- Migrations forward-only.
- Nunca logar PII crua. Nunca gravar imagem nem PII em `photo_moderation.result`.
- Símbolo e coluna novos em inglês (ADR 0014); prosa e comentário em português.
- Os vereditos permanecem **exatamente três**: `limpo`, `suspeito`, `sem-resposta`. Confiança do modelo é metadado, nunca veredicto novo.
- O caminho crítico depende só de object storage e Postgres. Moderação degrada, nunca falha, e nunca bloqueia o `PUT` presigned.
- Conventional Commits com escopo. Commit termina com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Helper de teste de banco: `packages/db/src/testes/banco.ts`. Runner: `migrar(pool, dir)` em `packages/db/src/migrar.ts`.

---

### Task 1: Tabela `photo_moderation`

**Files:** Create `packages/db/migrations/0062_photo_moderation.sql`

**Interfaces:**
- Produces: tabela `photo_moderation` com `upload_id` PK, `event_id`, `status`, `provider`, `attempts`, `claimed_at`, `completed_at`, `result`, `created_at`; índice `(event_id, status)`; RLS forçada.

- [ ] **Passo 1: Confirmar o número livre**

`ls packages/db/migrations/ | tail -3`. Esperado: `0061` é o maior nesta branch. Se `0062` já existir, **pare e reporte** — a faixa foi violada por outro stream.

- [ ] **Passo 2: Escrever a migration**

```sql
-- 0062_photo_moderation.sql
-- Estado de moderacao por midia. Substitui o Set em memoria de classify.ts,
-- que nao sobrevive a mais de uma instancia: N workers classificavam o mesmo
-- lote e o custo do provedor era pago N vezes.
--
-- RLS FORCADA, nao so habilitada: ENABLE sozinho nao vale para o dono da
-- tabela, e a aplicacao conecta como dono. O NULLIF e obrigatorio — apos o
-- SET LOCAL o GUC volta a string vazia, e ''::uuid estoura em vez de falhar
-- fechado.

CREATE TABLE photo_moderation (
  upload_id    uuid PRIMARY KEY REFERENCES uploads(id) ON DELETE CASCADE,
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','claimed','done','failed')),
  provider     text,
  attempts     int NOT NULL DEFAULT 0,
  claimed_at   timestamptz,
  completed_at timestamptz,
  -- Categorias e escores brutos do provedor: insumo para recalibrar limiar
  -- sem reclassificar tudo. NUNCA a imagem, nunca PII.
  result       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photo_moderation_pendentes ON photo_moderation (event_id, status);

ALTER TABLE photo_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_moderation FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON photo_moderation
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
```

- [ ] **Passo 3: Verificar contra o guard de isolamento**

`node tools/guards/isolamento.mjs`. Esperado: passa. Esse guard existe exatamente para pegar tabela de evento sem RLS forçada.

- [ ] **Passo 4: Commit**

```bash
git add packages/db/migrations/0062_photo_moderation.sql
git commit -m "feat(db): estado de moderacao por midia com claim e RLS forcada"
```

---

### Task 2: Acesso a `photo_moderation` com claim sem corrida

**Files:** Create `packages/db/src/moderation-queue.ts`, `packages/db/src/moderation-queue.test.ts`; Modify `packages/db/src/index.ts`

**Interfaces:**
- Consumes: tabela da Task 1.
- Produces:
```ts
enqueueModeration(db, { uploadId, eventId }): Promise<void>          // idempotente
claimNextForModeration(db, eventId, limite: number): Promise<ClaimedItem[]>
completeModeration(db, uploadId, { provider, result }): Promise<void>
failModeration(db, uploadId, maxAttempts: number): Promise<"retry" | "failed">
type ClaimedItem = { uploadId: string; eventId: string; attempts: number }
```

- [ ] **Passo 1: Escrever os testes que falham**

Cobrir, no mínimo:
- `enqueueModeration` chamado duas vezes para o mesmo `uploadId` não cria linha duplicada nem estoura (`ON CONFLICT DO NOTHING`).
- **Dois `claimNextForModeration` concorrentes não devolvem o mesmo item.** É o teste central desta task — simule com duas conexões e transações sobrepostas.
- `failModeration` incrementa `attempts` e devolve `"retry"` abaixo do limite; ao atingir `maxAttempts`, marca `status='failed'` e devolve `"failed"`.
- `completeModeration` grava `provider`, `result` e `completed_at`, e leva `status` a `'done'`.
- Uma linha de evento A não é visível sob `SET LOCAL app.event_id` do evento B.

- [ ] **Passo 2: Rodar e ver falhar**

`pnpm --filter @albora/db test moderation-queue`. Esperado: falha por módulo inexistente.

- [ ] **Passo 3: Implementar**

O claim é **um único statement**, para não abrir corrida:

```sql
UPDATE photo_moderation
   SET status = 'claimed', claimed_at = now(), attempts = attempts + 1
 WHERE upload_id IN (
   SELECT upload_id FROM photo_moderation
    WHERE event_id = $1 AND status = 'pending'
    ORDER BY created_at
    LIMIT $2
    FOR UPDATE SKIP LOCKED
 )
 RETURNING upload_id, event_id, attempts;
```

`FOR UPDATE SKIP LOCKED` é o que faz dois workers pegarem itens diferentes em vez de brigarem. Nenhuma função loga PII.

- [ ] **Passo 4: Rodar e ver passar**

`pnpm --filter @albora/db test moderation-queue`. Esperado: verde.

- [ ] **Passo 5: Exportar no barrel e commitar**

```bash
git add packages/db/src/moderation-queue.ts packages/db/src/moderation-queue.test.ts packages/db/src/index.ts
git commit -m "feat(db): fila de moderacao com claim FOR UPDATE SKIP LOCKED"
```

---

### Task 3: Provedor OpenAI atrás da porta existente

**Files:** Create `packages/core/src/classificador-openai.ts`, `packages/core/src/classificador-openai.test.ts`; Modify `packages/core/src/classificador-imagem.ts`, `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `ProvedorDeClassificadorDeImagem`, `VeredictoDoClassificador` de `classificador-imagem.ts`.
- Produces: `provedorOpenAI(config): ProvedorDeClassificadorDeImagem`; `provedorDeImagemDoAmbiente` passa a aceitar `CLASSIFICADOR_IMAGEM_PROVEDOR=openai`.

- [ ] **Passo 1: Confirmar a API antes de escrever qualquer linha**

Ler a documentação oficial vigente da API de moderação e registrar no relatório da task: endpoint exato, nome do modelo que aceita imagem, formato de entrada da imagem, formato da resposta (categorias e escores), limites de taxa, **política de retenção/treino**, e se há custo. **Não assuma gratuidade nem ausência de retenção** — o spec exige verificação. Se a resposta divergir do que este plano supõe, siga a documentação e registre a divergência.

- [ ] **Passo 2: Escrever os testes que falham**

Sem rede em nenhum teste — injete o `fetch`. Cobrir:
- Resposta com categoria acima do limiar → `"suspeito"`.
- Resposta limpa → `"limpo"`.
- HTTP 429, 500, corpo malformado, JSON inesperado → cada um vira `"sem-resposta"`, nunca `"limpo"`.
- Timeout: a chamada respeita `TEMPO_MAXIMO_MS` já existente e vira `"sem-resposta"`.
- Chave de API ausente → `"sem-resposta"` e **nenhuma** chamada de rede.
- O `result` bruto é devolvido para persistência, e **não contém a imagem**.

- [ ] **Passo 3: Rodar e ver falhar**

`pnpm --filter @albora/core test classificador-openai`

- [ ] **Passo 4: Implementar**

`fetch` direto, sem adicionar SDK — a superfície usada é uma chamada só, e dependência nova em `core` é peso permanente. Envia o **thumb**, nunca o full. Falha de qualquer natureza cai em `"sem-resposta"`; quem faz isso já é `classificarImagem`, então o provedor pode lançar à vontade.

Registrar em `provedorDeImagemDoAmbiente` o nome `openai`, sem remover `heuristico`, `silencio` nem `stub`.

- [ ] **Passo 5: Rodar e ver passar**

`pnpm --filter @albora/core test`

- [ ] **Passo 6: Commit**

```bash
git add packages/core/src/classificador-openai.ts packages/core/src/classificador-openai.test.ts packages/core/src/classificador-imagem.ts packages/core/src/index.ts
git commit -m "feat(core): provedor de moderacao OpenAI atras da porta existente"
```

---

### Task 4: Calibragem e orçamento de fila

**Files:** Create `packages/core/src/testes/moderacao-avaliacao/` (imagens benignas + `README.md`), `packages/core/src/classificador-calibragem.test.ts`; Create `docs/runbooks/moderacao-calibragem.md`

**Interfaces:**
- Consumes: `provedorOpenAI` da Task 3.
- Produces: limiar escolhido, travado por teste; procedimento documentado de validação da classe adversa.

- [ ] **Passo 1: Montar o conjunto benigno**

Fotos de festa de **domínio público ou sintéticas**, versionadas no repo. **Nunca** mídia real de convidado de evento real — mídia de convidado não é insumo de desenvolvimento, pela mesma regra que a proíbe como material de marketing. O `README.md` do diretório registra a procedência de cada imagem.

- [ ] **Passo 2: Escrever o teste de orçamento de fila**

Roda o classificador (com respostas gravadas do provedor, não rede viva) sobre o conjunto benigno e afirma: **a taxa de falso positivo fica abaixo do orçamento declarado**. Escolher e registrar o orçamento no teste — o critério é que o anfitrião consiga revisar a fila durante a própria festa, não numa mesa de operação.

- [ ] **Passo 3: Documentar a validação da classe adversa**

`docs/runbooks/moderacao-calibragem.md` descreve o procedimento manual, único e não versionado: quem executa, contra que conjunto (mantido **fora** do repo), qual métrica (taxa de falso negativo), e onde o número resultante é registrado. Deixe explícito o motivo de não versionar: não se commita esse material no histórico do git.

- [ ] **Passo 4: Rodar e commitar**

```bash
git add packages/core/src/testes/moderacao-avaliacao/ packages/core/src/classificador-calibragem.test.ts docs/runbooks/moderacao-calibragem.md
git commit -m "test(core): orcamento de fila e procedimento de calibragem"
```

---

### Task 5: Mover o disparo para o pipeline de mídia

**Files:** Modify `apps/web/lib/domain/media/classify.ts`, `apps/web/lib/api/handlers/wall.ts`; Modify o caso de uso de confirmação em `apps/web/lib/application/use-cases/guest/confirm-upload.ts`; Test: `apps/web/lib/domain/media/classify.test.ts`

**Interfaces:**
- Consumes: `enqueueModeration`, `claimNextForModeration`, `completeModeration`, `failModeration` (Task 2).
- Produces: classificação disparada por upload confirmado, não por poll do telão.

- [ ] **Passo 1: Escrever os testes que falham**

- Confirmar um upload enfileira moderação para aquele `uploadId`.
- **Nenhuma foto fica sem classificar num evento onde o telão nunca foi aberto.** É o defeito que esta task corrige; o teste tem que falhar hoje.
- Falha ao enfileirar **não** derruba o confirm do upload — o caminho crítico segue.
- Duas instâncias processando o mesmo evento não classificam a mesma mídia duas vezes.

- [ ] **Passo 2: Rodar e ver falhar**

- [ ] **Passo 3: Implementar**

Enfileirar no confirm, dentro da transação que já existe se houver uma — a fila é estado, não efeito externo. O processamento em si segue assíncrono e fora do caminho crítico.

**Apagar o `const inFlight = new Set<string>()`** e toda a lógica que depende dele: o claim em banco substitui.

Em `handlers/wall.ts`, o `classifyMediaAfter` deixa de ser a porta única. Mantê-lo como reforço é aceitável; removê-lo também. O que **não** é aceitável é continuar sendo a única coisa que dispara classificação.

Adicionar a rede: um job periódico por evento ativo que drena o que ficou `pending`. Seguir o padrão de job que o projeto já usa — ler `apps/web/lib/api/handlers/ops-retencao.ts` como referência antes de inventar um mecanismo novo.

- [ ] **Passo 4: Rodar e ver passar**

- [ ] **Passo 5: Commit**

```bash
git commit -am "fix(moderacao): disparo sai do poll do telao e vai para o pipeline de midia"
```

---

### Task 6: Vídeo — decidir e tornar explícito

**Files:** Modify `packages/core/src/classificador-imagem.ts` ou criar `packages/core/src/classificador-video.ts`; Test correspondente

- [ ] **Passo 1: Descobrir o comportamento atual**

Ler o caminho do telão e verificar: **vídeo chega a ser exibido?** Se chega, qual veredicto ele carrega hoje? Registrar a resposta no relatório da task antes de escrever código. Se a verificação mostrar que vídeo nunca aparece, esta task vira documentação de uma linha e o resto é descartado — reporte isso em vez de implementar por implementar.

- [ ] **Passo 2: Se vídeo passa — extrair quadro e classificar**

O quadro do **meio**, não o primeiro (primeiro quadro costuma ser preto). Testes: vídeo sem quadro extraível vira `"sem-resposta"`; extração que estoura o tempo vira `"sem-resposta"`.

- [ ] **Passo 3: Documentar a limitação com honestidade**

Um quadro não cobre um vídeo inteiro. O gate de vídeo é mais fraco que o de imagem, e a compensação é denúncia e modo endurecido. Isso vai no código como comentário de invariante e no spec — não se finge cobertura que não existe.

- [ ] **Passo 4: Commit**

---

### Task 7: Verificação da onda

Rodada pelo controller, sem subagente.

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`
- [ ] Todos os guards: `isolamento`, `tokens`, `dominio`, `nomenclatura`, `packs`, `sessao`, `api-routes`, `features`
- [ ] **Nenhum `next build`**
- [ ] Confirmar: `grep -rn "inFlight" apps/web/lib/domain/media/` não retorna nada
- [ ] Confirmar: `photo_moderation` tem `FORCE ROW LEVEL SECURITY` e policy com `NULLIF`
- [ ] Confirmar: nenhuma imagem nem PII em `photo_moderation.result`
- [ ] Confirmar: migrations 0062+ em sequência, nenhuma reescrita
- [ ] Confirmar: os vereditos continuam exatamente três
