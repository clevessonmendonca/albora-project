# Contrato de paralelismo — quem pode tocar o quê

**Data:** 2026-09-04
**Status:** vigente enquanto houver mais de um agente escrevendo no repo
**Branch:** `docs/roadmap-paralelo` (docs-only, ramificada de `stable` 95b6871)

## Por que este documento existe

O gargalo de rodar N agentes não é capacidade de escrever código — é **colisão**. Dois agentes em arquivos disjuntos escalam de verdade; dois no mesmo barrel, na mesma migration ou no mesmo workflow de CI produzem conflito que sobra para o mantenedor resolver na mão, depois de o trabalho já estar feito duas vezes.

Este contrato fixa a propriedade de cada superfície. Ele não é sugestão: se um agente precisa de algo fora da sua coluna, ele **pede**, não commita.

## Streams ativos (2026-09-04)

| Stream | Worktree / branch | Superfície que POSSUI |
|---|---|---|
| Landing page | (agente externo) | `apps/web/app/(marketing)/**`, `apps/web/public/landing/**` |
| Admin dash | (agente externo) | `apps/web/app/admin/**`, `apps/web/features/admin/**` |
| Redesign premium | `merganser` / `feat/redesign-premium-ui` | UI ampla — Onda 2 restante (fornecedor) |
| Console CEO | `ceo-backoffice` / `feat/ceo-backoffice` | `packages/core/src/authorization/**`, `packages/application/**`, `packages/db/src/{staff,audit}.ts`, `apps/web/app/console/**`, `apps/web/lib/console/**`, `tools/guards/camadas.mjs` |
| `salvage/*` (7 worktrees) | `.claude/worktrees/agent-*` | **Desconhecido** — ver §Riscos |

## Sub-projetos novos e suas superfícies

| Sub-projeto | POSSUI | NÃO TOCA |
|---|---|---|
| **A — Ida para produção** | `.github/workflows/deploy.yml` (arquivo NOVO), `docs/runbooks/**`, `wrangler.toml`, `.env.example`, `scripts/deploy*` | `.github/workflows/ci.yml` (é do B) |
| **B — Gates de CI** | `.github/workflows/ci.yml`, `vitest.config.*`, `vitest.workspace.*`, `tests/e2e/**`, `packages/*/vitest.config.*` | `deploy.yml` (é do A) |
| **C — Moderação real** | `packages/moderation/**` (pacote NOVO), handlers de moderação em `apps/web/lib/api/handlers/`, `apps/web/features/moderation/**` | `packages/application/**` (é do console) |
| **D — Curadoria do livro + push** | `packages/curation/**` (pacote NOVO), `apps/mobile/src/push*`, handlers de push | `packages/application/**` (é do console), `packages/ui-web/src/index.ts` |

## Recursos serializados — as três fontes reais de conflito

### 1. Numeração de migration

É serial e global. Duas branches que criam `0059_*.sql` produzem um vencedor e um perdedor silencioso.

| Faixa | Dono |
|---|---|
| 0059–0061 | Console CEO (**em uso**: 0059 já commitada) |
| 0062–0064 | C — Moderação |
| 0065–0069 | D — Curadoria + push |
| 0070+ | Livre, mediante aviso |

Nenhum outro stream cria migration sem reservar faixa aqui primeiro.

### 2. Barrel de `packages/ui-web/src/index.ts`

Todo primitivo novo toca esse arquivo. **Dono atual: Console CEO** (Onda A entrega `DataTable`, gráficos, `PageHeader`, `StatusBadge`, `EmptyState`).

Enquanto isso durar, nenhum outro stream adiciona export ali. Quem precisar de primitivo novo pede — e recebe, ou recebe um componente local no próprio feature até o barrel liberar.

### 3. Workflow de CI

`.github/workflows/ci.yml` tem **um dono: B**. A ida para produção usa arquivo separado (`deploy.yml`), sem interseção. Guards novos entram via B, não direto.

## Regras que valem para todo stream

- Nunca `git stash` puro: a pilha de stash é compartilhada entre worktrees e outra sessão pode dar pop no seu trabalho. Use commit WIP temporário.
- Nunca fazer merge sem pedido explícito do mantenedor.
- Node 22 (`source ~/.nvm/nvm.sh && nvm use 22`) no mesmo shell do `git commit`.
- Nenhuma task roda `next build` (trava e engasga o agente sem entregar nada).
- Símbolo e coluna novos em inglês (ADR 0014); prosa e comentário em português.
- MR de feature aponta para `stable`.

## Riscos abertos

**Sete worktrees `salvage/*` com superfície desconhecida.** `salvage/infra-ops`, `salvage/feed-core`, `salvage/missions`, `salvage/home-page`, `salvage/photo-album-music`, `salvage/guest-profile`, `salvage/cover-pairing-a11y`. Se algum estiver ativo, `salvage/infra-ops` colide de frente com o sub-projeto A, e `salvage/home-page` com a landing page. **Ação para o mantenedor:** confirmar quais estão vivos antes de despachar A.

**Pendências abertas sem dono, que colidem com o admin dash:** o primitivo `Switch` tem área de toque de 28px (abaixo do mínimo de 44px) e é usado em várias telas de admin; `qr-proof-sheet.tsx` tem string de domínio hardcodada que o guard `dominio` não pega. Ambas pertencem ao território do admin dash — devem ir para aquele agente, não virar stream.
