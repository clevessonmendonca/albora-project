# Task 002 — Monorepo, esqueleto e guards de CI

> **Origem:** [`../architecture.md` §14](../architecture.md) · [`../engineering.md`](../engineering.md) · [`../../CLAUDE.md`](../../CLAUDE.md)
> **Depende de:** 001 aprovada.

## Objetivo

Ter um repositório onde `pnpm dev` sobe, `pnpm test` roda, e os **quatro guards bloqueiam de propósito** — provados com fixtures que violam de mentira.

## Escopo

**Entra**

```
apps/web/          Next.js App Router
packages/ui/       tokens + primitivas
packages/tokens/   resolvedor identity_tokens → valores
packages/packs/    vocabulário, missões, templates
packages/db/       schema + migrations
```

Mais: `.gitlab-ci.yml` (ou Actions, ver risco), pre-push com lint + typecheck + build, Conventional Commits.

**Não entra**

- Qualquer tela, qualquer rota de produto
- Schema de verdade — é a 003
- Deploy em ambiente — o `wrangler` da 001 basta por ora

## Os quatro guards

Cada um com **auto-teste que usa fixture violadora e precisa falhar**. Guard sem auto-teste pode parar de verificar e continuar verde — que é exatamente como ele parece quando funciona.

| Guard | Falha quando |
|---|---|
| `isolamento` | Um evento lê dado de outro. Job dedicado e visível (entra de fato na 003) |
| `tokens` | Hex literal ou classe de cor arbitrária em componente |
| `packs` | `core` importa de `pack` |
| `sessão` | Token aparece em querystring ou em log |

## Contrato

- `packages/tokens` exporta **um** resolvedor, com cadeia `evento → pack → marca`. Nenhum renderizador implementa o seu ([ADR 0003](../adr/0003-runtime-token-resolution.md)).
- Domínio em código puro; rota é camada fina de transporte ([`../engineering.md` §1](../engineering.md)) — é o que mantém a escolha de plataforma reversível.

## Como se verifica

1. `pnpm install && pnpm dev` sobe sem aviso
2. Cada guard rodado contra sua fixture violadora **sai diferente de zero**
3. Cada guard rodado contra o código real sai zero
4. `git push` com lint quebrado é recusado pelo hook
5. Commit fora do padrão Conventional é recusado

## Riscos

| Risco | Plano |
|---|---|
| CI é GitLab na SEA, mas o repo está no GitHub | Decidir agora e escrever no `CLAUDE.md`. Um só, não os dois |
| Guard de tokens dá falso positivo em canvas/SVG | Lista de exceções **por arquivo, com motivo**, dentro do guard — nunca afrouxar a regra |
