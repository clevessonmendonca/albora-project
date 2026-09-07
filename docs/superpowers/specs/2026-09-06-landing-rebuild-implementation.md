# Landing Albora — Rebuild em código (spec de implementação)

**Data:** 2026-09-06 · **Branch:** `feat/landing-redesign` · **Alvo:** `apps/web/app/landing/**` (rotas `/` e `/15-anos`).

Refazer 100% a landing a partir do mock aprovado. **Remover o que não é mais usado.** Código limpo, direto, sênior: Server Components por padrão, client só onde há interação; zero hex hardcodado; zero string de domínio em componente; nada de morto deixado "por via das dúvidas".

Fonte visual da verdade: o mock aprovado (hero + "como funciona" + perspectivas por scroll + telão) + as seções finalizadas (prova, durante, depois, objeções, preço, FAQ, fecho). Imagens em `apps/web/public/landing/gen/` (geradas por IA — **não** são mídia de convidado, sem trava LGPD).

---

## 1. Resultado esperado

Uma landing enxuta, em ordem única, com estas seções (na ordem):

1. **Hero** — "As fotos da sua festa, *tiradas por quem viveu ela.*" + foto (4:5) + CTA único + prova curta. *(já portado)*
2. **Prova** — depoimento + selos de confiança.
3. **Como funciona** — 3 passos (QR → foto → álbum).
4. **Perspectivas** *(client, scroll-scrubbed)* — "Uma festa → centenas de perspectivas → converge no telão". Absorve qualquer "experiência/moments" antigo.
5. **O telão** — foto do telão em contexto (16:9) + "11 modelos, sem cortar rosto".
6. **Durante a festa** — uma experiência (feed/missões/reações/galeria), não features soltas.
7. **Depois** — álbum por momento + livro.
8. **Objeções** — "Seus convidados não baixam nada" + accordion (idade, LGPD, internet, moderação, posse).
9. **Preço** — Grátis / Celebração / Livro.
10. **FAQ** curto + **Fecho** — "Todos os momentos. Um só lugar. / Tiradas por quem viveu. Guardadas pra sempre."
11. **Sticky CTA** (global).

Ordem final: Hero → Prova → Como funciona → Perspectivas → Telão → Durante → Depois → Objeções → Preço → FAQ → Fecho.

## 2. Manter e reutilizar (não reescrever)

- `pieces.tsx` — `Section`, `Heading`, `Accent`, `Label`, `Frame`, `pillClasses`, `lightPillClasses`, `radiusStyle`, `transition`. Estender só se faltar primitivo.
- `landing-cta-link.tsx`, `landing-sticky-cta.tsx`, `landing-beacon.tsx`, `landing-demo-link.tsx`, `animated-brand.tsx` — logo animada real no header.
- Tokens `@albora/tokens` (Tailwind semântico: `text-ink/ink-2/ink-3`, `text-acento-texto`, `bg-bg/superficie/superficie-alta`, `border-linha`, `border-ink-borda-forte`, etc.).
- `landing-data.ts` — HREFs (`HREF_CRIAR_GRATIS`, `HREF_CRIAR_COMPLETO`, `HREF_DEMO`, `HREF_FORNECEDOR`), `WIDTH`, `SIDE_PADDING`, `SECTION_PADDING`, `LiveStats`.
- `@albora/packs` — copy por pack via `resolvePackText`; `landingProblems` como guard.

## 3. Componentes novos (`sections/`)

Todos Server Components, exceto onde marcado `client`. Shape padrão: recebem `t`/dados por prop, renderizam via primitivos de `pieces`, copy via `t("landing.…")`.

| Arquivo | Tipo | Notas |
|---|---|---|
| `hero.tsx` | server | ✅ feito. Foto `next/image` (4:5), copy do pack. |
| `prova.tsx` | server | Depoimento (via pack, ilustrativo até ter real) + selos. Sem número inventado. |
| `como-funciona.tsx` | server | 3 passos (reusa `STEPS` de `landing-data` **ou** inline; ver §6). |
| `perspectivas.tsx` | **client** | Seção de scroll. Ver §5. |
| `telao.tsx` | server | Faixa escura (dark tokens), foto 16:9 (`03-telao-festa`), caption "11 modelos". |
| `durante-a-festa.tsx` | server | Colagem de fotos + copy "uma experiência". |
| `depois.tsx` | server | Strip do álbum + livro. |
| `objecoes.tsx` | server | `<details>` accordion nativo (a11y grátis). |
| `preco.tsx` | server | 3 planos; CTAs pros HREFs; sem preço numérico inventado. |
| `faq.tsx` | server | 3–4 `<details>`. |
| `fecho.tsx` | server | Faixa escura + assinatura + CTA. |

`sections/index.ts` reexporta só esses. `landing-page.tsx` compõe na ordem da §1 e injeta `<LandingStickyCta>`.

## 4. Remover (código morto após o rebuild)

**Regra:** antes de deletar cada arquivo/símbolo, `grep` no repo inteiro por importadores. Só remove se o único consumidor era a landing antiga. Nunca remover algo usado por `admin/`, `e/` (convidado), `telao/` ou packages.

Candidatos (seções antigas + suporte, todos sob `apps/web/app/landing/`):

- **Seções antigas:** `no-app.tsx`, `scroll-demo.tsx`, `experience.tsx`, `moments.tsx`, `missions-section.tsx`, `album-chapters.tsx`, `identity.tsx`, `book.tsx`, `included.tsx`, `photo-corridor.tsx`, `chores-eliminated.tsx`, `antes-da-festa.tsx`, `veteran.tsx`.
- **Suporte só-da-landing-antiga:** `first-photo-demo.tsx`, `landing-veteran-cta.tsx`, `hero-stage.tsx` (ficou órfão após o hero novo), e o que sobrar de `interactives.tsx` que só as seções removidas usavam (`IdentityWall`, `ScrollDemo`, `Reveal` se ninguém mais usar — **verificar**; manter `Reveal` se as novas seções usarem reveal).
- **`landing-data.ts`:** remover constantes órfãs após o rebuild (`STEPS`/`NUMBERS`/`SURFACES`/`FACTS`/`QUESTIONS` — manter só as que as novas seções consumirem; ver §6).
- **`packs` vocabulário:** chaves de landing que nenhuma seção nova usa (`landing.momentos.*`, `landing.telao.*`, `landing.missoes.*`, `landing.veteran.*`, `landing.exemplo.nome`, etc.) — remover das 3 packs **e** de `LANDING_VOCABULARY_KEYS` em `packages/packs/src/tipos.ts`, senão o guard reprova. Fazer isto por último, quando o consumo estiver estável.
- **Assets:** se `public/landing/hero.webp` (e afins) não for mais referenciado, remover.

Saída: `sections/` só com os 11 arquivos novos; `interactives.tsx` só com o que sobrou vivo; `landing-data.ts` sem export morto; vocabulário sem chave órfã.

## 5. Perspectivas (client) — contrato

- `"use client"`. Estrutura: trilho alto (`~460vh` desktop / `~320vh` mobile) + filho `sticky top:0 h-screen overflow-hidden` (pin) + palco de tiles `absolute` + captions + moldura do telão que aparece na convergência.
- **Scrubbed, scroll nativo** (sem hijack): `progress = clamp((scrollY − topoSeção)/(altura − vh), 0, 1)`, calculado em `requestAnimationFrame`, aplicado só via `transform`/`opacity`. rAF roda só enquanto há scroll recente; `removeEventListener`/`cancelAnimationFrame` no cleanup do `useEffect`.
- Coreografia (parametrizada, sem números mágicos soltos — tabela de cenas tipada): cena 1 poucas tiles nos cantos → cresce → pico → recuo por posição/escala/opacidade (**sem blur**) + a mensagem → convergência: as demais somem, uma foto vira o telão.
- **Imagens:** `next/image` ou `<img>` com as fotos de `gen/`, `object-cover`, `loading="lazy"` fora da 1ª dobra.
- **`prefers-reduced-motion`:** render alternativo estático/sequencial (composição editorial) preservando "Uma festa → muitas perspectivas → Albora reúne". Sem depender de JS pra compreensão.
- Determinístico e reversível (descer/subir sem estado quebrado). Nada de HUD/debug no código de produção.
- Sem lib nova (React + rAF). Só adicionar dependência se provar que o nativo é insuficiente.

## 6. Copy, packs e i18n de domínio

- **Nenhuma string de domínio em componente** (`casamento`, `noivos`, `noiva`…): resolvem via pack. Ex.: o depoimento/`exemplo.nome` e "casamento, São Paulo" vêm do vocabulário, não hardcoded.
- Copy genérica (sem termo de domínio) pode ficar no componente (ex.: "Sua festa continua acontecendo no Albora").
- Atualizar a copy de landing nas **3 packs** (`casamento`, `quinze-anos`, `pre-casamento`) — a rota `/15-anos` usa a mesma `LandingPage`; se só o casamento for atualizado, o 15-anos mostra copy velha.
- Chaves novas de landing entram em `LANDING_VOCABULARY_KEYS`; chaves mortas saem (§4). `landingProblems(pack)` continua guard no `page.tsx`.

## 7. Imagens

- Originais + otimizadas já em `public/landing/gen/` (`01..10-*.png`, `web-*.jpg`). Para produção, servir por `next/image` (otimiza sob demanda) apontando para os PNGs, **ou** gerar `.webp` dedicados. Definir `sizes` por slot; `priority` só no hero; `loading="lazy"` no resto.
- `alt` descritivo em toda imagem. Nenhuma foto de convidado real sem autorização (as atuais são IA — ok).

## 8. Qualidade (código sênior)

- Server Components por padrão; `"use client"` só em `perspectivas.tsx` (e nos utilitários client já existentes). Sem estado/efeito desnecessário.
- Zero hex em componente; toda cor/tempo/raio por token. `filete, não caixa`; elevação por cor, não sombra.
- Tipagem estrita (sem `any`); props mínimas e explícitas; sem números mágicos soltos (constantes nomeadas). Sem comentário supérfluo (política do `CLAUDE.md`).
- `pnpm --filter @albora/web typecheck` + `lint` verdes. Guards de **isolamento** e **tokens** verdes (bloqueantes).
- **E2E:** manter o smoke do convidado; atualizar/adicionar asserções da landing (CTA "Criar meu evento" → `/admin/new?plano=free`, âncora `#telao`, e a seção de perspectivas presente). Ajustar seletores que apontavam pras seções removidas.
- **Perf:** LCP < 2,5s na rota do convidado/marketing; hero leve; imagens dimensionadas; sem lib pesada. Budget de bundle não regride.
- **A11y:** foco visível, contraste (âmbar só acento; texto usa `acento-texto`), `prefers-reduced-motion` respeitado, `<details>` nativo pros accordions, headings em ordem.

## 9. Sequência de execução

1. ✅ Hero (feito) — foto + copy do pack.
2. Prova → Como funciona → Telão → Durante → Depois → Objeções → Preço → FAQ → Fecho (seções novas), commit por seção, validando no dev.
3. Perspectivas (client) — construir e validar scroll nos dois sentidos + reduced-motion + perf.
4. `landing-page.tsx`: compor na ordem final; atualizar nav/âncoras; sticky CTA.
5. Copy das 3 packs; ajustar `LANDING_VOCABULARY_KEYS`.
6. **Remoção** (§4): grep-verificar e deletar seções/suporte/data/vocabulário mortos; remover assets órfãos.
7. Gates: typecheck, lint, guards, build, e2e, budget. Screenshot desktop+mobile.
8. Abrir MR pra `stable` (fluxo padrão; sem merge sem pedido).

## 10. Critérios de aceite

- `sections/` contém só os 11 componentes novos; nenhum arquivo/símbolo/keys morto remanescente (grep limpo).
- `/` e `/15-anos` renderizam a nova landing com a copy do respectivo pack.
- Zero hex hardcodado; zero string de domínio em componente; zero anti-padrão visual.
- Perspectivas: scrubbed, reversível, reduced-motion compreensível, sem HUD, ~60fps em mobile razoável.
- typecheck/lint/guards/build/e2e verdes; LCP < 2,5s.
- Trocar o pack muda a UI sem tocar o núcleo (teste de sanidade dos packs preservado).
