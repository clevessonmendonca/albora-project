# Seção de scroll "muitas perspectivas" — análise do CutPro + storyboard Albora

**Data:** 2026-09-06 · **Branch:** `feat/landing-redesign` · Referência estudada: seção "17 cortes" em https://cut.pro (analisada via DOM/CSS ao vivo, 2026-09-06).

> Objetivo: reproduzir o **princípio de interação e narrativa** (volume crescente controlado pelo scroll), **não** a identidade, textos, assets, layout ou código do CutPro.

---

## Etapa 1 — Análise da referência (medida no DOM, não por descrição)

### O que é
Seção interna (classe `corridor`) na home do Cut.Pro. Tese no topo: **"17 cortes. Nenhum editado à mão."** / eyebrow "CORTES REAIS · FEITOS E PUBLICADOS NA CUT.PRO". Mostra **17 vídeos verticais reais** de cortes publicados, com stat de "views somadas", e fecha com **"E o próximo é o seu" → CTA** ("Colar meu primeiro link").

### Mecanismo (medido)
- **Trilho de scroll:** `section.corridor` `position:relative`, **altura 3658px** (~5,1 × viewport de 720px). É a distância de scroll que a animação dura.
- **Pin:** filho `pinned` `position:sticky; top:0; height:100vh; overflow:hidden` — fica preso enquanto se rola os 3658px.
- **Palco:** `stage` `position:absolute` com **17 tiles** `position:absolute` (9:16, base ~96×171, `z-index:100`). Em repouso ficam empilhadas (1ª com `visibility:hidden`); conforme o progresso, JS aplica **transform** pra espalhá-las pelo palco.
- **Progresso → movimento:** **scrubbed** (a posição do scroll = o estado visual), não animação disparada por entrada na viewport.
- **Stack:** **sem** GSAP, Lenis, Framer ou CSS scroll-timeline (`animation-timeline:auto`). É **JS custom** lendo um **scroll sintético** — a página inteira roda num *scroll hijack* (`window.scrollY` fica 0, `body` height 0, conteúdo em camada fixa; wheel/touch → transform). Só **transform/opacity** (GPU), sem reflow.
- **Mídia:** 17 `<video>` verticais 720×1280, `muted`, `loop`, `playsInline`, `autoplay:false`. **Lazy/decode sob demanda** (só o clip-01 tinha dimensões carregadas; os demais 0×0). Zero imagens.
- **Fallback:** `listEquivalent` = `<ul>` com os 17 cortes em texto (título, criador, plataforma, views) — **equivalente semântico** p/ a11y, no-JS, SEO e reduced-motion.
- **Entrada/saída & texto:** tiles começam poucas/pequenas/empilhadas → fanam pelo palco acumulando volume, atravessando com escalas/profundidades diferentes; o título "17 cortes" fica fixo enquanto o volume cresce; o `closing` converge numa frase + CTA e a seção destrava pro resto da página.
- **Perf percebida:** leve — só transform/opacity + vídeos lazy/muted; o risco (muitos vídeos decodificando) é contido limitando o decode aos próximos.

### O que vale ADAPTAR (o princípio)
1. **Sticky-pin + trilho longo**: progresso do scroll = estado da composição (scrubbed).
2. **Poucos → muitos**: acúmulo perceptível de volume.
3. **Mídia vertical real do produto**, lazy, muted/loop/playsInline, só transform/opacity.
4. **Equivalente semântico** como fallback (a11y/reduced-motion/SEO).
5. **Fechar em convergência → CTA**, com pouquíssimo texto.

### O que NÃO copiar
- Identidade visual, cores, tipografia, textos, layout exato, assets, o "corridor" literal, o número "17" como gimmick.
- **O scroll-hijack sintético da página inteira** — agressivo, quebra scroll nativo/acessibilidade e brigaria com a nossa landing nativa. Usaremos **sticky nativo + progresso via scroll nativo/IntersectionObserver**, sem sequestrar o scroll.
- A estética "viral/TikTok" (views, cortes) — nosso universo é **editorial de casamento**.

---

## Etapa 2 — Storyboard Albora

**Seção:** "Uma festa. Centenas de perspectivas." — **absorve o antigo "Como funciona"** (não é uma 10ª seção; a landing continua enxuta).

**Tese:** uma festa, centenas de perspectivas. O fotógrafo cobre alguns ângulos; os convidados cobrem a festa inteira; **o Albora reúne tudo.** A animação faz *sentir* o volume — não decora.

**Trilho:** altura total ~**400–500vh** (≈4–5 × 100vh) no desktop e ~**300vh** no mobile — a distância de scroll que a coreografia dura (o pin é 100vh; o trilho é o resto). Números sujeitos a ajuste pelo protótipo. Scrubbed.

| Progresso | Cena | Mídia (desktop / mobile) | Texto |
|---|---|---|---|
| 0% | **1 · Uma festa** | 2–3 verticais pequenas, muito espaço negativo (papel), calmo | "Uma festa." (Fraunces grande) |
| ~20% | **2 · Muitas pessoas** | entram momentos variados (pista, mesa, abraço, detalhe, selfie, bastidor) — 6–8 / 3–4, escalas e profundidades diferentes, algumas entrando das bordas | "Centenas de perspectivas." |
| ~50% | **3 · Explosão** | pico de densidade 10–15 / 5–7, rico mas **hierárquico** (1–2 em foco, resto em profundidade/menor opacidade) — nunca caos | (sem texto novo; o volume fala) |
| ~70% | **4 · A mensagem** | densidade **recua por posição + escala + opacidade** (afasta do centro, abre espaço) — **sem blur animado** | "A história da sua festa, contada por todos que estiveram lá." (espaço + força editorial) |
| ~90–100% | **5 · Albora reúne → o telão** | volume máximo → algumas somem → **uma foto permanece** → atravessa/transiciona → **aterrissa no TELÃO Albora** (sem corte vertical). Direção definida: o clímax termina **no telão** (não álbum), e essa transformação **é a transição natural pra próxima seção "O telão"** — nem parece que uma acabou e outra começou. Produto real: convidados → Albora → telão | "Todos os momentos. Um só lugar." · assinatura "Tiradas por quem viveu." |

**Produto real (obrigatório):** o final mostra o **mecanismo Albora** (mídias dos convidados → Albora → telão/álbum), deixando claro que não é galeria bonita, é o sistema que conecta as perspectivas.

**Movimento:** scroll→progresso, suave e previsível; só `transform`/`translate`/`scale`/`opacity`. **Sem blur animado como recurso principal** (custo de perf + visual artificial); o "respiro" da Cena 4 vem de posição/escala/opacidade. Sem bounce/elástico/parallax agressivo/efeito de "startup de IA". Editorial + cinematográfico + premium.

**Desktop:** sticky quase full-viewport; mídias atravessando regiões; elementos parcialmente fora da tela entrando; escalas variadas; sobreposição controlada; texto com respiro. **Pode romper o container central** da landing.

**Mobile:** coreografia própria (não reduzir o desktop) — menos mídias simultâneas, maiores, verticais; menor distância de scroll; menos sobreposição; GPU/CPU conservadores. A sensação de "muitas perspectivas" persiste mesmo com menos elementos.

**Vídeos:** maioria **fotos** (duotone/placeholder até haver autorização — ver trava LGPD do spec da landing); **poucos** vídeos curtos reais (muted/loop/playsInline/poster), só perto da viewport; nunca dezenas decodificando. LCP e fluidez são requisito.

**Reduced-motion:** vira **composição editorial estática/sequencial** (o equivalente semântico) preservando "Uma festa → muitas perspectivas → Albora reúne". A compreensão não depende da animação.

**Sem números artificiais:** 2–3 → 6–8 → 10–15 é regra de **composição**, não texto na tela. Nada de "17 fotos / 32 perspectivas / 147 momentos" inventados — a força vem da sensação visual de quantidade, não de métrica falsa. Números reais só quando existirem.

**Copy (mínima, a composição decide quais):** "Uma festa." · "Centenas de perspectivas." · "A história da sua festa, contada por todos que estiveram lá." · "Todos os momentos. Um só lugar." · "Tiradas por quem viveu."

### Tecnologia (proposta — validar no protótipo)
- **Sem lib nova.** Sticky **nativo** + listener de scroll/IntersectionObserver calculando `progress = clamp((scrollY − topoSeção) / (alturaSeção − vh), 0, 1)`, atualizado em `requestAnimationFrame`, aplicado via **CSS custom properties** (`--p`) que as tiles consomem em `transform`/`opacity`. React/Next (stack da landing). Reaproveita tokens da marca. **Sem scroll-hijack.**
- Cada tile posiciona-se por função do `--p` (x/y/scale/opacity/z interpolados entre keyframes por cena). Coreografia dirigida, determinística, reversível (scroll pra cima desfaz).

---

## Etapas seguintes
- **Etapa 3 — Protótipo isolado** (Artifact), com conteúdo representativo do produto.
- **Etapa 4 — Validação** contra os 10 critérios do pedido (entende sem ler? parece Albora? volume evidente? movimento com propósito? premium? scroll lento/rápido? mobile? reduced-motion? performance? final conecta ao produto?).
- Só então **integrar** à landing, absorvendo o "Como funciona".
