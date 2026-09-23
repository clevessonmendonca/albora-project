# Onda 2B — Fotos numa tela só (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acabar com a separação entre "ver as fotos" e "cuidar das fotos", que só existe no código.

**Architecture:** `/album` e `/moderation` são duas telas para o mesmo objeto. O anfitrião que vê uma foto ruim no álbum precisa sair, ir para moderação e achar a mesma foto de novo. A Onda 0B-3 já declarou Fotos como um destino só; agora as duas rotas viram **uma tela com três facetas** — Todas, Revisar, Destaques — e a Onda 2A já encheu a terceira.

A aba vive na **URL**, não em estado local: assim o selo de pendência da navegação pode linkar direto para Revisar, a aba sobrevive ao recarregar, e o anfitrião consegue mandar "olha isto aqui" para quem organiza junto.

**Tech Stack:** TypeScript, React 19, Next.js App Router, vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§5.1), commit `8868ba42`.

## Global Constraints

- Nenhuma funcionalidade some. Exportar, ocultar, liberar, destacar, moderar comentário: tudo continua alcançável.
- `/moderation` continua funcionando para quem tem link salvo — vira redirecionamento, não erro.
- Aba ativa marcada com `aria-current="page"` e por segunda pista além de cor.
- Todo vazio tem texto próprio e caminho de saída.
- Botão do `Button`/`buttonClasses`, leitura pelo `useAdminResource`, placeholder pelo `Skeleton`.
- `import React from "react"` em arquivo de `apps/web` com JSX.
- Por padrão, **nenhum comentário**.
- Commits em Conventional Commits. Nunca fazer merge sem pedido explícito.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/features/admin/lib/abas-fotos.ts` *(criar)* | As três abas e qual está ativa. Sem React. |
| `apps/web/features/admin/lib/abas-fotos.test.ts` *(criar)* | Testes. |
| `apps/web/app/admin/e/[eventId]/album/page.tsx` *(modificar)* | Monta as abas e o conteúdo da ativa. |
| `apps/web/app/admin/e/[eventId]/moderation/page.tsx` *(modificar)* | Redireciona para a aba Revisar. |
| `apps/web/features/admin/components/client/host-album.tsx` *(modificar)* | Aceita filtrar por destaque. |

---

### Task 1: As três facetas

**Interfaces:**
- Produces: `ABAS_FOTOS: readonly AbaFotos[]` e `abaAtiva(valor: string | undefined): AbaFotosId`, com ids `"todas" | "revisar" | "destaques"`.

Regras que os testes fixam: sem query, a aba é Todas; valor desconhecido cai em Todas em vez de quebrar; cada aba tem rótulo e sufixo de link; e o sufixo de Todas é vazio, para a URL limpa ser a tela padrão.

- [ ] **Steps: TDD normal**

```bash
git commit -m "feat(admin): as três facetas da tela de Fotos"
```

---

### Task 2: A tela

`/album` passa a ler `searchParams.aba` e renderizar:

- **Todas** — `HostAlbum` como hoje.
- **Revisar** — `ModerationPage` como hoje.
- **Destaques** — `HostAlbum` filtrado, com vazio próprio: "Nada destacado ainda", explicando que destacar marca as melhores e que elas ganham prioridade depois.

As abas usam `EditorialTabs` do design system, com `linkComponent` do Next — ele monta `href` por concatenação de `base` mais `suffix`, então `?aba=revisar` funciona sem componente novo.

- [ ] **Steps: implementar, typecheck, lint**

```bash
git commit -m "feat(admin): Fotos vira uma tela com três facetas"
```

---

### Task 3: A rota antiga não quebra

`/moderation` vira `redirect()` para `/album?aba=revisar`. Quem tem link salvo continua chegando onde queria.

- [ ] **Steps: implementar, conferir, commitar**

```bash
git commit -m "refactor(admin): moderação passa a ser faceta de Fotos"
```

---

## Pronto quando

- Uma tela só resolve ver, revisar e destacar.
- A aba está na URL e sobrevive ao recarregar.
- `/moderation` leva para a faceta certa em vez de dar erro.
- Nenhuma ação que existia sumiu.
- Suíte verde.
