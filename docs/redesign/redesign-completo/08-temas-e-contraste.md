# 08 · Temas, personalização e contraste — por construção

## 1. Três camadas (nenhuma cor de evento chega crua à interface)

| Camada | O que é | Quem controla | Onde vive |
|---|---|---|---|
| **1. Identidade Albora** | logo, mascote, âmbar `#D46632` (`ALBORA_BRAND.cores.acento`), Fraunces + Instrument Sans, componentes e padrões de interação | produto | `brand/`, `packages/tokens/src/marca.ts` |
| **2. Identidade do evento / fornecedor** | cor do casal (`--ev`), par de cores, capa, monograma, estilo; no white-label, a cor da marca do fornecedor | casal / fornecedor | camada do evento (ADR 0003); `--ev` só pinta o que é *do evento* |
| **3. Tokens semânticos** | `--ac` (preenchimento de ação), `--accent-text`, `--on-ac` (rótulo sobre ação), `--fg/--fg-2/--fg-3`, `--control`, `--line` | **calculados** | `A.theme.resolve` (protótipo) ↔ `acentoLegivelSobre` (`packages/tokens/src/cor.ts`) |

Regra: a camada 2 **entra** na 3 por um motor de contraste; ela nunca substitui um padrão de interação por si só. No painel do anfitrião o cromo é sempre âmbar da marca (`--ac = --ambar`); no convidado/telão o cromo usa o acento do evento **já resolvido**; no portal do fornecedor, a cor dele via `A.theme.scope`.

## 2. O motor (`core.js › A.theme`)

`resolve(hex, chão)` devolve `fill` (≥3:1 contra o chão — componente não textual, WCAG 1.4.11), `text` (≥4,5:1 — texto na cor do acento, 1.4.3) e `onFill` (tinta ou papel, o que tiver melhor contraste sobre o `fill`, e o `fill` é ajustado até o rótulo atingir ≥4,5:1). O ajuste anda em passos de 4% na direção do contraste e para no primeiro valor que passa — “o mais próximo” preserva a cor do casal em vez de pular para preto/branco. Nunca se assume “branco sobre escuro” ou “preto sobre claro”: o contraste é calculado.

Também novos tokens neutros validados: `--fg-3` (apoio) agora tinta a 66% (5,8:1 no papel; antes 56% = 4,1:1, reprovava) e `--control` (borda de campo, switch desligado, check) a 54% (≥3:1; o filete de 14% anterior era decorativo e reprovava 1.4.11).

## 3. Matriz de paletas (executada no navegador; `A.theme.resolve` nos dois chãos)

Notação `f` = preenchimento vs chão, `t` = texto na cor do acento vs chão, `r` = rótulo sobre o preenchimento. Mínimos: f≥3, t≥4,5, r≥4,5.

| Paleta | Cor | Chão **noite** (convidado/telão) | Chão **papel** (painel/fornecedor) | Resultado |
|---|---|---|---|---|
| Albora âmbar | `#D46632` | f5,41 · t5,41 · r4,98 | f3,53 · t4,56 · r4,98 | ✔ |
| Marsala (Marsala & Marinho, cor 1) | `#8A2F42` | `#984758` f3,18 · t4,65 · r6,01 | f7,91 · t7,91 · r7,91 | ✔ |
| Marinho (cor 2) | `#1F3A56` | `#4B6177` f3,08 · t4,82 · r6,2 | f11,29 | ✔ |
| Oliva | `#5A5F2B` | `#606533` f3,2 · t4,65 · r5,96 | f6,54 | ✔ |
| Areia | `#C9B58A` | f9,84 · t9,84 · r9,07 | `#9E8F6D` f3,07 · t4,78 · r5,73 | ✔ |
| Terracota | `#B2512B` | f3,86 · t4,76 · r4,95 | f4,95 | ✔ |
| Ocre | `#C98A1D` | f6,71 · t6,71 · r6,19 | `#C2851D` f3,05 · t4,67 · r5,78 | ✔ |
| Ardósia | `#3E4A56` | `#555F6A` f3,04 · t4,65 · r6,28 | f8,76 | ✔ |
| Rosé | `#B9808C` | f6,14 · t6,14 · r5,66 | f3,11 · t4,67 · r5,66 | ✔ |
| Vinho | `#6B1F34` | `#884B5B` f3,01 · t4,69 · r6,34 | f10,85 | ✔ |
| Dourado | `#B8893A` | f6,28 · t6,28 · r5,79 | f3,04 · t4,58 · r5,79 | ✔ |
| Grafite | `#2D2D2F` | `#5F5E5F` f3,06 · t4,95 · r6,24 | f13,29 | ✔ |
| Champanhe | `#C9B38A` | f9,69 · t9,69 · r8,93 | `#9E8D6D` f3,13 · t4,88 · r5,62 | ✔ |
| **Clara** amarelo | `#F2D64B` | f13,64 · r12,57 | `#A39137` f3,05 · t4,65 · r5,78 | ✔ |
| **Clara** pêssego | `#F6C6A8` | f12,76 · r11,76 | `#A68672` f3,24 · t4,88 · r5,44 | ✔ |
| **Escura** azul-noite | `#14213D` | `#555E72` f3,04 · t5,05 · r6,29 | f15,45 | ✔ |
| **Escura** quase preta | `#1A1A1A` | `#626261` f3,24 · t4,79 · r5,9 | f16,83 | ✔ |
| **Baixa saturação** | `#8C7F82` | f5,15 · t5,15 · r4,75 | f3,71 · t4,75 · r4,75 | ✔ |
| **Muito saturada** magenta | `#E0116F` | f4,21 · t4,66 · r4,53 | f4,53 | ✔ |
| **Muito saturada** verde | `#00C853` | f8,83 · r8,14 | `#05A446` f3,17 · t4,88 · r5,55 | ✔ |
| Branca / Preta (extremos) | `#FFFFFF` / `#000000` | f19,76 / `#656464` f3,35 | `#908F8E` f3,12 / f20,31 | ✔ |

22 de 22 combinações aprovadas por construção. **Observação de direção de arte:** cores escuras (marsala, vinho, ardósia) *clareiam* sobre noite para passar no contraste — o marsala vira um rosa-poeirento no botão do convidado. É a regra funcionando, não um bug; a cor crua continua no monograma e na capa (`--ev`), onde é decoração. Se o casal achar o botão “rosado demais”, a saída correta é oferecer um chão claro para o evento (já suportado pela camada do evento), nunca forçar a cor escura sobre noite.

**Não coberto:** capa com foto de luminosidade variável sob texto (o protótipo usa monograma/foto de exemplo; no produto o texto sobre foto precisa de véu calculado — pendência).

## 4. Auditorias automáticas incluídas (`prototipo/tools/`)

- `lint.mjs` — espaçamento fora da escala, `font-size` fora do sistema, hex em módulo, `var(--ev)` como cromo, durações fora de 120/200/320 ms.
- `audit.js` — no navegador: overflow horizontal, elementos fora da viewport, alvos de toque <44 px (e <24 px), contraste real de texto (compõe os fundos, aplica 3:1 a texto grande), texto cortado. **Limite:** texto sobre imagem/gradiente e pseudo-elementos são “indeterminados”; não substitui leitor de tela nem inspeção humana.
