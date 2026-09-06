# Landing Albora — Redesign de Alta Conversão (spec de design)

**Data:** 2026-09-06 · **Branch:** `feat/landing-redesign` (base `stable`) · **Superfície:** landing de marketing (`apps/web/app/landing/*`, rotas `/` e `/15-anos`).

## 1. Decisão e escopo

- **Comprador-alvo:** noivos / anfitrião (B2C). É quem paga e quem sofre com foto de festa espalhada e perdida.
- **Ação de conversão nº1:** *criar meu evento* (self-serve → `/admin/new?plano=free`). Único botão que mede sucesso; toda a página existe pra levar a ele.
- **Abordagem:** **A — reconstrução.** Componentes novos + sistema visual novo. Não restilizar o velho (o excesso é estrutural, carregaria os vícios).
- **Fora de escopo:** fluxo do convidado, admin, o telão em si; fornecedor/B2B. Só a landing.

### Trava mestra (não-negociável neste redesign)
Toda seção mostra **produto real** ou **consequência concreta** da experiência. **Nada de seção de enchimento.** A página é uma sequência de **capítulos encadeados** (a jornada de compra), não 9 blocos visualmente independentes. A ordem de leitura é: produto real → experiência → resultado → emoção.

## 2. Diagnóstico da atual (por que reconstruir)

Entrypoint `apps/web/app/page.tsx` → `<LandingPage pack={WEDDING}/>`; seções soltas em `apps/web/app/landing/sections/*`. Hoje: **17 seções** + header + sticky.

- "Sem app" repetido em **5** lugares (Hero, NoApp, Experience, FAQ, Included).
- Telão aparece **2×** (Moments e Identity); "o álbum é seu" **4×** (Hero, Book, FAQ, Pricing).
- ~**29 bullets** empilhados antes do preço (Experience 3+4, Moments 4, ChoresEliminated 8, Included 8, FAQ 6).
- `photo-corridor.tsx` sozinho tem **317 linhas** — maior densidade da página.

O problema não é "infantil por cor" — é **excesso, repetição e falta de hierarquia**.

## 3. Síntese de mercado (CRO 2025-2026)

- Decisão em **5s** acima da dobra: headline + sub + 1 CTA + 1 prova, sem scroll.
- Headline vence com **mecanismo + emoção juntos** (puro-emocional atrasa a compreensão — erro do GuestPix).
- **CTA único** — não competir com CTA de download de app (erro do POV).
- **Preço perto do hero**, porém **sutil** (Pix Wedding põe preço cedo; mas "GRÁTIS" gritado faz parecer SaaS genérico).
- **Prova real com números** ("634 fotos, 94 convidados") > número agregado frio.
- **Mostrar o telão de verdade** — diferencial físico que **nenhum concorrente exibe**.
- Disclosure progressivo (accordion) pro técnico/LGPD. **Sticky CTA** no rodapé. **LCP < 2,5s**.

## 4. Sistema visual (tokens da marca — fonte da verdade `brand/` → `packages/tokens`)

- **Cores:** papel `#F4F0E9` (base) · tinta `#1A1613` (texto **e** CTA primário — contraste de keynote, foge do botão terracota clichê) · noite `#0C0A09` (faixa do telão / superfícies escuras) · âmbar `#D9793C` (**só** acento/filete/marca) · **acento-texto derivado** (`#9E4A22`) pra texto sobre papel — âmbar puro reprova contraste (2,74:1). Neutros = **opacidade** sobre tinta/papel; nenhum cinza novo, nenhuma rampa de hex.
- **Tipo:** Fraunces (display, peso ≤400, display em **300** — delicadeza por peso baixo em tamanho grande) + Instrument Sans (corpo). Rótulo = versalete espaçado; **mono nunca como rótulo**.
- **Princípios:** **filete, não caixa**; elevação por **cor, não sombra**; respiro; micro-movimento sutil **a partir de estado visível** (nada parado em `opacity:0` esperando observer). Fundo claro (papel) na landing; celular do convidado e telão em noite.
- **Anti-padrões bloqueantes:** glassmorphism, neon, gradiente roxo, dark tech, fonte script, verde sage, rosa blush, ícone de aliança/pombinha/coração, "template de casamento". Sem card-demais, gradiente decorativo, sombra pesada, ícone genérico/fofo.
- **Tokens obrigatórios:** nenhum hex hardcodado em componente — tudo via resolvedor/variável derivada (CLAUDE.md: hex hardcodado é bug de produto). Guard de tokens roda bloqueante.

## 5. Restrição legal (LGPD) — mídia da landing

**Mídia de convidado NUNCA vira material de marketing** (CLAUDE.md; STJ REsp 1.628.700/MG — dano à imagem de menor é *in re ipsa*, sem exigir fim comercial). Portanto a landing **não** pode usar fotos reais de eventos sem **autorização escrita e específica** (do responsável legal, se houver menor).

**Decisão:** construir com **placeholders/duotone nos tons da marca** (claramente reservados) e representações de produto (UI real do fluxo). Fotos reais entram só quando houver autorização por escrito. A arquitetura de slots já prevê o swap por foto real.

## 6. Arquitetura — 9 capítulos

Cada capítulo abaixo: **propósito · o que mostra do produto/consequência · copy-chave · o que absorve/corta do atual.**

### 1 — Hero  *(cap. de abertura: mecanismo)*
- **Mostra:** a **experiência completa** como herói visual — não o celular sozinho. Cena real: **QR → celular (câmera/foto) → a foto subindo e aparecendo no telão ao vivo** ("já está no telão ✨"). Celular **não** é protagonista; a experiência é. Nada de cara de tutorial/dashboard.
- **Copy:** H1 **"Toda perspectiva da sua festa, sem pedir pra ninguém baixar nada."** · Sub: "Seus convidados escaneiam um QR, tiram fotos e mandam tudo pra você. Ao vivo no telão. Pra sempre no álbum." · CTA **"Criar meu evento"** · Prova curta: **"Sem app · Sem login pra convidados · Comece grátis"** (preço sutil, sem "GRÁTIS" gritado).
- **Absorve/corta:** mata o `NoApp` isolado e o `ScrollDemo` — o "sem app" e a demo viram esta cena única.

### 2 — Prova  *(consequência concreta)*
- **Mostra:** faixa de prova real: número concreto de um caso ("Ana & Léo: 634 fotos, 94 convidados") + 1 depoimento curto. Se houver, 1 menção/imprensa. Números com `tabular-nums`.
- **Copy:** curta, factual. Sem adjetivo vazio.
- **Absorve:** substitui o "badge ao vivo" difuso do hero atual por prova de verdade, acima da dobra.

### 3 — Como funciona  *(produto real, 3 passos)*
- **Mostra:** 3 passos encadeados (QR → foto → álbum) com fragmento de UI real em cada. Um bloco só.
- **Copy:** 01 O QR na mesa · 02 A foto, na hora · 03 O álbum, no dia seguinte.
- **Absorve/corta:** funde `Experience` (remove os 4 números soltos), `ScrollDemo`.

### 4 — O telão  *(PROTAGONISTA visual)*
- **Mostra:** seção **visualmente dominante, full-bleed, em noite**. **Vídeo/loop do fluxo real**: foto entra → animação → aparece no telão → reação. 11 layouts, **sem corte vertical**. Não é screenshot dentro de card.
- **Copy:** "A festa também acontece aqui." + "Onze enquadramentos que cabem a foto em pé sem decepar rosto. Nenhum concorrente mostra isto — porque nenhum faz."
- **Absorve/corta:** consolida o telão que hoje se repete em `Moments` e `Identity`.

### 5 — Durante a festa  *(UMA experiência, não três features)*
- **Mostra:** "Sua festa continua acontecendo no Albora." A pessoa **imagina "quero isso no meu casamento"**, não aprende a arquitetura. Fotos, missões, interações e galeria aparecem como **facetas de uma experiência**, não como 3 cards de feature.
- **Absorve/corta:** funde `Moments` + `Identity` + `AlbumChapters` + `Missions` num só capítulo experiencial.

### 6 — Depois  *(resultado)*
- **Mostra:** o álbum organizado por momento + o livro impresso (consequência tangível).
- **Copy:** "No dia seguinte, tudo já está organizado. Seu, pra sempre — e vira livro, se quiser."
- **Absorve/corta:** funde `Book` + `AlbumChapters` (o "depois").

### 7 — Objeções  *(derruba o medo)*
- **Mostra:** a objeção nº1 resolvida de forma **definitiva e única**: "Seus convidados não baixam nada" (com a prova visual do fluxo). Privacidade/LGPD, moderação, internet ruim e posse em **accordion** (disclosure progressivo).
- **Absorve/corta:** consolida as 5 repetições de "sem app" + absorve o essencial de `FAQ`, `Included`, `ChoresEliminated` (8→3 no máximo) e `Veteran` sai (caminho convidado→cliente, secundário).

### 8 — Preço  *(cedo o suficiente, simples)*
- **Mostra:** "Comece grátis. Pague uma vez, só se quiser desbloquear tudo." Planos enxutos; benefícios como consequência, não lista de 8 fatos.
- **Destinos:** free → `/admin/new?plano=free`; completo → `/admin/new?plano=celebration` (reusar `landing-data.ts`).

### 9 — FAQ curto + fecho + sticky CTA  *(emoção + conversão)*
- **Mostra:** FAQ curto em accordion (só o que trava a compra). Fecho emocional: **"Tiradas por quem viveu. Guardadas pra sempre."** (a assinatura da variação B/C, no lugar certo). Sticky CTA "Criar meu evento" presente desde o hero.

## 7. Mapa antigo → novo

| Atual (17) | Destino |
|---|---|
| Hero | Cap. 1 (reescrito, headline A) |
| NoApp, ScrollDemo | Absorvidos no Cap. 1 (cena única) |
| Experience (3 passos + 4 números) | Cap. 3 (só os 3 passos) |
| Moments, Identity | Cap. 4 (telão) + Cap. 5 (experiência) |
| PhotoCorridor (317 linhas) | Cortado; fotos curadas migram pro hero/telão |
| Missions | Cap. 5 (faceta) |
| AlbumChapters, Book | Cap. 6 (depois) |
| ChoresEliminated (8), Included (8) | Cap. 7/8 (3 no máx) |
| AntesDaFesta | Cap. 5 ou cortado (avaliar) |
| Veteran | Cortado |
| Pricing | Cap. 8 |
| Faq (6) | Cap. 9 (curto) |
| Closing | Cap. 9 (fecho emocional) |

## 8. Implementação (visão; detalhe vai pro plano)

- Reconstruir `apps/web/app/landing/`: novo `landing-page.tsx` + novas `sections/`. Reaproveitar: **tokens** (`packages/tokens`), **HREFs** (`landing-data.ts`), **copy por pack** (`packages/packs` — vocabulário casamento/15-anos; **nenhuma string de domínio no componente**). Remover as 17 seções antigas ao final, quando a nova página cobrir o valor.
- **Packs:** teste de sanidade preservado — trocar o pack muda a UI sem tocar o núcleo.
- **Perf:** LCP < 2,5s. Hero leve, imagens otimizadas (`next/image`), sem libs pesadas, vídeo do telão com `poster` e lazy fora da dobra.
- **Gates:** guards de isolamento e de tokens (bloqueantes). Typecheck/lint. E2E: manter/atualizar o smoke do fluxo do convidado; adicionar asserção do CTA "criar evento" e do link do telão. Não rebaixar gate.
- **Acessibilidade:** foco visível, contraste (âmbar só como acento; texto usa acento-texto), `prefers-reduced-motion` respeitado no micro-movimento.

## 9. Sequência de construção (seção por seção, validando contra o produto)

1. Fundação: tokens/tipografia da landing + shell (`landing-page.tsx`) + header + sticky CTA.
2. Cap. 1 Hero (com a cena QR→celular→telão) → **validar visual antes de seguir**.
3. Cap. 4 Telão (o "uau") — construir cedo, é o diferencial.
4. Cap. 3 Como funciona.
5. Cap. 5 Durante a festa.
6. Cap. 2 Prova + Cap. 6 Depois.
7. Cap. 7 Objeções + Cap. 8 Preço.
8. Cap. 9 FAQ + fecho.
9. Remover seções antigas; perf pass; e2e/typecheck/lint; screenshot de verificação.

Cada seção é validada contra o produto real antes da próxima (pedido explícito do mantenedor).

## 10. Critérios de aceite

- 9 capítulos, encadeados como jornada (não blocos soltos). Zero seção de enchimento.
- Hero = variação A; "sem app" dito **uma vez** de forma definitiva (Cap. 7), não 5×.
- Telão é a seção visualmente dominante, com produto em movimento.
- Preço presente cedo, sutil (sem "GRÁTIS" gritado). CTA único "Criar meu evento".
- Zero hex hardcodado; zero anti-padrão visual; LCP < 2,5s; gates verdes.
- Nenhuma foto real de convidado sem autorização escrita.
