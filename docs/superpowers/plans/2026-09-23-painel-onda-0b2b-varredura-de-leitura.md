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

## Resultado da execução

Nove dos treze migraram ao hook: `billing-history`, `consent-versions`, `couple-follow-mode`, `event-insights`, `event-music`, `guest-funnel`, `guestbook-editor`, `host-album`, `review-queue`. Os treze trocaram o skeleton.

Quatro ficaram fora do hook, e o motivo é o mesmo em pares:

- **`comment-moderation.tsx` e `event-team-panel.tsx`** guardam o erro como **string compartilhada entre leitura e escrita** — a mesma variável recebe a mensagem de "não carregou" e a de "não salvou", e é zerada no começo das duas ações. O hook expõe `erro: boolean` e só o reseta ao resolver. Sincronizar os dois exigiria estado espelhado e mudaria a janela em que o aviso antigo some, o que é mudança visível. O `comment-moderation` ainda faz mutação local otimista depois do DELETE, que o hook não comporta porque só escreve `dado` em leitura bem-sucedida. Isso é caminho de escrita: resolve junto com o otimismo com rollback, na onda dos controles ao vivo.
- **`host-export.tsx` e `host-drive-export.tsx`** leem por hooks próprios que têm teste (`use-host-export.test.ts`, `use-host-drive-export.test.ts`), como a regra 5 previa. O `host-drive-export` ainda faz duas leituras em paralelo que alimentam uma máquina de estados por fase, com polling de 4s ligado só em certas fases — o `useAdminResource` é de uma URL e um intervalo, e forçá-lo ali mudaria comportamento.

Uma lacuna de API apareceu e **não** foi preenchida: o hook não tem opção de "só leia quando tal condição valer", que é o que o `event-team-panel` precisaria para não pedir `/members` a quem não pode gerenciar equipe. Não inventei a opção porque, mesmo com ela, o erro-string continuaria bloqueando a migração daquele arquivo — seria opção sem consumidor. Quando a onda de escrita destravar os dois, a opção entra junto, com consumidor de verdade.

Ajuste feito no hook durante a execução: `intervaloMs` e `aoCarregar` aceitam `undefined` explícito. O repo usa `exactOptionalPropertyTypes: true`, e `couple-follow-mode` alterna entre um modo com polling e outro sem.

## Pronto quando

- Os treze arquivos leem pelo hook, salvo os dois cujo fetch vive em hook próprio testado.
- Nenhum skeleton artesanal de conteúdo sobra no painel.
- A suíte inteira continua verde e nenhum comportamento visível mudou.
