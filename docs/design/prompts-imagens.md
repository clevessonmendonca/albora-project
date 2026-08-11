# Prompts de imagem para a landing

Os slots abaixo são exatamente as `<Moldura>` de `apps/web/app/landing/`. Cada
um traz proporção, porque a proporção é decisão de produto: **três de cada
quatro fotos de festa são verticais**, e a landing que as mostra deitadas
promete um enquadramento que o produto recusa.

## Antes de gerar: o limite

**Estas imagens não podem ser apresentadas como fotos de eventos reais.** Nem
legenda com nome de casal, nem "festa da Ana & João", nem número de convidados.
O risco é o mesmo que a spec 013 já proíbe em depoimento — num mercado de boca
a boca, prova social inventada não volta atrás. Servem como **ilustração**, e
saem assim que houver evento real fotografado com autorização.

Isto **não** é o [ADR 0007](../adr/0007-ai-policy-luts-not-generation.md), que
proíbe IA generativa na mídia do convidado. Aqui é peça de marketing, e a
fronteira é outra: lá é o acervo do casal, aqui é a vitrine.

## Estilo, uma vez

Cole este bloco antes de cada prompt:

```
Fotografia documental de festa noturna, câmera na mão, luz disponível apenas —
lâmpadas quentes, velas, luzinhas do salão. Sem flash direto, sem luz de
estúdio. Cor quente e terrosa: âmbar #D9793C, papel #F4F0E9, tinta #1A1613.
Grão fino de filme 35 mm, leve halação nas altas luzes, sombras abertas e
lavadas. Foco no gesto, não na pose. Pessoas de aparência brasileira, idades
misturadas, corpos e tons de pele variados. Sem sobreposição de texto, sem
marca d'água, sem logotipo.
```

E este como negativo:

```
sem flash de estúdio, sem HDR, sem cores saturadas, sem azul frio, sem verde
sage, sem rosa blush, sem gradiente roxo, sem bokeh exagerado, sem pose de
banco de imagens, sem olhar para a câmera, sem mãos deformadas, sem texto,
sem logo, sem moldura, sem vinheta pesada
```

## Os slots

| # | Onde | Proporção | Prompt |
|---|---|---|---|
| 1 | Herói, dentro do aparelho | **9:19** | Tela de celular vertical segurada na altura do peito num salão à noite: um grupo rindo à mesa, taças no ar, ao fundo luzinhas desfocadas. Enquadramento de quem está na festa, não de quem cobre a festa. |
| 2 | Demo, passo 2 ("A pista") | **9:16** | A pista de dança depois da meia-noite, vista de dentro dela. Movimento borrado nos braços, rostos nítidos o suficiente para se ler alegria. Luz âmbar por cima. |
| 3–6 | Demo, grade do álbum | **1:1** | Quatro recortes da mesma noite: (a) duas mãos brindando; (b) uma senhora dançando com um senhor; (c) o detalhe da mesa — guardanapo, vela, flor murchando; (d) alguém rindo de boca aberta, de perfil. |
| 7–12 | Demo, telão | **4:3** | Seis fotos da mesma festa em ângulos que um fotógrafo contratado não cobriria: de baixo, de trás, do meio da roda, do canto da mesa. |
| 13 | Momentos — *Feed ao vivo* | **9:16** | Alguém de pé segurando o celular, mostrando a tela para outra pessoa, as duas rindo do que veem. O rosto delas importa mais que a tela. |
| 14 | Momentos — *Missões* | **9:16** | Braço esticado tirando foto de um grupo que se ajeita depressa para caber no quadro. |
| 15 | Momentos — *Galeria de cada um* | **9:16** | Uma pessoa sentada, sozinha por um instante, olhando as próprias fotos no celular com um sorriso pequeno. |
| 16 | Momentos — *Álbum do casal* | **9:16** | Duas pessoas encostadas uma na outra no fim da noite, cansadas e satisfeitas, o salão vazio ao fundo. |
| 17 | Telão | **16:9** | O telão do salão visto do meio da festa: fotos grandes na parede, silhuetas de convidados na frente, luz do projetor cortando a fumaça leve. |
| 18–19 | Telão, secundárias | **4:3** | Dois recortes da mesma festa, verticais, exibidos sem corte. |
| 20 | Livro | **3:2** | Um livro de fotos aberto sobre a mesa da manhã seguinte, luz natural pela janela, café ao lado. Papel fosco, lombada quadrada. |

## Como entram no código

`Moldura` já aceita a foto. Sem `src` ela desenha o slot vazio; com `src` ela
vira `<img>` com `object-fit: cover` no mesmo enquadramento:

```tsx
<Moldura rotulo="A festa, por quem estava nela" raio="var(--raio-superficie)" />
<Moldura
  rotulo="A festa, por quem estava nela"
  raio="var(--raio-superficie)"
  src="/fotos/heroi.avif"
  prioridade
/>
```

`prioridade` só na imagem do herói: ela é o LCP. O resto entra preguiçoso, que
é o padrão.

`rotulo` continua obrigatório porque com `src` ele vira o `alt`. Um slot que
não sabe descrever a própria foto não deveria receber uma.

**Slots que não são foto e nunca serão:** papelaria, telão, álbum aberto e a
linha do tempo são desenhados com os tokens do evento em
`apps/web/app/landing/vitrines.tsx`. Trocar por captura de tela congelaria a
peça numa identidade só e mataria a prova do
[ADR 0003](../adr/0003-runtime-token-resolution.md), que é o que a seção existe para
mostrar. As `Moldura` **dentro** delas, sim, recebem foto.

Vão para `apps/web/public/fotos/`, em **AVIF com fallback WebP**, largura
máxima 1600 px. A rota do convidado tem orçamento de bundle
([`CLAUDE.md`](../../CLAUDE.md), gates por fase) e a landing tem LCP < 2 s em 4G
como verificação 1 da [spec 013](../specs/task-013-landing-e-conversao.md) — a
imagem do herói precisa de `priority`, o resto entra preguiçoso.
