# Cobertura medida — o número que faltava

**Data:** 2026-09-05
**Como:** `pnpm test:coverage` em worktree limpo de `stable`, agregado de `coverage/lcov.info`. 2556 testes, 303 arquivos, todos passando.

O spec de gates (`2026-09-04-gates-de-qualidade-design.md`) identificou corretamente que os thresholds estão comentados em `vitest.config.ts:65-66`, mas não conseguiu medir a cobertura atual — o worktree estava sem `node_modules`. Este documento fecha essa lacuna.

## Global

| Métrica | Atual | Meta MVP (CLAUDE.md) |
|---|---|---|
| Linhas | **35,7%** (14.535 / 40.702) | ≥60% |
| Funções | 69,5% | — |
| Branches | 83,0% | — |

Ligar o gate em 60% hoje reprovaria a suíte inteira. O piso medido é 35,7%.

## Pipeline de upload — meta ≥90%

| Arquivo | Linhas | |
|---|---|---|
| `packages/core/src/processar.ts` | 100,0% | 51/51 |
| `packages/core/src/fila.ts` | 100,0% | 7/7 |
| `apps/web/lib/application/use-cases/guest/confirm-upload.ts` | 99,4% | 166/167 |
| `packages/core/src/exif.ts` | 98,9% | 177/179 |
| `apps/web/app/api/uploads/confirm/route.ts` | 80,0% | 84/105 |
| `packages/core/src/chaves.ts` | 66,0% | 31/47 |
| `packages/core/src/upload.ts` | 50,0% | 2/4 |
| `apps/web/features/photo/hooks/use-upload.ts` | **14,9%** | 32/215 |
| `apps/web/app/api/uploads/presign/route.ts` | **0,0%** | 0/60 |
| `apps/web/app/api/uploads/detalhes/route.ts` | **0,0%** | 0/32 |
| `apps/web/app/api/uploads/route.ts` (DELETE) | **0,0%** | 0/26 |
| `apps/web/features/photo/hooks/use-event-queue.ts` | **0,0%** | 0/67 |

**Agregado: 57,3% (550/960).**

## Duas correções ao spec anterior

**1. `fila.ts` não está sem teste — mas também quase não tem o que testar.** O spec listou `packages/core/src/fila.ts` como "ausente". Ele está a 100%, só que com **7 linhas executáveis** num arquivo de 60: o resto é tipo e comentário.

**2. A fila offline de verdade está a 0%, e tem arquivo de teste.** `apps/web/features/photo/hooks/use-event-queue.ts` tem 67 linhas executáveis e **0% de cobertura** — apesar de existir `use-event-queue.test.ts` (1,6 KB). O mesmo vale para `use-upload.ts`: 215 linhas, 14,9%, com `use-upload.test.ts` de 1,5 KB.

Isso é pior que ausência de teste. Há arquivo de teste, o CI fica verde, e a impressão é de cobertura — mas o hook que sustenta a fila offline não é exercitado. O `CLAUDE.md` diz sobre exatamente essa peça: *"Fila offline + retry não são otimização. O sinal cai, o browser dorme, o convidado sai da tela. Sem fila persistente a foto some e a participação vai a zero."*

## O que estes números mudam no plano

- O degrau inicial do gate global é **35%**, não 60%. Ligar em 60 trava o time no dia seguinte.
- O pipeline de upload precisa de **~33 pontos** para chegar à meta, e a maior parte está concentrada em quatro arquivos: `use-event-queue.ts`, `use-upload.ts`, `presign/route.ts` e os dois outros handlers a 0%.
- Escrever teste para `use-event-queue.ts` é a maior entrega isolada de valor da frente: é a peça que o próprio `CLAUDE.md` aponta como decisiva para a H1.
