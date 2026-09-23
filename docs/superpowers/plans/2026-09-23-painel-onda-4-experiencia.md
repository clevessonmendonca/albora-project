# Onda 4 — Experiência (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Juntar num lugar só tudo que o convidado vê e ouve, e dar ao anfitrião um jeito de olhar com os olhos dele.

**Architecture:** Esta onda **não** segue a receita de abas das Ondas 2B e 3, de propósito. Identidade e missões são editores longos, e a spec §8 manda manter fluxo longo em página própria — transformá-los em abas empilharia edição dentro de navegação. Experiência vira um **hub**: uma tela que reúne as peças, leva às que têm editor próprio e hospeda as que não precisam de um.

Duas peças estão no lugar errado hoje e mudam de casa aqui. **Música** vive dentro dos controles ao vivo, ao lado de pânico e gate — mas música é o que o convidado ouve, não operação de festa. **O link do telão** também. Os dois vêm para Experiência; o botão de pânico fica onde está, porque aquilo sim é controle de operação.

**Tech Stack:** TypeScript, React 19, Next.js App Router, vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§5.3), commit `8868ba42`.

## Global Constraints

- **Nenhuma funcionalidade some.** Música e telão mudam de lugar, não desaparecem.
- Editor longo continua em página própria. Hub leva; não edita no lugar de quem edita.
- "Ver como convidado" sempre visível no topo — é a razão de a tela existir.
- Cada peça diz o que faz numa linha, com verbo específico.
- Vazio com texto próprio: sem capa, sem missões, sem recado, cada um com seu caminho.
- Botão do `Button`/`buttonClasses`. Por padrão, **nenhum comentário**.
- Commits em Conventional Commits. Nunca fazer merge sem pedido explícito.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/features/admin/lib/navegacao.ts` *(modificar)* | Experiência passa a abrir o hub. |
| `apps/web/features/admin/lib/navegacao.test.ts` *(modificar)* | Cobre a rota nova. |
| `apps/web/app/admin/e/[eventId]/experiencia/page.tsx` *(criar)* | O hub. |
| `apps/web/features/admin/components/server/hub-experiencia.tsx` *(criar)* | As peças e seus estados. |
| `apps/web/features/admin/components/client/event-controls.tsx` *(modificar)* | Música e link do telão saem daqui. |

---

### Task 1: O destino passa a ser o hub

Em `navegacao.ts`, Experiência deixa de abrir `/identity` e passa a abrir `/experiencia`, absorvendo `/identity`, `/missions` e `/guestbook`. O teste de navegação já cobre "rota absorvida marca o destino"; acrescente o caso da rota nova.

- [ ] **Steps: ajustar teste, ver falhar, ajustar dados, ver passar, commitar**

```bash
git commit -m "feat(admin): Experiência passa a abrir o hub"
```

---

### Task 2: O hub

Uma tela com "Ver como convidado" no topo e uma seção por peça:

- **Identidade e capa** — leva a `/identity`. Diz se já tem capa e se a cor foi definida.
- **Missões** — leva a `/missions`. Diz quantas existem.
- **Recado** — leva a `/guestbook`.
- **Música** — hospeda `EventMusic` inline; é autocontido e não precisa de página.
- **Telão** — o link para abrir a parede, com o aviso de que é tela cheia no salão.

Os sinais de estado saem do contexto que a página já carrega: `coverImageKey`, `identityTokens`, `missoes`.

- [ ] **Steps: implementar, typecheck, lint, commitar**

```bash
git commit -m "feat(admin): hub de Experiência reúne o que o convidado vê"
```

---

### Task 3: Tirar o que não é controle de festa

Em `event-controls.tsx`, remover o `EventMusic` e o link do telão. O switch de pânico **fica**: pausar a parede no meio da festa é operação, não personalização.

- [ ] **Steps: implementar, suíte inteira, commitar**

```bash
git commit -m "refactor(admin): música e telão saem dos controles ao vivo"
```

---

## Pronto quando

- Existe uma tela que responde "o que o convidado vê e ouve".
- "Ver como convidado" abre a experiência real do convidado.
- Música tem casa própria, fora dos controles de operação.
- Nenhuma funcionalidade sumiu.
- Suíte verde.
