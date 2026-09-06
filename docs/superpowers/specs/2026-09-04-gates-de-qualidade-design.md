# Gates de qualidade — ligar cobertura e fechar a lacuna dos guards

**Data:** 2026-09-04
**Sub-projeto:** B — Gates de CI (ver `docs/superpowers/specs/2026-09-04-paralelismo-contrato.md`)
**Branch:** `docs/roadmap-paralelo`

## 1. O problema

O `CLAUDE.md` do projeto define, na tabela de gates por fase, que o MVP exige cobertura **≥60% global** e **≥90% no pipeline de upload**, mais smoke E2E do fluxo do convidado e teste de carga antes do primeiro evento. Na mesma seção, uma regra é declarada não negociável: **"Rebaixar um gate para deixar o CI verde é violação não negociável."**

Uma varredura recente apontou que a cobertura hoje é *report-only* no CI — ou seja, o projeto estaria violando a própria regra que se deu. Este documento primeiro confirma ou refuta essa afirmação lendo o CI e as configs, e só então propõe um caminho para fechar a lacuna sem travar o time da noite para o dia.

A conclusão adiantada: **a afirmação é verdadeira**, com evidência direta nos dois lugares onde a decisão foi tomada (não é inferência — o próprio código documenta a escolha). Mas a varredura não é a história completa: junto com a cobertura, este documento encontrou uma segunda lacuna do mesmo tipo — um guard que existe, é referenciado por um ADR, mas não roda no CI — e ela está descrita na seção 6.

## 2. Estado real hoje (com evidência)

### 2.1 Cobertura é report-only — confirmado

`vitest.config.ts:65-66`:

```
// Gates MVP (CLAUDE.md): ≥60% global, ≥90% upload pipeline. Thresholds comentados até a suíte alcançar — o job de CI só reporta.
// thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
```

O bloco `thresholds` está comentado. O provider é `v8`, os reporters são `text-summary` e `lcov` (`vitest.config.ts:48-51`) — nenhum deles faz o processo sair com código de erro por si só; quem faria isso é exatamente o bloco desligado.

`.github/workflows/ci.yml:91-100` confirma a intenção do lado do CI:

```yaml
      # Inclui o auto-teste de cada guard: guard sem auto-teste pode parar de
      # verificar e continuar verde.
      # Cobertura report-only (sem threshold bloqueante): packages/**/src,
      # apps/web/lib, apps/web/features e apps/web/app/api — ver vitest.config.ts.
      - run: pnpm test:coverage
      # Orçamento de First Load JS nas rotas do convidado (gate pós-H1, CLAUDE.md).
      # Report-only até calibrarmos os limites com builds estáveis no CI.
      - name: Orçamento de bundle (convidado, report-only)
        run: pnpm bundle:budget:report
        continue-on-error: true
```

`pnpm test:coverage` (`vitest run --coverage`) roda dentro do job `verificar` (`ci.yml:78-107`) sem `continue-on-error`, mas isso só garante que o *comando* precisa terminar (os testes precisam passar); não impõe piso de cobertura, porque não há threshold configurado para falhar. O resultado vira artefato (`ci.yml:101-107`, `actions/upload-artifact`), não critério de aprovação. `pnpm bundle:budget:report` (orçamento de bundle, gate de Pós-H1) tem `continue-on-error: true` explícito — esse é report-only por design e por fase, não é o alvo deste documento (ver §7).

Não foi possível medir o valor atual de cobertura nesta sessão: o `node_modules` do worktree está com a instalação incompleta para o Node 22 (`.nvmrc:1` pede `22`; o `vitest` do `node_modules/.bin` não resolve sob Node 22, e o ambiente de shell por padrão cai em Node 16, que o `pnpm` 10.32.0 recusa rodar). Como a tarefa também veda rodar build, não insisti em consertar a instalação — isso fica registrado como pré-requisito do passo 1 da estratégia (§4), não como algo que este documento resolve.

### 2.2 Guards — o que já é bloqueante

`.github/workflows/ci.yml:17-41`, job `guards`, roda como passos separados (falha de qualquer um derruba o job, e o job é check obrigatório de PR):

```yaml
  guards:
    ...
      - name: isolamento
        run: node tools/guards/isolamento.mjs
      - name: tokens
        run: node tools/guards/tokens.mjs
      - name: dominio
        run: node tools/guards/dominio.mjs
      - name: packs
        run: node tools/guards/packs.mjs
      - name: sessao
        run: node tools/guards/sessao.mjs
      - name: features
        run: node tools/guards/features.mjs
      - name: api-routes
        run: node tools/guards/api-routes.mjs
```

Isso cobre exatamente os dois guards que o `CLAUDE.md` marca como não escalonáveis por fase (isolamento entre eventos e tokens de identidade visual), mais quatro guards de arquitetura (`dominio`, `packs`, `sessao`, `features`, `api-routes`). Todos bloqueantes hoje.

Além disso, `isolamento` roda uma segunda vez, em profundidade, no job dedicado `isolamento` (`ci.yml:48-76`) contra Postgres real (`test:isolamento` → `vitest run --config vitest.isolamento.config.ts`), com o comentário explícito: *"Contra banco real, nunca mock: testar isolamento contra mock prova que o mock está isolado."* Esse job também é bloqueante (sem `continue-on-error`).

### 2.3 O guard que existe e não está no CI

`tools/guards/todos.mjs:1-20` agrega **oito** guards, não sete:

```js
import { verificar as isolamento } from "./isolamento.mjs";
import { verificar as tokens } from "./tokens.mjs";
import { verificar as dominio } from "./dominio.mjs";
import { verificar as packs } from "./packs.mjs";
import { verificar as sessao } from "./sessao.mjs";
import { verificar as features } from "./features.mjs";
import { verificar as apiRoutes } from "./api-routes.mjs";
import { verificar as nomenclatura } from "./nomenclatura.mjs";
```

`nomenclatura.mjs` existe (`tools/guards/nomenclatura.mjs`, referenciando **ADR 0014** — `docs/adr/0014-convencao-pt-en-na-base-de-codigo.md`), tem `cli()` de linha de comando própria (mesmo padrão dos outros sete: `tools/guards/nomenclatura.mjs:85`) e um auto-teste em `tools/guards/guards.test.mjs:11,34`. Mas ele **não aparece** na lista de passos do job `guards` em `ci.yml:28-41`. Hoje ele só roda:

- localmente, via `pnpm guards` (`package.json:16`, que executa `todos.mjs`);
- localmente, no hook `pre-push` (`.husky/pre-push:10`: `node tools/guards/todos.mjs`), que é contornável com `git push --no-verify` e nunca roda para quem esquece de instalar o hook.

Ou seja: um guard de convenção de nomenclatura, com o mesmo mecanismo de reprovação dos outros sete, está tecnicamente "desligado" no único lugar que ninguém consegue pular. Isso é tratado na seção 6.

### 2.4 E2E smoke — já bloqueante

`ci.yml:109-155`, job `e2e-smoke`, roda `pnpm test:e2e:full` (com `E2E_FULL=1`, `ci.yml:146-148`) sem `continue-on-error`. Detalhado na seção 5.

### 2.5 Teste de carga — não está no CI, e está correto que não esteja

`tools/carga/executar.mjs` e o script `pnpm carga` existem, mas nenhum job do `ci.yml` os invoca. O gate do `CLAUDE.md` para isso é **"antes do 1º evento"**, um evento único no calendário, não uma verificação contínua por PR — não é uma lacuna do CI, é a natureza do gate. Ver §7.

## 3. O que é "o pipeline de upload"

Definição operacional: o conjunto de arquivos que participa do caminho presign → PUT direto no object storage → confirm, incluindo a derivação de chave no servidor, remoção de EXIF, fila offline e o hook que orquestra o envio no cliente. Todos estão dentro do escopo `include` de `vitest.config.ts:52-57` (`packages/**/src/**/*.ts`, `apps/web/lib/**/*.ts`, `apps/web/features/**/*.{ts,tsx}`, `apps/web/app/api/**/*.ts`), então a cobertura desse conjunto já é medida hoje (só não é exigida).

| Arquivo | Papel | Teste hoje |
|---|---|---|
| `packages/core/src/upload.ts` | Tipos de presign/confirm + `presignExpirou`, `VALIDADE_PRESIGN_SEGUNDOS` | **ausente** |
| `packages/core/src/chaves.ts` | `derivarChaveMidia` (exportada como `deriveMediaKey`) — derivação de chave `events/{event_id}/...` no servidor | `chaves.test.ts` |
| `packages/core/src/exif.ts` | Remoção de EXIF/GPS no cliente | `exif.test.ts` |
| `packages/core/src/fila.ts` | Fila offline + retry | **ausente** |
| `packages/core/src/processar.ts` | Processamento client-side (LUT, redimensionamento) antes do upload | `processar.test.ts` |
| `apps/web/app/api/uploads/presign/route.ts` | `POST` — valida declaração, checa cota de vídeo, chama `deriveMediaKey`, assina PUT (`assinarPut`), registra funil | **ausente** |
| `apps/web/app/api/uploads/confirm/route.ts` | `POST` — confirma upload, idempotente por `uploadId` | `route.test.ts` |
| `apps/web/app/api/uploads/detalhes/route.ts` | Detalhes pós-confirm (legenda, momento de captura) | **ausente** |
| `apps/web/app/api/uploads/route.ts` | `DELETE` — remoção da própria mídia, via `withEvent` + `removerUploadProprio` (RLS) | **ausente** |
| `apps/web/lib/application/use-cases/guest/confirm-upload.ts` | Caso de uso de confirmação (268 linhas) | `confirm-upload.test.ts` |
| `apps/web/lib/infrastructure/api/validators/upload-schemas.ts` | Validação de payload de presign/confirm | `upload-schemas.test.ts` + `.contract.test.ts` |
| `apps/web/features/photo/hooks/use-upload.ts` | Hook cliente que orquestra presign → PUT → confirm | `use-upload.test.ts` |
| `apps/web/features/photo/hooks/use-event-queue.ts` | Fila de upload por evento no cliente (o que sobrevive a sinal caindo/tela dormindo) | `use-event-queue.test.ts` |
| `apps/web/features/photo/services/camera-service.ts` | Captura + acionamento da remoção de EXIF antes do upload | `camera-service.test.ts` |

Onze dos catorze arquivos já têm teste ao lado (`.test.ts`/`.test.tsx`). Cinco não têm: `upload.ts`, `fila.ts`, `presign/route.ts`, `detalhes/route.ts` e `uploads/route.ts` (o `DELETE`). Note que `upload.ts` é pequeno (35 linhas, um `export function` real — `presignExpirou`) e `fila.ts` tem 60 linhas; os outros três são rotas de API com lógica de negócio real (validação de cota de vídeo, assinatura de PUT, remoção com verificação de posse via RLS) — não são wrappers triviais, e são exatamente os candidatos a reprovar um piso de 90% se o gate for ligado sem escrevê-los primeiro.

## 4. Estratégia para ligar o gate de cobertura

O `CLAUDE.md` proíbe uma saída fácil: **exclusão de arquivo da cobertura para bater a meta não é válida** — a única exclusão permitida é por linha, com motivo, revisada na MR. Isso descarta silenciar `upload.ts`/`fila.ts`/as três rotas via `coverage.exclude` só para o número fechar.

**Recomendação: (b) — ligar o gate no valor medido hoje, subir em degraus com data, tratando o pipeline de upload como faixa separada e mais rígida desde o primeiro degrau.**

Por quê, e não (a) escrever tudo antes de ligar:

- (a) mede o esforço de teste sem prazo em paralelo a um CI que continua sem rede de segurança — exatamente o intervalo em que uma regressão de cobertura passa despercebida, que é o problema que o gate existe para evitar. Não há disciplina de "prazo" nesse plano: sem o gate ligado, nada impede que a lacuna cresça enquanto se escreve teste para ela.
- (b) faz o CI passar a falhar imediatamente quando a cobertura *cai* abaixo do que já existe hoje — o comportamento perigoso (silêncio regressivo) para no dia 1, mesmo que o alvo final ainda não esteja batido.

Passos concretos:

1. **Medir agora.** Rodar `pnpm test:coverage` localmente (ou em CI, num job temporário sem impacto no merge) e ler o `text-summary` — linhas, funções, branches, statements, global e por diretório do `include`. Esta sessão não conseguiu produzir esse número (§2.1); é o primeiro passo de quem executar este spec, antes de tocar em `vitest.config.ts`.
2. **Descomentar o bloco de `thresholds`** em `vitest.config.ts:66`, mas com os quatro valores no piso medido no passo 1 (arredondado para baixo ao inteiro mais próximo), não em 60. Isso já torna a régua bloqueante — nenhuma MR pode reduzir a cobertura global abaixo do que existe hoje.
3. **Adicionar um segundo bloco de threshold com `include` restrito ao pipeline de upload** (a lista da seção 3), com o piso de 90% do `CLAUDE.md`. O Vitest 3 suporta `coverage.thresholds` por padrão de arquivo (`perFile` ou entradas nomeadas); a configuração exata deve ser validada contra a versão instalada (`vitest@^3.0.0`, `package.json`) no momento da implementação — mas o mecanismo (glob → piso próprio) existe na ferramenta e não exige pacote novo.
4. **Escrever os cinco testes ausentes da seção 3 antes ou junto do passo 3** — são os arquivos que, sem teste, arrastam a média do pipeline de upload para baixo do piso deles seria menor que 90% hoje; adicioná-los é o que permite começar a faixa de upload já perto de 90%, não muito abaixo.
5. **Degraus com data para o resto do código, até 60% global**: se o valor medido no passo 1 for menor que 60%, registrar no PR que liga o gate um comentário com a data do próximo degrau (por exemplo, +5 pontos percentuais por sprint) e abrir o item correspondente no board — não como promessa em markdown solto, como o próprio `CLAUDE.md` pede para tudo que é "retenção por job, não por promessa" em outro contexto: aqui o equivalente é "gate por degrau versionado, não por confiança".

Nenhum passo acima usa `coverage.exclude` para reduzir a superfície além do que já está excluído hoje (`**/*.test.ts`, `node_modules`, `dist`, `packages/db/**` — este último por ser código gerado/migração, não por conveniência de meta).

## 5. Smoke E2E do convidado

O smoke já existe e já cobre a cadeia pedida. Evidência em `e2e/guest-flow.spec.ts:96-153`, teste `"fluxo completo: QR → consentimento → nome → cover → foto → upload confirmado"`:

1. **QR** — `page.goto('/e/${SLUG}')` simula a chegada pela URL que o QR codifica (linha 104).
2. **Consentimento** — checkbox pré-marcado é verificado visível e marcado antes de prosseguir (linha 108).
3. **Nome + captura da sessão** — preenche nome, clica "fotografar", aguarda redirecionamento para `/cover` (linhas 111-115).
4. **Cover → captura** — clica "Enviar foto", aguarda `/photo`, localiza o `<input type="file" accept="image/*" capture="environment">` (linhas 124-130).
5. **Upload** — injeta um JPEG mínimo válido de verdade (decodificável por `createImageBitmap`, comentário em `guest-flow.spec.ts:4-10` explica por que não pode ser só magic bytes), aguarda o editor, clica "Enviar", e a asserção captura a requisição real de `**/api/uploads/presign` (linhas 141-147).
6. **Confirmação** — aguarda a requisição de `**/api/uploads/confirm` (linha 153), fechando o ciclo presign → PUT → confirm.

**Sem depender de serviço externo:** o teste chama `mockCaminhoUpload(page)` (linha 101, definida em `guest-flow.spec.ts:22-48`) antes de iniciar, que intercepta via `page.route()`:

- `**/api/uploads/presign` → responde com `chave`, `full`/`thumb` apontando para `https://mock-r2.example/put/...` (não R2 real);
- `https://mock-r2.example/**` → responde 200 vazio, simulando o PUT no storage;
- `**/api/uploads/confirm` → responde com o `uploadId` ecoado e `estado: "visivel"`.

Isso resolve diretamente a tensão "upload real vai para object storage, mas E2E de CI não deveria depender de credencial de storage real": a URL assinada nunca é gerada de verdade, e o navegador nunca faz PUT contra R2/S3 — ele faz PUT contra um domínio inexistente interceptado localmente pelo Playwright. O resto do fluxo (rota, sessão de convidado, banco) é real.

**Como roda no CI sem serviço externo:** `ci.yml:109-155`, job `e2e-smoke` — sobe um Postgres de serviço (efêmero, do próprio runner), roda `pnpm db:semear` (popula o evento `festa-demo` usado pelo teste, `SLUG = "festa-demo"` em `guest-flow.spec.ts:4`) e executa com `E2E_FULL=1` (`pnpm test:e2e:full`). Variáveis de ambiente do passo (`ci.yml:126-133`) são dummies explícitos (`SESSION_SECRET: ci-e2e-smoke-not-a-real-secret-32ch`, `R2_ACCESS_KEY_ID: ci` etc.) — suficientes para o dev server subir, nunca credenciais reais. `playwright.config.ts:23-30` sobe o próprio `pnpm dev` como `webServer` quando não há `PLAYWRIGHT_SKIP_SERVER`.

Sem `E2E_FULL=1`, os testes de fluxo completo são pulados (`test.skip(!E2E_FULL, ...)`, presente em `smoke.spec.ts` e em todos os testes de `guest-flow.spec.ts`) e só os smokes leves (landing, admin sign-in, telão sem parear, redirecionamentos de alias PT→EN) rodam — mas o job de CI sempre passa `E2E_FULL=1`, então o smoke pesado sempre executa em CI. Não há lacuna aqui: o gate MVP do `CLAUDE.md` já está implementado e já é bloqueante.

## 6. Guards

**Bloqueantes hoje** (job `guards` em `ci.yml:17-41`, mais o job `isolamento` em profundidade contra Postgres real): `isolamento`, `tokens`, `dominio`, `packs`, `sessao`, `features`, `api-routes`. Cobre as duas regras que o `CLAUDE.md` marca como não escalonáveis por fase.

**Deveria ser bloqueante e não é:** `nomenclatura` (`tools/guards/nomenclatura.mjs`). Ele:

- existe com o mesmo contrato dos outros sete (`cli()` de entrada, `tools/guards/nomenclatura.mjs:85`);
- é referenciado por ADR (0014 — convenção PT/EN na base de código);
- tem auto-teste em `tools/guards/guards.test.mjs`, que roda dentro de `pnpm test:coverage` no job `verificar` (confirmando que o *guard em si* está correto);
- mas o *comando* `node tools/guards/nomenclatura.mjs` nunca é invocado por nenhum job do `ci.yml`.

Hoje ele só é aplicado localmente (`pnpm guards`, hook `pre-push`), ambos contornáveis (`--no-verify`, hook nunca instalado, máquina sem Husky configurado). A correção é mecânica — adicionar um passo `nomenclatura: run: node tools/guards/nomenclatura.mjs` ao job `guards` de `ci.yml`, no mesmo padrão dos sete existentes — mas fica registrada aqui como achado, não implementada neste documento (a tarefa deste spec é desenhar, não editar `ci.yml`).

**Ponto de coordenação:** um guard novo, `tools/guards/camadas.mjs`, está reservado para o stream Console CEO (`docs/superpowers/specs/2026-09-04-paralelismo-contrato.md`, linha da tabela de streams ativos). Ele ainda não existe neste worktree. Quando for entregue, o CI precisa passar a invocá-lo no mesmo job `guards`, no mesmo padrão dos oito guards existentes (sete ativos + `nomenclatura` depois de corrigido) — isso não é trabalho deste sub-projeto (B — Gates de CI não cria o guard), mas é dependência dele: o job `guards` é o arquivo que os dois sub-projetos tocam, e quem mergear por último decide a ordem dos `steps`.

## 7. Fora de escopo

- **Cobertura ≥80% (Pós-H1) e ≥90%/E2E profundo/LCP-INP (Escala).** A tabela do `CLAUDE.md` escalona por fase; o projeto está em MVP, e subir esses números agora antecipa gate de fase futura sem o produto ter chegado lá.
- **Orçamento de bundle (First Load JS) bloqueante.** Já é report-only por decisão registrada em código (`ci.yml:96-100`, `continue-on-error: true`, comentário "gate pós-H1... até calibrarmos os limites com builds estáveis no CI"). Ligar esse gate é tarefa de quando o produto entrar em Pós-H1, não deste documento.
- **Teste de carga contínuo em CI.** O gate do `CLAUDE.md` é "antes do 1º evento", um marco único, não uma verificação por PR. `tools/carga/` já existe e roda sob demanda (`pnpm carga`, `pnpm carga:smoke`); integrá-lo a um pipeline de release é do sub-projeto A (ida para produção), não deste.
- **`camadas.mjs`.** Ver §6 — é do stream Console CEO; este documento só registra o ponto de coordenação.
- **`.github/workflows/deploy.yml`.** Pertence ao sub-projeto A; não tocado nem mencionado além desta linha.
- **Migration nova.** Nenhuma proposta aqui cria ou altera schema.

## 8. Riscos

- **Medir o piso errado.** Se o valor coletado no passo 1 da §4 for medido localmente com uma versão de dependências diferente da que o CI usa (`pnpm install --frozen-lockfile`, `ci.yml:88`), o threshold pode ficar acima do que o CI realmente produz e quebrar o primeiro PR depois de mergeado — a mitigação é medir dentro de um job de CI (ainda que temporário/manual) antes de fixar o número em `vitest.config.ts`.
- **Faixa de upload com threshold múltiplo no Vitest 3.** A sintaxe exata de `coverage.thresholds` por glob precisa ser confirmada contra a versão instalada (`vitest@^3.0.0` é um range, não um pin) antes da implementação — comportamento de thresholds por padrão de arquivo mudou entre versões maiores do Vitest historicamente.
- **`nomenclatura` reprovar arquivos existentes ao entrar no CI.** Um guard que só rodava localmente pode ter divergido do estado real do repo se nem todo mundo instala o hook `pre-push`. Antes de adicionar o passo ao job `guards`, rodar `node tools/guards/nomenclatura.mjs` contra `main`/`stable` para confirmar que passa hoje — senão o primeiro efeito de "corrigir a lacuna" é quebrar o CI de todo mundo por um débito pré-existente, não pego neste levantamento porque exigiria rodar o guard (fora do escopo de "não rodar build" desta sessão).
- **Cinco arquivos sem teste na faixa de upload atrasarem a virada do gate.** Se `presign/route.ts`, `uploads/route.ts` (DELETE) ou `detalhes/route.ts` exigirem mock de infraestrutura (RLS via `withEvent`, `assinarPut` contra R2) mais elaborado que os once arquivos já testados, o passo 4 da §4 pode levar mais de um sprint — a mitigação é não travar o passo 2 (threshold global no piso medido) esperando o passo 4 terminar; são independentes.

## 9. Critério de sucesso

- `vitest.config.ts` tem um bloco `thresholds` ativo (não comentado) com os quatro valores no piso medido, e a MR que o introduz não reduz a cobertura de nenhum arquivo do `include` atual.
- Existe um segundo bloco de threshold (ou configuração equivalente) restrito aos catorze arquivos da tabela da §3, com piso de 90%, e os cinco arquivos hoje sem teste (`upload.ts`, `fila.ts`, `presign/route.ts`, `detalhes/route.ts`, `uploads/route.ts`) têm `.test.ts` ao lado.
- O job `guards` em `ci.yml` invoca oito guards, não sete — `nomenclatura` incluído — e uma execução contra o `HEAD` de `main`/`stable` no momento da mudança passa limpa (sem débito pré-existente descoberto na hora errada).
- Nenhuma mudança usa `coverage.exclude` para remover arquivo da medição além do que já está excluído por motivo estrutural (`packages/db/**`, gerado/migração).
- O smoke E2E da §5 continua bloqueante e sem dependência de credencial real de object storage — nenhuma mudança deste documento deveria alterar esse comportamento; ele já está correto.
