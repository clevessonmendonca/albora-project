# Onda 0B-2b — Varredura de leitura do painel (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar os treze arquivos restantes do painel ao padrão de leitura único, e matar os skeletons artesanais.

**Architecture:** Não há decisão nova aqui. O hook e o padrão já existem e foram provados no consumidor mais difícil (`live-summary.tsx`, commit `8feab1e6`). Isto é aplicação de receita, arquivo a arquivo, preservando comportamento.

**Tech Stack:** TypeScript, React 19, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§8), commit `8868ba42`.
**Plano anterior:** `docs/superpowers/plans/2026-09-23-painel-onda-0b2-hook-de-leitura.md`.

## Global Constraints

- Preservar comportamento. Intervalo de polling, estados de erro, estados vazios, efeitos colaterais e textos ficam **iguais**. Esta onda não redesenha nada.
- Migrar **leitura**. Escrita (`PATCH`/`POST`) continua como está: a spec §8 pede otimismo com rollback só nos controles ao vivo, e isso é outra onda.
- Nenhum componente passa a retornar `null` por falta de dado. Onde já retorna, **continua** retornando nesta onda — consertar isso é trabalho das ondas de tela, com copy própria.
- Nenhum hex hardcodado; nenhuma string de domínio.
- Por padrão, **nenhum comentário**.
- `import React from "react"` só em arquivo com JSX.
- Commits em Conventional Commits com escopo.

## A receita

Referência canônica: `apps/web/features/admin/components/client/live-summary.tsx` (já migrado) e `apps/web/features/admin/hooks/use-admin-resource.ts`.

1. **Trocar o ciclo de leitura pelo hook.** Some o `useState` do dado, o `useState` do erro, o `useState` da última atualização, o `useCallback` com `fetch` e o `useEffect` com `setInterval`. Entra:

```ts
const { dado, erro, atualizadoEm, recarregar } = useAdminResource<T>(url, { intervaloMs, aoCarregar });
```

Renomeie na desestruturação para os nomes que o arquivo já usa, em vez de renomear o uso no JSX inteiro.

2. **Efeito colateral vira `aoCarregar`.** O que o `carregar` fazia depois de setar o dado (alimentar contagem, disparar aviso) passa para a opção `aoCarregar`, memoizada com `useCallback`.

3. **Skeleton artesanal vira `<Skeleton/>`** de `@albora/ui-web`. `rounded-token`/`rounded-superficie` → `variant` padrão (`rect`); `rounded-pilula` e barras finas → `variant="text"`; círculo de avatar → `variant="circle"`. Mantenha as classes de tamanho (`h-*`, `w-*`) e o layout de flex/grid ao redor.

4. **Não confunda indicador de estado com skeleton.** `animate-pulse` em ponto pequeno que sinaliza "ao vivo", "festa" ou "gravando" **fica como está**. Só blocos de placeholder de conteúdo mudam.

5. **Fetch que já vive num hook próprio com teste** (`use-host-export.ts`, `use-host-drive-export.ts`) **não se mexe**. Nesses arquivos, só o passo 3 se aplica — mudar a leitura quebraria testes que existem e que não são o alvo desta onda.

## Arquivos

Todos em `apps/web/features/admin/components/client/`. Nenhum tem teste próprio hoje; a verificação é central.

| Arquivo | Linhas |
|---|---|
| `event-insights.tsx` | 378 |
| `guest-funnel.tsx` | 345 |
| `review-queue.tsx` | 341 |
| `host-drive-export.tsx` | 311 |
| `guestbook-editor.tsx` | 309 |
| `host-album.tsx` | 253 |
| `event-team-panel.tsx` | 226 |
| `event-music.tsx` | 212 |
| `consent-versions.tsx` | 208 |
| `host-export.tsx` | 184 |
| `couple-follow-mode.tsx` | 168 |
| `comment-moderation.tsx` | 165 |
| `billing-history.tsx` | 159 |

## Verificação central

Como nenhum destes arquivos tem teste unitário, a rede de segurança é a suíte inteira mais três greps que provam que a dívida saiu:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm guards
```

```bash
grep -rn "useEffect" apps/web/features/admin/components/client/ | grep -c "fetch"
grep -rln "animate-pulse" apps/web/features/admin/components/client/
grep -rn "setInterval" apps/web/features/admin/components/client/
```

Esperado ao fim: nenhum `fetch` dentro de `useEffect` de leitura; `animate-pulse` só em `live-summary.tsx` e `guestbook-audio-field.tsx`, que são os dois pontos pulsantes de estado; `setInterval` só dentro do hook.

## Pronto quando

- Os treze arquivos leem pelo hook, salvo os dois cujo fetch vive em hook próprio testado.
- Nenhum skeleton artesanal de conteúdo sobra no painel.
- A suíte inteira continua verde e nenhum comportamento visível mudou.
