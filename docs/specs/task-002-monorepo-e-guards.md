# Task 002 — Monorepo, esqueleto e guards de CI

> **Origem:** [`../architecture.md` §14](../architecture.md) · [`../engineering.md`](../engineering.md) · [`../../CLAUDE.md`](../../CLAUDE.md)
> **Depende de:** 001 aprovada.

## Objetivo

Ter um repositório onde `pnpm dev` sobe, `pnpm test` roda, e os **cinco guards bloqueiam de propósito** — provados com fixtures que violam de mentira.

## Escopo

**Entra**

```
apps/web/          Next.js App Router — landing, /e/[slug], telão, admin
apps/mobile/       Expo — vazio até a 017, mas o lugar existe

packages/tokens/   resolvedor identity_tokens → valores
packages/packs/    vocabulário, missões, templates
packages/core/     tipos, cliente de API, validação, contrato da fila, LUTs
packages/db/       schema + migrations

packages/ui-web/     primitivas web
packages/ui-native/  primitivas React Native — vazio até a 017
```

**A estrutura nasce inteira, mesmo com dois pacotes vazios.** É exigência do [ADR 0010](../adr/0010-expo-para-o-app-do-convidado.md): o app do convidado será Expo, e a única coisa que impede isso de custar o dobro é a lógica estar em `packages/core` desde o início, e não dentro de componentes da web.

Criar a separação depois significa extrair domínio de dentro de telas já escritas — o refactor caro que essa antecipação existe para evitar. Um diretório vazio custa nada hoje e economiza semanas depois.

**A regra que faz `packages/core` valer:** se um pedaço de lógica não desenha pixel, ele não mora em componente. Tipo, validação, chamada de API, matemática de LUT, contrato de fila — tudo em `core`. Os dois `ui-*` só desenham.

Mais: `.gitlab-ci.yml` (ou Actions, ver risco), pre-push com lint + typecheck + build, Conventional Commits.

**Não entra**

- Qualquer tela, qualquer rota de produto
- Schema de verdade — é a 003
- Deploy em ambiente — o `wrangler` da 001 basta por ora

## Os cinco guards

Cada um com **auto-teste que usa fixture violadora e precisa falhar**. Guard sem auto-teste pode parar de verificar e continuar verde — que é exatamente como ele parece quando funciona.

| Guard | Falha quando |
|---|---|
| `isolamento` | Um evento lê dado de outro. Job dedicado e visível (entra de fato na 003) |
| `tokens` | Hex literal ou classe de cor arbitrária em componente. Roda em **`ui-web` e `ui-native`**, com a mesma regra |
| `dominio` | Regra de negócio, validação ou chamada de API dentro de um `ui-*`. É o guard que mantém o app Expo barato |
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
