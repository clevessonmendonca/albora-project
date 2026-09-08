# 0016 — O E2E roda contra build de produção, nunca contra `next dev`

- **Status:** Accepted
- **Data:** 2026-09-07

## Contexto

O job `E2E smoke (convidado)` reprovava de forma intermitente e passava no re-run. Seis ocasiões seguidas em 2026-09-06, durante o merge dos PRs #34 a #39, sempre com a mesma assinatura:

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
waiting for navigation to "**/e/festa-demo/photo" until "domcontentloaded"
```

Não era regressão. O PR #38 reprovou duas vezes e o diff dele contra `stable` em `apps/web/app`, `apps/web/lib`, `apps/web/features` e `packages` era vazio — o código exercitado era idêntico ao de `stable`, que passou.

A causa é do arranjo do teste, não do produto. O `webServer` do Playwright subia `pnpm dev`, e **o Next em modo dev compila cada rota na primeira requisição**. O runner nunca tem cache de `.next` — o workflow guarda só o store do pnpm — então toda compilação no CI é fria. O `webServer.url` espera apenas `/` responder, de modo que, quando a suíte começa, nenhuma rota do convidado está compilada e **cada uma paga sua compilação dentro do orçamento de 30s do teste que a tocar primeiro**.

Isso prevê quais testes caem, e a previsão bate com o observado. Pela ordem real de execução (`playwright test --list`, `workers: 1`):

| Ordem | Teste | Compilação que absorve |
|---|---|---|
| 1º | `feed.spec.ts:112` | `/e/[slug]`, `/e/[slug]/cover`, `/e/[slug]/feed` |
| 8º | `guest-flow.spec.ts:96` | `/e/[slug]/photo`, e é o teste mais longo (10 passos) |

Medição em `stable`, com `.next` frio, via `tools/e2e/medir-compilacao.mjs` — tempo até a primeira resposta:

| Rota | `dev` ocioso | `dev` sob carga | `build` + `start` |
|---|---|---|---|
| `/e/festa-demo` | **31,7s** | **62,6s** | 0,13s |
| `/e/festa-demo/cover` | 9,6s | 18,4s | 0,02s |
| `/e/festa-demo/feed` | 4,2s | 18,4s | 0,02s |
| `/e/festa-demo/photo` | 9,3s | **33,2s** | 0,02s |

Com a máquina ociosa a entrada sozinha já estoura o limite de 30s. Sob carga, `photo` também. Servido por `next start` nenhuma rota passa de 0,13s, e o número **não se move** quando a CPU satura — é exatamente a variância que fazia o gate oscilar.

O efeito na suíte inteira, mesma base e mesmo banco: contra `pnpm dev`, 10 a 11 dos 16 testes reprovavam e a execução levava 8 a 9 minutos; contra `next start`, **14 passam, 2 pulam por condição própria, em 24,8s**.

O custo real disso não é o tempo de re-run. **É que um teste que reprova por carga treina o time a re-rodar sem ler o log.** Já custou uma conclusão errada nesta base: depois de cinco re-runs reflexos, uma reprovação genuína foi lida como quebra da moderação no fluxo do convidado. Da próxima vez o erro pode ser na direção oposta — uma falha real no caminho que decide a H1 recebendo re-run automático.

## Decisão

**O E2E do CI roda contra `next build` + `next start`. Nunca contra `next dev`.**

1. `.github/workflows/ci.yml` executa `pnpm build` antes de `pnpm test:e2e:full`, e passa `E2E_BUILT=1`.
2. `playwright.config.ts` serve com `pnpm --filter @albora/web start` quando `E2E_BUILT=1`, e com `pnpm dev` fora disso — local segue em dev, onde o cache do `.next` sobrevive entre rodadas e o build a cada execução não se paga.
3. **`playwright.config.ts` falha alto** se `CI` estiver definido sem `E2E_BUILT`. Sem isso a regressão volta em silêncio: o gate fica verde, mede o webpack de novo e ninguém percebe até a próxima semana de re-runs.
4. `tools/e2e/medir-compilacao.mjs` reproduz o cenário sob demanda, com `--carga=N` para saturar a CPU. Antes disto a falha só se reproduzia por acaso, num runner alheio.

## Como reproduzir

```bash
rm -rf apps/web/.next && pnpm dev &
node tools/e2e/medir-compilacao.mjs --carga=8   # reprova: rotas acima de 30s
```

Contra o build, o mesmo comando aprova:

```bash
pnpm build && pnpm --filter @albora/web start &
node tools/e2e/medir-compilacao.mjs --carga=8
```

O instrumento mede o custo de **servir** a rota, que é onde a compilação aparece; ele não valida estado de sessão, porque cover, feed e photo redirecionam sem sessão de convidado.

## Consequências

**A favor.** A variância sai da origem, não é abafada por timeout. O gate passa a medir o app em vez do compilador. E mede o artefato que vai a produção: bundle minificado, React em modo produção, sem overhead de HMR — o fluxo que o `CLAUDE.md` trata como decisivo para a H1 estava sendo verificado num artefato que nenhum convidado jamais recebe.

**Contra.** O job E2E ganha o tempo de um build (68s a 138s medidos localmente, com cache de dependências quente). O pipeline já paga build em outros dois lugares — `pnpm build` no job `build` e `next build` dentro de `bundle:budget:report`. Se o wall-clock incomodar, o caminho é compartilhar o `.next` entre jobs por artefato, com o custo de serializar `build` → `e2e`. Não vale antecipar essa complexidade antes de o tempo doer. Parte do custo se paga sozinha: a suíte cai de ~9 minutos para ~25 segundos.

**Descartadas.**

- *Aumentar o timeout.* Trocaria 30s por um número que também é chute, e manteria o teste medindo compilação. Um limite que acomoda 62s não reprova mais quase nada.
- *`test.slow()`.* Triplica o orçamento sem tirar o webpack do caminho. Foi aplicado em `feat/redesign-premium-ui` (commit `1530593`) como paliativo e fica redundante com esta decisão.
- *Aquecer as rotas em `globalSetup`, seguindo em dev.* Tira a compilação do orçamento do teste e é mais barato que build. Mas mantém o gate verificando um artefato que não é o de produção — economia errada para o teste que decide a H1.
- *Mexer em `fileParallelism`/workers.* `playwright.config.ts` já usa `workers: 1`; não havia paralelismo disputando com o `webServer`.

**Fora de escopo.** `retries: 1` permanece: existe para ruído genuíno de rede, e com a compilação fora do caminho volta a ser isso, não uma segunda chance para o webpack terminar. `feed.spec.ts:216` se auto-pula conforme o estado do seed e `feed.spec.ts:180` é `test.fixme` — ambos anteriores a esta decisão, ambos merecem tratamento próprio.
