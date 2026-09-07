# Relatório de Validação de Testes — Fases 1 a 4

**Data:** 2026-08-28  
**Escopo:** Validação estática (sintaxe, imports, estrutura). Nenhum teste foi executado.  
**Validador:** QA Engineer (qa-engineer subagent)

---

## Resumo Executivo

| Fase | Descrição | Arquivos | Testes | Status |
|------|-----------|----------|--------|--------|
| Fase 1 | Unit Tests (use-cases) | 27 | 344 | ✅ |
| Fase 2.1 | Contract Tests (validators) | 15 | 169 | ✅ |
| Fase 3 | E2E Tests (Playwright) | 8 | 28 | ✅ |
| Fase 4 | Lighthouse CI | 2 artefatos | — | ⚠️ |

**Total de testes:** 541 (344 + 169 + 28)

---

## Fase 1: Unit Tests ✅

**Localização:** `apps/web/lib/application/use-cases/`  
**Arquivos encontrados:** 27 (18 admin + 7 guest + 2 wall) — exatamente o esperado.

### Contagem por arquivo

#### Admin (18 arquivos — 220 testes)

| Arquivo | Testes `it()` |
|---------|---------------|
| `admin-book-pdf.test.ts` | 12 |
| `admin-challenges.test.ts` | 12 |
| `admin-cover-images.test.ts` | 11 |
| `admin-drive-export-processor.test.ts` | 17 |
| `admin-drive-exports.test.ts` | 11 |
| `admin-drive.test.ts` | 15 |
| `admin-export-jobs.test.ts` | 10 |
| `admin-guestbook-audio.test.ts` | 12 |
| `admin-guestbook.test.ts` | 13 |
| `admin-insights.test.ts` | 12 |
| `admin-music.test.ts` | 12 |
| `admin-print-pieces.test.ts` | 10 |
| `admin-sessions.test.ts` | 14 |
| `admin-step-ups.test.ts` | 9 |
| `admin-vendors.test.ts` | 4 |
| `create-event.test.ts` | 14 |
| `magic-links.test.ts` | 16 |
| `process-retention-jobs.test.ts` | 16 |
| **Subtotal** | **220** |

#### Guest (7 arquivos — 104 testes)

| Arquivo | Testes `it()` |
|---------|---------------|
| `app-pairing.test.ts` | 13 |
| `comments.test.ts` | 20 |
| `confirm-upload.test.ts` | 18 |
| `guestbook.test.ts` | 9 |
| `guest-reads.test.ts` | 16 |
| `music.test.ts` | 11 |
| `reactions.test.ts` | 17 |
| **Subtotal** | **104** |

#### Wall (2 arquivos — 20 testes)

| Arquivo | Testes `it()` |
|---------|---------------|
| `wall-display.test.ts` | 10 |
| `wall-pairing.test.ts` | 10 |
| **Subtotal** | **20** |

**Total Fase 1: 344 testes** ✅ (bate exatamente com o esperado)

### Validações estruturais

- ✅ **Import do vitest:** todos os 27 arquivos importam corretamente de `"vitest"`
- ✅ **Bloco `describe()`:** presente em todos os arquivos
- ✅ **Mock com `vi.hoisted()`:** padrão correto usado nos arquivos que mocam `@albora/db`
- ✅ **`vi.clearAllMocks()` no `beforeEach`:** presente em todos os arquivos que definem mocks
- ✅ **`await expect(...).rejects.toThrow()`:** padrão correto usado em `admin-drive-export-processor.test.ts` (linhas 123 e 236)
- ✅ **Imports relativos:** nenhum import relativo quebrado detectado
- ✅ **Imports `@/` (alias):** todos resolvem para arquivos existentes em `apps/web/`
- ✅ **Imports de `@albora/db`:** mockados corretamente via `vi.mock("@albora/db", ...)`, nunca importados diretamente nos testes
- ✅ **Vitest config:** `vitest.config.ts` na raiz cobre `apps/**/*.test.ts` com ambiente `node`, alias `@` → `apps/web`, e inline de `@albora/db`

### Problemas encontrados

Nenhum problema encontrado na Fase 1.

---

## Fase 2.1: Contract Tests ✅

**Localização:** `apps/web/lib/infrastructure/api/validators/`  
**Arquivos encontrados:** 15 — exatamente o esperado.  
**Padrão dos arquivos:** `<nome>.contract.test.ts`

### Contagem por arquivo

| Arquivo | Testes `it()` |
|---------|---------------|
| `admin-schemas.contract.test.ts` | 8 |
| `app-pair-schemas.contract.test.ts` | 22 |
| `auth-schemas.contract.test.ts` | 8 |
| `challenge-schemas.contract.test.ts` | 19 |
| `comment-schemas.contract.test.ts` | 19 |
| `cover-image-schemas.contract.test.ts` | 5 |
| `drive-schemas.contract.test.ts` | 5 |
| `export-schemas.contract.test.ts` | 9 |
| `feed-schemas.contract.test.ts` | 10 |
| `guestbook-admin-schemas.contract.test.ts` | 5 |
| `guestbook-audio-schemas.contract.test.ts` | 6 |
| `guest-schemas.contract.test.ts` | 9 |
| `reaction-schemas.contract.test.ts` | 15 |
| `upload-schemas.contract.test.ts` | 19 |
| `wall-schemas.contract.test.ts` | 10 |
| **Total** | **169** |

**Total Fase 2.1: 169 testes** ✅ (bate exatamente com o esperado)

### Validações estruturais

- ✅ **Import do vitest:** todos os 15 arquivos importam `{ describe, it, expect }` de `"vitest"`
- ✅ **Schemas fonte existem:** cada arquivo importa de `./<nome>-schemas` — todos os arquivos fonte correspondentes existem na mesma pasta (ex: `upload-schemas.ts`, `reaction-schemas.ts`, etc.)
- ✅ **Sem import direto de Zod:** correto — os testes usam `schema.parse()` e `schema.safeParse()` via os schemas importados, sem dependência direta de `zod`
- ✅ **Padrão `schema.parse()` / `schema.safeParse()`:** consistente em todos os 15 arquivos
- ✅ **Cobertura de casos inválidos:** todos os arquivos têm seções `✅ Validação Correta` e `❌ Rejeição de Input Inválido`
- ✅ **Import de múltiplos nomes em `reaction-schemas.contract.test.ts`:** o que parecia quebrado no `grep` de linha única (`} from "./reaction-schemas"`) é na verdade um import multiline válido (`import { listReactionsSchema, addReactionSchema, removeReactionSchema, } from "./reaction-schemas"`)

### Problemas encontrados

Nenhum problema encontrado na Fase 2.1.

---

## Fase 3: E2E Tests ✅

**Localização:** `apps/web/e2e/specs/`  
**Arquivos encontrados:** 8 — exatamente o esperado.  
**Framework:** Playwright (`@playwright/test`)

### Contagem por arquivo

| Arquivo | Testes `test()` | Cobertura |
|---------|-----------------|-----------|
| `guest-upload-flow.spec.ts` | 3 | Caminho crítico QR → upload → confirmação |
| `guest-upload-flow-offline.spec.ts` | 3 | Resiliência offline + retry |
| `guest-upload-flow-slow.spec.ts` | 4 | Performance em rede 3G |
| `guest-exif-removal.spec.ts` | 4 | Remoção de EXIF (LGPD) |
| `guest-multi-mission.spec.ts` | 4 | Múltiplas missões |
| `guest-story-degradation.spec.ts` | 4 | Degradação graceful (Story) |
| `guest-upload-isolation.spec.ts` | 3 | Isolamento RLS entre eventos |
| `landing-page.spec.ts` | 3 | Landing page do evento |
| **Total** | **28** | |

**Total Fase 3: 28 testes** ✅ (bate exatamente com o esperado)

### Validações estruturais

- ✅ **Import de Playwright:** todos os 8 arquivos importam `{ test, expect }` de `"@playwright/test"`
- ✅ **Helpers existem:** `../helpers/setup-test-event.ts`, `../helpers/cleanup.ts` e `../helpers/auth-helpers.ts` — todos existem em `apps/web/e2e/helpers/`
- ✅ **Exports de `setup-test-event.ts`:** `setupTestEvent`, `getEventUploads` e `getEventBySlug` — todos exportados corretamente, correspondendo às importações dos specs
- ✅ **Fixture:** `apps/web/e2e/fixtures/photo-test.jpg` existe — usado pelos specs de upload
- ✅ **Playwright config:** `playwright.config.ts` em `apps/web/` usa `testDir: "./e2e/specs"`, `baseURL: "http://localhost:3000"`, `retries: 2` no CI, projetos `chromium` + `mobile (iPhone 13)`
- ✅ **Script npm:** `test:e2e` → `playwright test` presente em `apps/web/package.json`
- ✅ **`test.describe()`:** presente em todos os 8 arquivos
- ✅ **Bloco try/finally com `cleanupTestEvent`:** padrão consistente de limpeza após cada teste

### Problemas encontrados

Nenhum problema encontrado na Fase 3.

---

## Fase 4: Lighthouse CI ⚠️

### `lighthouserc.json` — ✅ Estrutura correta

**Localização:** `apps/web/lighthouserc.json`

- ✅ **Estrutura JSON válida** (`ci.collect`, `ci.assert`, `ci.upload`)
- ✅ **numberOfRuns: 3** — suficiente para médias estáveis
- ✅ **Thresholds de performance:** `performance ≥ 0.85`, `accessibility ≥ 0.90`, `best-practices ≥ 0.90`
- ✅ **Core Web Vitals:** LCP, TBT, CLS e FCP configurados
- ✅ **`preset: "lighthouse:recommended"`** como base
- ✅ **`chromeFlags: "--no-sandbox --disable-gpu"`** — necessário para CI em container
- ✅ **`upload.target: "temporary-public-storage"`** — adequado para CI sem servidor LHCI dedicado

**Observação:** A URL auditada é `http://localhost:3000/casamento-joao-maria`. Este slug é um evento de seed de desenvolvimento documentado em `e2e/helpers/setup-test-event.ts` e em `LIGHTHOUSE.md`. O workflow precisa criar (ou seedar) este evento antes de executar o LHCI.

---

### `.github/workflows/lighthouse-ci.yml` — ⚠️ 3 problemas encontrados

#### Problema 1 — `pnpm/action-setup@v2` (desatualizado) ⚠️

```yaml
# linha 36 — lighthouse-ci.yml
uses: pnpm/action-setup@v2

# todos os outros workflows — ci.yml
uses: pnpm/action-setup@v4
```

**Impacto:** `@v2` pode falhar com `packageManager: pnpm@10.32.0` declarado no `package.json` raiz. O `@v4` lê o campo `packageManager` automaticamente; o `@v2` exige o campo `version` explícito no step.  
**Fix:**
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  # versão lida automaticamente do campo "packageManager" no package.json
```

---

#### Problema 2 — `node-version: 20` hardcodado (inconsistente) ⚠️

```yaml
# linha 43 — lighthouse-ci.yml
node-version: 20

# ci.yml (correto)
node-version-file: .nvmrc   # .nvmrc = "22"
```

**Impacto:** O projeto usa Node 22 (`.nvmrc`). Rodar o build em Node 20 pode causar falhas silenciosas ou comportamentos diferentes dos demais jobs de CI.  
**Fix:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
    cache: 'pnpm'
```

---

#### Problema 3 — Sem step de seed do evento auditado ⚠️

O workflow executa `pnpm db:push` (migração do schema) mas **não semeia** o evento `casamento-joao-maria` referenciado em `lighthouserc.json`. Sem este evento no banco, a URL auditada retornará 404, e o LHCI reportará falha de coleta.

**Evidência:** não há chamada a `db:semear` ou equivalente no workflow; o seed só existe em `tools/db/semear-dev.mjs` (desenvolvimento local).

**Fix:** adicionar um step de seed após `db:push`, ou criar um seed mínimo dedicado ao Lighthouse CI:
```yaml
- name: Seed lighthouse test event
  run: node tools/db/semear-dev.mjs --slug casamento-joao-maria --minimal
  env:
    DATABASE_URL: postgresql://postgres:test_password@localhost:5432/albora_test
```
Alternativamente, substituir a URL auditada por uma rota que não dependa de dados no banco (ex.: `/` ou `/sobre`), caso exista.

---

### Resumo dos problemas da Fase 4

| # | Severidade | Localização | Descrição |
|---|------------|-------------|-----------|
| 1 | ⚠️ Médio | `lighthouse-ci.yml` linha 36 | `pnpm/action-setup@v2` deve ser `@v4` |
| 2 | ⚠️ Médio | `lighthouse-ci.yml` linha 43 | `node-version: 20` deve usar `node-version-file: .nvmrc` |
| 3 | ⚠️ Alto | `lighthouse-ci.yml` — step faltante | Evento `casamento-joao-maria` não é semeado antes do LHCI |

---

## Análise de Risco Global

### Pontos críticos cobertos ✅

- **Caminho crítico de upload** (`confirm-upload.test.ts`: 18 testes) — cobre o pipeline mais sensível do produto (CLAUDE.md: ≥90% no pipeline de upload)
- **Isolamento entre eventos** (`guest-upload-isolation.spec.ts`) — testa RLS diretamente no browser, complementando o job `isolamento` do CI
- **EXIF/LGPD** (`guest-exif-removal.spec.ts`) — valida remoção de GPS no cliente antes do upload
- **Resiliência offline** (`guest-upload-flow-offline.spec.ts`) — testa fila persistente e retry, requisito não-negociável per CLAUDE.md
- **Degradação graceful** (`guest-story-degradation.spec.ts`) — valida que o caminho crítico não depende de serviços auxiliares

### Cobertura por subsistema

| Subsistema | Unit | Contract | E2E |
|------------|------|----------|-----|
| Upload (guest) | ✅ 18 | ✅ 19 | ✅ 3+3+4 |
| Challenges/Missões | ✅ 12 | ✅ 19 | ✅ 4 |
| Drive Export | ✅ 28 | ✅ 5 | — |
| Wall/Telão | ✅ 20 | ✅ 10 | — |
| Auth/Sessions | ✅ 23 | ✅ 8 | — |
| Feed/Reações | ✅ 37 | ✅ 25 | — |
| Guestbook | ✅ 25 | ✅ 11 | — |
| Insights | ✅ 12 | — | — |
| Retention | ✅ 16 | — | — |

---

## Recomendações de Fix (por prioridade)

### Alta prioridade

1. **Fix Problema 3 (Fase 4):** adicionar seed do evento `casamento-joao-maria` no workflow do Lighthouse CI, ou substituir a URL por uma rota sem dependência de dados. Sem isso o workflow sempre falhará em CI.

### Média prioridade

2. **Fix Problema 1 (Fase 4):** atualizar `pnpm/action-setup@v2` → `@v4` em `.github/workflows/lighthouse-ci.yml` para consistência com o CI principal e compatibilidade com pnpm 10.
3. **Fix Problema 2 (Fase 4):** substituir `node-version: 20` por `node-version-file: .nvmrc` para garantir paridade de runtime com o restante do CI.

### Baixa prioridade (melhorias futuras)

4. **Cobertura de Wall em E2E:** nenhum spec E2E cobre o telão (`/wall/*`). Dado que o CLAUDE.md inclui o telão como superfície de primeira classe, vale adicionar ao menos um smoke test após H1.
5. **Cobertura de Drive/Export em E2E:** o fluxo de export para Google Drive é coberto apenas por unit tests; um smoke E2E validaria a integração OAuth end-to-end.
6. **Threshold de cobertura bloqueante:** o `vitest.config.ts` tem os thresholds comentados (`≥60% global, ≥90% upload`). Habilitá-los após atingir as metas transformaria o CI num gate real conforme CLAUDE.md.

---

## Contagem Final por Tipo

| Tipo | Arquivos | Testes | Framework |
|------|----------|--------|-----------|
| Unit Tests | 27 | 344 | Vitest (node) |
| Contract Tests | 15 | 169 | Vitest (node) |
| E2E Tests | 8 | 28 | Playwright |
| **Total** | **50** | **541** | |

*Fora do escopo desta validação: testes de isolamento (`vitest.isolamento.config.ts`) e testes de componente (`.test.tsx`).*
