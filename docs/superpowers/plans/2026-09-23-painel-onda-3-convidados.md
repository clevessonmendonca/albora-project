# Onda 3 — Convidados (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar "como foi a participação" de "quem são estas pessoas", e parar de tratar Insights como um destino.

**Architecture:** Duas coisas estão no lugar errado. `GuestDisplayNames` — os cartões de pessoa, com nome e contagem de fotos — vive **enterrado no fim** da tela de funil, onde ninguém procura por gente. E `/insights` é um destino de primeira classe para números que só fazem sentido ao lado do funil. Esta onda vira as duas: Convidados ganha duas facetas — Participação e Pessoas — e Insights vira **seção** dentro de Participação, não aba.

Segue a receita da Onda 2B: a faceta vive na URL, a rota absorvida redireciona.

**Tech Stack:** TypeScript, React 19, Next.js App Router, vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§5.2), commit `8868ba42`.

## Global Constraints

- **Nenhuma métrica nova.** A spec §5.2 é explícita: só o que o backend já calcula.
- **PII**: a tela mostra primeiro nome e contagem. Nada de telefone ou e-mail além do que já existe. Nunca logar PII crua.
- `/insights` continua funcionando para quem tem link salvo — redireciona.
- Faceta ativa com `aria-current="page"` e segunda pista além de cor.
- Vazio com texto próprio e caminho de saída.
- Botão do `Button`/`buttonClasses`, leitura pelo `useAdminResource`.
- Por padrão, **nenhum comentário**.
- Commits em Conventional Commits. Nunca fazer merge sem pedido explícito.

## Pré-requisito que já foi pago

A spec §14.4 marcava como bloqueante reconciliar a meta de 40% antes desta onda. Feito no commit `c02aba21`: o painel lia participação contra a estimativa pré-evento mesmo com presença confirmada, e o núcleo tinha `denominadorDaParticipacao` sem nenhum chamador. Com 45 envios, 200 esperados e 100 presentes, o veredito pulava de "parar" para "tese validada" — duas faixas, na métrica que decide a H1.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/features/admin/lib/abas-convidados.ts` *(criar)* | As duas facetas. Sem React. |
| `apps/web/features/admin/lib/abas-convidados.test.ts` *(criar)* | Testes. |
| `apps/web/app/admin/e/[eventId]/guests/page.tsx` *(modificar)* | Monta as facetas. |
| `apps/web/app/admin/e/[eventId]/insights/page.tsx` *(modificar)* | Redireciona. |
| `apps/web/features/admin/components/client/guest-funnel.tsx` *(modificar)* | Aceita qual faceta renderizar. |

---

### Task 1: As duas facetas

**Interfaces:**
- Produces: `ABAS_CONVIDADOS` e `abaConvidadosAtiva(valor)`, ids `"participacao" | "pessoas"`.

Mesmas regras da 2B: sem query é a primeira; desconhecido cai na primeira; sufixo da primeira é vazio.

- [ ] **Steps: TDD normal**

```bash
git commit -m "feat(admin): as duas facetas da tela de Convidados"
```

---

### Task 2: A tela

`GuestFunnel` ganha `faceta?: "participacao" | "pessoas"`:

- **participacao** — os números e o funil, sem os cartões de pessoa no fim.
- **pessoas** — só os cartões, que hoje ficam enterrados.

A página renderiza `EventInsights` abaixo do funil quando a faceta é Participação. Insights deixa de ser destino e vira seção.

- [ ] **Steps: implementar, typecheck, lint, commitar**

```bash
git commit -m "feat(admin): Convidados separa participação de pessoas"
```

---

### Task 3: A rota antiga não quebra

`/insights` redireciona para `/guests`.

- [ ] **Steps: implementar, suíte, commitar**

```bash
git commit -m "refactor(admin): insights vira seção de Convidados"
```

---

## Pronto quando

- Quem procura gente encontra gente, sem rolar até o fim de uma tela de números.
- Insights aparece ao lado do funil, que é onde faz sentido.
- `/insights` leva a Convidados em vez de dar erro.
- Nenhuma métrica nova foi inventada.
- Suíte verde.
