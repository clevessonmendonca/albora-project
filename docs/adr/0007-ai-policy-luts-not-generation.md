# 0007 — IA: classificação sim, geração não. O visual sai de LUT

- **Status:** Accepted
- **Data:** 2026-08-09
- **Relaciona-se com:** [0003](./0003-runtime-token-resolution.md), [0006](./0006-hosting-platform.md)

## Contexto

O Instagram lançou restilização de foto por IA, com prompts longos e específicos do tipo:

> *"Restyle source image as a 35mm negative photograph. Dual-source exposure combining ambient daylight with a subtle on-axis flash fill that opens shadows… neutral base tint with a very slight cool-green bias in midtones… shadows are open and lifted in the foreground from flash fill… with a neutral-cool density floor and visible but controlled film grain throughout."*

O visual é ótimo e é exatamente o registro que o Albora quer: energia de flash editorial, grão, cor natural. Surgiu a pergunta de integrar uma IA — de preferência gratuita, "tipo a da Meta".

## O que a investigação encontrou

**Não existe IA gratuita integrável.** O Meta Muse Image lançou em julho de 2026 como recurso de consumidor dentro dos apps da Meta; **não há API pública de edição de imagem**. O que foi aberto em preview é a API do Muse Spark, um modelo de raciocínio. O Gemini não oferece free tier de API para imagem.

**A conta destrói o modelo de negócio.** Com 3.000 fotos por evento e ticket de R$ 199:

| Opção | Por imagem | Por evento | Margem resultante |
|---|---|---|---|
| LUT no cliente | R$ 0 | **R$ 0** | 98% |
| FLUX schnell (o mais barato do mercado) | US$ 0,003 | ~R$ 50 | 73% |
| Imagen 4 Fast | US$ 0,02 | ~R$ 330 | **negativa** |
| Nano Banana 2 | US$ 0,08 | ~R$ 1.320 | **negativa** |

Mesmo a opção mais barata consome um quarto da margem — e é um modelo generativo rápido, não um restilizador de qualidade. O custo marginal por evento sairia de menos de R$ 3 para dezenas ou centenas de reais, virando de longe o maior custo do produto.

**E o prompt não pede geração.** Lido linha a linha, cada frase descreve uma operação de cor:

| A frase | A operação |
|---|---|
| "flash fill that opens shadows" | levantar o ponto de preto |
| "reduced contrast in the near-field" | curva de contraste suavizada |
| "cool-green bias in midtones" | curva de canal verde ponderada pelos médios |
| "slightly warm reds, clean blues" | saturação por canal |
| "wide exposure latitude" | ombro de compressão nas altas |
| "specular pop on surfaces facing camera" | halação nos brilhos |
| "neutral-cool density floor" | tinta fria nas sombras |
| "visible but controlled film grain" | ruído de luminância ponderado |

É uma **tabela de cor**, não uma transformação generativa.

## Decisão

**1. O visual sai de LUT no cliente. Sempre.**

Canvas 2D com curvas, operações por canal, grão e halação — exatamente o que o §6.1 da arquitetura já havia escolhido. Implementado e verificável em [`../design/fluxos-principais.html`](../design/fluxos-principais.html) (preset "35 mm").

**1a. O catálogo é paramétrico, com intensidade e ajustes.**

Filtro não é string fixa: cada um é um conjunto de sépia, saturação, matiz, brilho e contraste, o que permite **intensidade contínua de 0 a 100** em vez de liga/desliga. Por cima entram quatro ajustes manuais — Luz, Calor, Contraste e Vinheta.

| Filtro | Registro |
|---|---|
| Original | sem transformação |
| **35 mm** | negativo com flash fill — **o único em canvas**, não CSS |
| Amanhecer · Brasa · Vinho | quentes, em três densidades |
| Prata · Névoa · Madrugada | monocromático, lavado e frio |

Cada miniatura da tira mostra **a foto do próprio convidado** com o filtro aplicado, nunca uma imagem genérica. É o que torna a escolha instantânea, e é o padrão que o Instagram estabeleceu.

**Os noivos escolhem um recomendado**, que ganha selo e primeiro lugar na tira — **nunca pré-aplicado**. Coerência do acervo por convite, não por imposição: aplicar sozinho seria mais eficaz e tiraria a escolha de quem tirou a foto.

**2. IA generativa nunca toca a mídia do convidado.** Sem restilização, sem remoção de objeto, sem preenchimento, sem upscale generativo.

**3. IA de classificação é bem-vinda, desde que fora do caminho crítico.**

## Por que LUT vence, além do custo

Quatro razões, e a terceira sozinha já decidiria.

**Latência e offline.** O caminho crítico é sábado às 20h com 4G ruim, e a regra é que só storage e banco são dependências duras. Uma API de imagem é um terceiro com latência de segundos a minutos — e a fila offline, que é o que decide a H1, não pode depender de rede para aplicar um preset. LUT roda em milissegundos, no aparelho, sem sinal.

**🔴 Consistência — a razão que decide.** A tese do produto é coerência de identidade em todas as peças: placa, cards, telão, álbum, livro. Uma IA generativa produz uma *interpretação levemente diferente de cada foto*. Aplicada em 3.000 fotos, o álbum deixa de parecer um rolo de filme e passa a parecer 3.000 decisões independentes. **A IA quebraria exatamente a coerência que o produto vende.** Uma LUT aplica a mesma transformação a todas.

**Integridade da memória.** IA generativa altera o que aconteceu — muda rosto, remove pessoa, inventa detalhe. Num álbum de casamento isso é problema de memória e problema jurídico: o produto já difunde imagem de terceiros que não a enviaram ([`../security.md`](../security.md)), e alterar a aparência de alguém sem consentimento agrava a exposição, não a reduz. O convidado consentiu que a foto dele fosse usada, não que fosse reescrita.

**Direitos.** Restilizar por modelo de terceiro coloca a mídia do convidado dentro do pipeline de um fornecedor externo, com termos próprios. Sem isso, a foto nunca sai do R2.

## Onde a IA ganha lugar de verdade

O orçamento de IA existe — só está no lugar errado. Ele deve ir para **classificação**, que é 100 a 1.000× mais barata que geração e roda uma vez por evento, fora do request.

**Curadoria do livro de fotos** ([produto §14.8](../product/albora-produto-arquitetura.md)) — *"o problema real não é montar o livro, é escolher 60 fotos entre 1.500. É aqui que vira mágica."* É a maior oportunidade de IA do produto, e a maior parte dela **nem precisa de modelo**:

| Tarefa | Método | Custo |
|---|---|---|
| Duplicata e quase-duplicata | hash perceptual | R$ 0 |
| Foto tremida ou desfocada | variância de laplaciano | R$ 0 |
| Exposição ruim | histograma | R$ 0 |
| Diversidade de momento e cobertura de convidados | embedding barato | ~R$ 2/evento |

**Moderação** ([arquitetura §9](../architecture.md)) — classificador no thumb, antes de liberar para o telão. Já planejado, já fora do caminho crítico.

Ambos rodam pós-evento ou assíncronos, uma vez por mídia, com modelos de classificação. É onde a mágica está, e cabe no orçamento.

## Consequências

**Positivas** — o preset fica gratuito, instantâneo, offline e idêntico em todas as fotos. O custo marginal por evento continua abaixo de R$ 3 e a margem de 98% sobrevive. Nenhuma mídia de convidado sai da nossa infraestrutura.

**Custo assumido** — LUT não faz o que IA faz. Não remove um copo da mesa, não conserta uma foto queimada, não muda o fundo. Se um dia isso for pedido, entra como **ferramenta do anfitrião, sob demanda, foto a foto, no pós-evento e no plano pago** — nunca em lote, nunca no fluxo do convidado, nunca no caminho crítico. Nessa forma o custo é por foto escolhida, na casa de centavos, e não por acervo.

**Reavaliar quando** — o custo de restilização cair abaixo de ~US$ 0,0003 por imagem (dez vezes mais barato que o piso de hoje), **ou** surgir um modelo determinístico que aplique a mesma transformação a um acervo inteiro. O segundo importa mais que o primeiro: sem determinismo, o preço não resolve o problema de coerência.

## Fontes

- [Meta Muse Image — o que desenvolvedores podem usar hoje](https://www.developersdigest.tech/blog/meta-muse-image-developer-guide)
- [Comparativo de preços de API de imagem, 2026](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026)
- [Melhores APIs image-to-image, 2026](https://fal.ai/learn/tools/best-image-to-image-apis-2026)
