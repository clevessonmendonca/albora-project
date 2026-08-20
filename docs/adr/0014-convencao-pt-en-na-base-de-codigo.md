# 0014 — Convenção PT/EN na base de código

- **Status:** Accepted
- **Data:** 2026-08-19

## Contexto

O monorepo nasceu com nomes de domínio em português (`comEvento`, `listarFeed`, `criarSessao`). A refatoração de rotas e handlers (2026-08) tornou **inglês o canônico na borda HTTP** — `/api/wall`, `/cover`, redirects 308 de `/parede` → `/wall`. Os barrels de `packages/core` e `packages/db` ganharam aliases EN (`withEvent`, `listFeed`) marcados como preferidos para código novo, enquanto as implementações internas ainda usam os nomes PT originais.

Sem regra explícita, a base ficou com **três camadas sobrepostas**: rotas EN, barrels com alias EN *e* alias PT reverso (`drenar`, `Fila`, `padroesDoEvento`), e blocos “compatibilidade legado” em `@albora/tokens` que ninguém importava. Isso confunde qual nome é canônico, infla diffs no barrel e reabre a porta para regressão a cada MR.

Copy de produto, vocabulário de pack e comentários em português **não entram nesta decisão** — são o idioma do usuário, não do código.

## Decisão

### 1. Borda HTTP e filesystem (`apps/web/app/`)

- **Canônico:** inglês (`/api/wall`, `/cover`, `features/cover/`).
- **Português:** só redirect 308 (`next.config.ts`) ou reexport fino de rota/handler (`export { GET } from "../wall/route"`).
- Nunca duplicar lógica numa rota PT.

### 2. Pacotes compartilhados (`core`, `db`, `tokens`)

- **Código novo** importa **aliases EN do barrel** quando existirem (`withEvent`, `parseEntryVia`, `resolveTokens`).
- **Implementação interna** pode manter o nome PT do arquivo/função até uma renomeação mecânica futura — renomear 200 símbolos numa MR só por estética não paga o risco.
- **Barrel:** exporta o símbolo PT canônico da implementação **e**, quando útil, um alias EN com comentário `English alias — preferred for new code`.
- **Proibido no barrel:** seções “compatibilidade legado”, aliases PT **reversos** (`export { drain as drenar }`), e alias PT quando o canônico já é EN (`eventDefaults as padroesDoEvento`).
- Alias sem consumidor via `@albora/*` **sai** — morto no barrel é dívida que ninguém paga.

### 3. Packs (`@albora/packs`)

- Objetos de pack exportam **dois nomes estáveis** (`CASAMENTO` / `WEDDING`) — são identificadores de produto, não tradução de API.
- Chaves de vocabulário: `CORE_VOCABULARY_KEYS` canônico; `CHAVES_DO_NUCLEO` permanece enquanto houver consumidor interno.

### 4. Guard bloqueante

`tools/guards/nomenclatura.mjs` reprova:

- Comentários/seções `PT type aliases`, `compatibilidade com código legado`, `PT alias — prefer`.
- Exports ` as <alias>` listados como alias PT reverso proibido nos barrels monitorados.

O guard **não** mexe em rotas PT de API (compat URL) — isso continua no guard `api-routes`.

## Consequências

**Positivas** — uma regra citável; barrels param de crescer em duas direções; código novo converge para EN sem big-bang rename; CI pega regressão.

**Custos** — quem ainda importa símbolo PT direto do barrel (`comEvento`, `decidirTese`) continua válido até migrar; renomear implementações PT→EN fica como refactor mecânico separado, não bloqueante.

**Fora de escopo deste ADR** — renomear arquivos `.ts` internos, traduzir copy/UI, multi-idioma de produto (Fase B/C).
