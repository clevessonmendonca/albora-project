# 0019 — Momentos são o arco do convidado, não sinal de landing; tipos de evento são packs

- **Status:** Accepted
- **Data:** 2026-09-07
- **Relaciona-se com:** [0003](./0003-runtime-token-resolution.md)

## Contexto

O redesign v4 do onboarding (fluxo A) abre a criação de evento com uma escolha de **tipo**: Casamento, Aniversário, Formatura, Corporativo, Celebração, Outro. Cada tipo traz seus próprios **momentos** default (o arco da festa — cerimônia num casamento, colação numa formatura), suas missões e seus lugares. A regra não-negociável do `CLAUDE.md` é clara: **nenhuma string de domínio dentro de componente** — o rótulo "Formatura" e o momento "A colação" resolvem via `@albora/packs`, nunca hardcoded no JSX. Logo, cada tipo de evento é um **pack**.

O obstáculo estava no contrato dos packs. `temLandingPropria()` tratava **qualquer** pack com `momentos` como um pack que possui landing própria de marketing:

```ts
if (pack.momentos && pack.momentos.length > 0) return true;
```

O motivo histórico: a landing exibe o "arco da noite", e o arco é a lista de momentos. Mas o efeito colateral é que um pack de tipo — escolhido **dentro** do wizard, sem funil próprio — seria forçado a inventar uma landing pública completa (herói único, lede, CTA, exemplo de nome) só para poder declarar seus momentos. Os testes de landing (`landing.test.ts`) exigem herói único e arco único por pack com landing; cinco tipos novos significariam cinco páginas de marketing que o redesign nunca pediu e que não têm rota.

## Decisão

**Momentos deixam de sinalizar landing.** `temLandingPropria()` passa a olhar só a presença de **copy de landing** (`LANDING_VOCABULARY_KEYS`):

```ts
export function temLandingPropria(pack: Pack): boolean {
  return LANDING_VOCABULARY_KEYS.some((chave) => Boolean(pack.vocabulario[chave]));
}
```

Um pack que declara `landing.titulo` etc. continua sendo landing e continua **obrigado** a ter momentos — `landingProblems()` segue exigindo o arco, porque a página que existe precisa dele. O que muda é só o outro sentido: momentos **sem** copy de landing são o arco default do convidado, não um funil, e não são cobrados pela copy de marketing.

**Tipos de evento são packs, marcados por dois campos aditivos** em `Pack`:

- `icone?: string` — nome do glifo Lucide do card (`"heart"`, `"cake"`, …). Não é palavra de domínio (o guard de domínio não o pega); é iconografia, e o componente resolve o glifo por este nome em vez de mapear `pack.id → ícone` na mão.
- `ordemCriacao?: number` — só packs com este campo viram card de criação, ordenados por ele. `packsDeCriacao()` os devolve na ordem. Pack escolhido dentro do wizard (`pre-casamento`) ou landing dedicada (`quinze-anos`) fica de fora sem hardcode no componente.

Cinco packs novos entram no catálogo — `aniversario`, `formatura`, `corporativo`, `celebracao`, `outro` — cada um com vocabulário de núcleo completo, missões, lugares, confessionário e momentos próprios, **sem** `landing.*`. `casamento` ganha `icone`/`ordemCriacao` e segue sendo landing. `quinze-anos` continua com sua landing dedicada, fora dos cards de criação (quem quer 15 anos escolhe "Aniversário" e ajusta).

## Consequências

- **O teste de sanidade continua valendo e fica mais forte:** trocar o `pack_id` de um evento muda vocabulário, missões, lugares **e momentos** sem tocar o núcleo. Um novo teste trava a regra: pack com momentos e sem copy de landing **não** é landing.
- **Sem novas superfícies de marketing.** Nenhuma rota de landing nasce por acidente ao adicionar um tipo de evento.
- **Extensível por dado.** Um novo tipo de evento é um arquivo de pack novo com `icone` + `ordemCriacao`; o onboarding o mostra sem mudança de componente. É o mecanismo de packs funcionando, não burlado.
- **Um resolvedor, N renderizadores ([ADR 0003](./0003-runtime-token-resolution.md)) intacto:** momentos continuam resolvendo por chave de vocabulário; nada passa a viver no componente.
