# DESIGN.md — Albora

> Linguagem visual do Albora, em formato legível por agentes de design.
> **Companheiro de [`CLAUDE.md`](./CLAUDE.md)** (como construir) — este arquivo é como deve parecer e soar.
> Fundamentação: [`docs/adr/0003-runtime-token-resolution.md`](./docs/adr/0003-runtime-token-resolution.md)

---

## ⚠️ Leia isto antes de qualquer coisa: a marca é a moldura, o evento é o quadro

O Albora é um caso incomum. **Não existe uma identidade visual — existem milhares.**

Cada evento carrega os próprios `identity_tokens` (paleta, tipografia, monograma), definidos pelo casal, e eles **assumem a interface**. A identidade do Albora é o recipiente neutro e quente que fica bem com qualquer cor por cima. Por isso a marca não tem cor forte dominante.

Consequência prática para qualquer agente gerando tela:

| | Regra |
|---|---|
| ✅ | Todo valor visual sai de token. Sem exceção |
| ✅ | Tokens marcados **DO EVENTO** são placeholders — o valor real chega em runtime |
| ❌ | **Nenhum hex literal em componente.** Um hex hardcodado é um lugar onde a identidade do casal não propaga — é bug de produto, não de estilo |
| ❌ | Nenhum componente assume que o acento é âmbar |

A presença da marca Albora varia por superfície e isso é deliberado:

| Superfície | Presença da marca |
|---|---|
| Admin do anfitrião | Alta — é o produto dele |
| Convidado | **Quase nula** — só rodapé. A foto é a interface |
| Telão | **Zero** — só a identidade do evento |
| Papelaria impressa | Assinatura discreta no rodapé |

---

## 1. Tema visual e atmosfera

**Delicado e chique, com ofício de produto moderno.**

Duas metades, e as duas importam:

- **O ofício** vem de produtos como Dia e Raycast: profundidade real, movimento com física, micro-interação em tudo, alinhamento óptico obsessivo, nada inerte.
- **O registro** vem do casamento: filete fino, muito ar, serifada leve em tamanho grande, âmbar como metal.

O que **não** vem dessas referências é o gênero. Chrome escuro de tom frio, gradiente neon, orbe pastel, sans geométrica como display, translucidez — tudo isso é vocabulário de produto de software, e o Albora não é um. **Glassmorphism é anti-padrão explícito**, não escolha de gosto.

A referência visual central é **hot stamp sobre papel escuro**: um convite impresso em cartão preto com filete quente em relevo. Delicadeza vem de **peso baixo em tamanho grande e muito espaço negativo** — nunca de baixar contraste, porque a pessoa está no escuro com o celular na mão errada.

O nome vem de *álbum* com o som de *alvorada*. A festa acaba de madrugada, e a paleta encena isso: base **noite**, acento **âmbar** — a luz do amanhecer.

### Referências

| Superfície escura (convidado, telão) | O que puxar |
|---|---|
| Le Labo, Byredo | Restrição de boticário. Quase tudo é tipografia e filete |
| Noma, Frantzén | Fotografia em luz baixa como protagonista; cromo que some |
| Single malt de luxo | Dourado como metal sobre escuro, nunca como preenchimento |

| Superfície clara (admin, landing) | O que puxar |
|---|---|
| Aesop | Neutros quentes, serifada, espaço generoso, nenhuma decoração |
| Cereal Magazine | Tipo grande e leve, margens absurdas |
| Kinfolk, Frama | Ritmo editorial, paleta abafada, textura quente |

| Registro de versalete e romano | O que puxar |
|---|---|
| Papelaria de casamento em letterpress | O gesto do rótulo e do numeral |
| Santa Maria Novella, programa de ópera | Versalete com tracking largo como estrutura |

> **Teste para qualquer referência nova: se ela poderia ilustrar um SaaS, descarte.** É a versão de interface do teste que a marca já aplica à direção de imagem.

#### Referências da própria categoria — ler com cuidado

Sites de casamento e de fotógrafo têm coisas boas, sempre misturadas ao clichê que o §7 bane. A leitura precisa ser cirúrgica:

| Pegar | Deixar |
|---|---|
| **Foto sangrando dentro de moldura recuada** — dá sensação de página impressa | **Fonte script / caligráfica** sobre a foto |
| **Versalete de tracking largo** acima do título, sobre a imagem | **Monograma de coração, aliança ou pombinha** |
| **Cópias impressas espalhadas** com borda branca e leve rotação | **Creme `#F4F1EA` + serifada + dourado** — é a paleta padrão de IA |
| **Cartão de recado colado**, para legenda de convidado | **Estrelinhas ✦** como separador — ornamento sem significado |
| Cromo mínimo, centrado, deixando a foto trabalhar | **"Precious moments" / "story worth telling forever"** — o clichê que a marca bane |
| | **Mockup de câmera ou celular flutuando** em fundo limpo |

O padrão: **as ideias estruturais da categoria costumam prestar; a superfície dela, quase nunca.**

#### Três regras herdadas que foram refinadas, não adotadas

| A regra como veio | Como fica, e por quê |
|---|---|
| "Sem sombra em card — Apple abandonou" | Verdade para card de **UI**; falso para **objeto físico**. Cópia impressa, placa A4 e cartão de recado precisam de sombra: representam papel, e sem ela viram retângulo colado |
| "Telão: zero UI, sem nome" | O nome fica, **discretíssimo** — versalete a 72% de opacidade. É o mecanismo de recrutamento: "olha, é a foto do Tio João" faz a mesa pegar o celular ([`docs/flows.md` N10.6](./docs/flows.md)). Remover ganharia pureza e custaria participação |
| "Cantos em pílula viram app infantil" | Pílula **fica**. Ela sinaliza alvo tátil com mais força que raio 12px, e no fluxo do convidado sinalizar vale mais que refinar. O premium vem do peso da tipografia e do espaço, não do raio |

**Quem está usando isto:** uma pessoa de pé, no escuro, às 22h, com um copo na outra mão, num salão com 4G ruim. Não está lendo. Está agindo. O design responde a isso com alvos grandes, uma decisão por tela e zero ornamento que peça atenção.

**Temperatura:** quente em tudo. Cinza puro é proibido; todo neutro tem viés para o âmbar. Preto puro (`#000`) nunca — a tinta é `#1A1613`, um preto quente.

**O que este produto não é:** app social, ferramenta de produtividade, marca de luxo, plataforma de tecnologia. Engajamento durante o evento é **anti-objetivo** — se os convidados passarem a festa rolando feed, a noiva odeia o produto.

---

## 1b. A marca — pack em [`brand/`](./brand/)

46 arquivos: 28 estáticas, 9 animadas, 5 ícones. Abra [`brand/index.html`](./brand/index.html) para ver tudo.

### Duas famílias, e quando usar cada uma

| | Quando |
|---|---|
| **Ponto** (`logo-*`, `marca-*`) | **Padrão.** Sóbrio, atemporal, sobrevive a qualquer redução |
| **Estrela** (`logo-estrela-*`, `marca-estrela-*`) | Expressivo. Capa de álbum, avatar social, papelaria, camiseta, selo |

A estrela é o estado de flash da animação, congelado. Ponto quando quiser silêncio; estrela quando quiser calor.

### 🔴 Dois limites de tamanho que não se negocia

| Limite | Regra |
|---|---|
| **Estrela abaixo de ~40px** | A cintura do losango fecha e vira borrão. **Favicon e ícone pequeno usam sempre o ponto** |
| **Símbolo abaixo de 32px** | O traço fino some e o degradê vira cor chapada. Use `marca-plana-*`, nunca `marca-degrade` |

### Qual arquivo, onde

| Contexto | Arquivo |
|---|---|
| Fundo noite — padrão | `logo-degrade-escuro.svg` |
| Fundo papel | `logo-degrade-claro.svg` |
| Uma cor sobre escuro · hot stamp negativo | `logo-mono-papel.svg` |
| Uma cor sobre claro · gráfica | `logo-mono-tinta.svg` |
| Espaço estreito e vertical | `logo-empilhado-*.svg` |
| Primeiro contato, apresentação | `logo-descritor-escuro.svg` |
| Símbolo acima de 32px | `marca-degrade.svg` |
| Símbolo abaixo de 32px, impressão de uma cor | `marca-plana-*.svg` |

### Animadas

| Arquivo | Onde | Duração |
|---|---|---|
| `logo-animado-estrela.svg` | **Splash do app, abertura de vídeo** | 2,0 s |
| `logo-animado-sem-estrela.svg` | Abertura sóbria, contexto formal | 1,9 s |
| `splash-animado.svg` | Splash mobile, formato vertical | 2,0 s |
| `loader.svg` | Carregando indeterminado | 2,1 s em loop |
| `loader-progresso.svg` | **Progresso real de upload** — arco controlado por JS | — |

O `loader-progresso` é o componente certo para a fila de upload: o arco preenche conforme a foto sobe, e o gesto é o mesmo da marca nascendo.

**A animação conta a marca:** o arco se traça, o ponto nasce **por baixo do horizonte** (com máscara de recorte) e assenta com sobressalto, o nome surge. É "a foto amanhece" ([§13.7](./docs/product/albora-produto-arquitetura.md)) executado no próprio logotipo.

⚠️ **Ao embutir SVG animado numa página, prefixe classes e ids.** Eles são globais no documento. O `logo-animado-*` usa `.flash`, que colide com o flash da câmera no fluxo do convidado — sem prefixo, embutir a marca desliga o flash da captura, sem aviso.

### Ícones

`icone-app-512.svg` · `icone-app-invertido-512.svg` · `favicon.svg` · `favicon-mono.svg`

Exporte PNG a partir do 512 para as lojas. **Não arredonde os cantos** — o sistema operacional aplica a máscara.

## 2. Paleta de cores e funções

### Cores da marca — FIXAS

```css
--papel: #FAF7F2;  /* base clara — admin, marketing, papelaria */
--tinta: #1A1613;  /* texto sobre claro. Preto quente, nunca #000 */
--noite: #14100E;  /* base escura — convidado, galeria, telão */
--ambar: #E8873A;  /* acento único, com parcimônia */
--brasa: #C2410C;  /* acento raro — erro, destaque crítico */
```

**Por que âmbar:** a categoria inteira do mercado é verde sage + rosa blush + fonte script. Âmbar lê como calor, festa e Brasil — e convive com qualquer paleta de evento sem brigar.

### 🔴 Só existem cinco cores. Todo neutro é opacidade

Nenhum cinza novo entra na paleta. Todo tom intermediário é `--tinta` ou `--papel` com opacidade:

```css
--tinta-76: rgba(26,22,19,.76);   --papel-76: rgba(242,235,226,.76);
--tinta-50: rgba(26,22,19,.50);   --papel-50: rgba(242,235,226,.50);
--tinta-16: rgba(26,22,19,.16);   --papel-16: rgba(242,235,226,.16);
```

**É esta regra que mantém a interface quente.** Derivar rampas de hex (`#6E635A`, `#A99C90`) parece equivalente e não é: a cada passo a temperatura escorre um pouco, e três telas depois a paleta virou cinza de produto. Opacidade sobre a base não tem como desviar.

### 🔴 O chão: escuro é o principal, e os noivos podem trocar

| | |
|---|---|
| **Padrão do convidado** | `noite` — e a razão é física, não estética |
| **Quem pode trocar** | O casal, como token do evento (`--event-ground`) |
| **Quem nunca troca** | O convidado. Não existe alternador no fluxo dele |
| **O que nunca troca** | **O telão.** Sempre `noite` |

**Por que escuro é o padrão:**

1. **A pupila.** Tela branca às 22h num salão escuro contrai a pupila; a pessoa tira a foto e fica sem enxergar a festa. É por isso que todo app de câmera é escuro.
2. **A foto é a interface.** Foto em fundo escuro lê mais brilhante e saturada; fundo claro achata a imagem pelo entorno.
3. **Bateria.** OLED com fundo escuro ao longo de seis horas. O convidado chega à meia-noite com 20% — e é aí que saem as melhores fotos.
4. **Contraste.** Âmbar é seguro sobre `noite` e **falha** sobre `papel`.
5. **A marca.** Âmbar sobre noite *é* Albora.

**🔴 Trocar o chão re-deriva o acento automaticamente.** Não é trocar uma cor, é trocar um conjunto. Sobre `papel`, todo acento de evento usa a variante escurecida — senão a interface inteira reprova contraste, e essa validação é trabalho do sistema, nunca escolha do casal.

```
noite   →  âmbar #E8873A · jardim #5C8262 · ameixa #9B6BA8 · marinho #4E8CA0
papel   →  âmbar #A34F16 · jardim #3C5C42 · ameixa #6E3F78 · marinho #2F6070
```

**O telão fica fora da escolha.** Projetor com fundo branco em salão escuro cega a plateia e lava a foto.

### Modelos de identidade

O casal escolhe um modelo, e ele carrega **quatro coisas de uma vez**:

| Modelo | Acento | Display | Filtro recomendado | Modelo de telão |
|---|---|---|---|---|
| Amanhecer | âmbar | Fraunces | 35 mm | Polaroide |
| Jardim | verde botânico | serifada de texto | Névoa | Mural |
| Ameixa | ameixa | serifada de contraste alto | Vinho | Colagem |
| Marinho | azul-petróleo | serifada humanista | Madrugada | Ambiente |

Verde e ameixa são banidos **na marca** (§7) e perfeitamente válidos **como token de evento** — é exatamente a distinção que o [ADR 0003](./docs/adr/0003-runtime-token-resolution.md) estabelece.

### Modo duplo — contexto de uso, NÃO preferência do usuário

```
CLARO (papel)  → admin, marketing, papelaria impressa. Editorial, espaçoso, tátil
ESCURO (noite) → convidado, galeria, telão. A festa é à noite; foto brilha no escuro
```

**Não existe toggle de tema em nenhuma superfície.** O convidado usa o produto às 22h no escuro — tela clara nesse momento é agressiva. O admin trabalha de dia e a papelaria vai para gráfica.

### Escala semântica — claro (base `papel`)

```css
--bg:          #F3EEE6;   /* fundo de página */
--surface:     #FAF7F2;   /* card, superfície elevada */
--surface-2:   #FFFDF9;   /* elevação máxima */
--line:        #E2D9CD;   /* divisor, borda */
--ink:         #1A1613;   /* texto primário */
--ink-2:       #6B5F55;   /* secundário */
--ink-3:       #9C8E82;   /* terciário, placeholder */
--accent:      #E8873A;   /* preenchimento, não texto */
--accent-text: #A34F16;   /* âmbar escurecido — o único seguro para texto */
--critical:    #C2410C;
```

### Escala semântica — escuro (base `noite`)

```css
--bg:          #14100E;
--surface:     #1E1916;   /* elevação vem daqui, não de sombra */
--surface-2:   #29221D;
--line:        #302823;
--ink:         #F2EBE2;
--ink-2:       #A99B8E;
--ink-3:       #7A6D62;
--accent:      #E8873A;   /* seguro para texto sobre noite */
--accent-text: #E8873A;
--critical:    #E06A3C;   /* brasa clareada — brasa puro some no escuro */
```

### 🔴 Regra de contraste que mais se erra

**Âmbar `#E8873A` NÃO é seguro para texto sobre `papel`.** O contraste fica em torno de 2,4:1. Sobre fundo claro, âmbar serve para preenchimento, barra de progresso, borda e ícone grande — nunca para texto corrido nem rótulo pequeno. Para texto, use `--accent-text` (`#A34F16`).

Sobre `noite`, âmbar é seguro para texto e é o acento pleno.

### Tokens DO EVENTO — sobrescrevíveis em runtime

| Token | Fallback | Substituído por |
|---|---|---|
| `--event-accent` | `--ambar` | Cor primária do casal |
| `--event-accent-2` | `--brasa` | Cor secundária |
| `--event-display` | Fraunces | Fonte de display do casal, do catálogo licenciado |
| `--event-ground` | `--noite` / `--papel` | Base, se o casal escolher |
| `--event-monogram` | símbolo Albora | Monograma do casal |

Cadeia de resolução: **evento → pack → marca**. Um resolvedor único alimenta web, telão e o pipeline SVG→PDF de impressão. Nenhum renderizador implementa o seu — se divergirem, a placa impressa não combina com o telão, e essa coerência **é** o produto.

**Validação:** tokens vêm de dado do usuário. Valide contra conjunto fechado — formato de cor, fontes do catálogo licenciado, escala de raio. Token não é instrução.

---

## 3. Regras de tipografia

| Papel | Fonte | Origem |
|---|---|---|
| Display **e rótulo** | **Fraunces** | Google Fonts · OFL · variável |
| Texto / UI | **Inter** | Google Fonts · OFL |
| Dado tabular | Mono do sistema | `ui-monospace, SF Mono, Menlo` |

**Ambas são OFL, portanto livres para uso comercial E impressão.** Isso não é detalhe: convite e papelaria vão para gráfica, e é exatamente onde fontes proprietárias não podem ir. **Nenhum substituto é necessário** — use as reais.

Fraunces é variável. Use `opsz` casado ao tamanho real, `SOFT` moderado e `WONK` **apenas** em display grande — o "wonk" nos tamanhos pequenos vira ruído.

### 🔴 A superfície decide o peso

Delicadeza e legibilidade puxam para lados opostos, e a resolução não é escolher uma — é atribuir cada uma à superfície certa.

| Superfície | Peso do display | Governa | Por quê |
|---|---|---|---|
| Landing, admin | **300** | contenção editorial | luz boa, leitura sentada, é onde "chique" converte |
| Convidado, telão | **500** | legibilidade | 22h, no escuro, celular na mão errada, brilho baixo |

> **O teste que decide qualquer dúvida no fluxo do convidado:**
> *a tia de 58 anos, às 22h, não pode achar a tela elegante demais para mexer.*

Isso vale além do peso. Na superfície do convidado, filete sobe para 13–16% de opacidade (não 7%), rótulo para 50% (não 30%), corpo de texto para 76% (não 62%), e o alvo mínimo é 58px. **Delicadeza nunca é paga com contraste** — e no fluxo do convidado ela cede espaço para o óbvio.

### 🔴 Delicadeza vem de peso baixo em tamanho grande

É a regra que mais decide se a interface lê **chique** ou **simpática**.

> Uma frase em Fraunces 300 num corpo de 36px lê delicada.
> A mesma frase em 500 num corpo de 27px lê robusta e acolhedora.

Casamento pede a primeira. Sempre que houver dúvida entre aumentar o corpo ou aumentar o peso: **aumente o corpo e baixe o peso.**

**Peso máximo do Fraunces: 500**, e só na superfície do convidado. Landing e admin ficam em **300**. Acima de 500 vira decorativo e briga com a foto.

**A regra do tamanho mínimo, corrigida:** nunca Fraunces em **caixa baixa** abaixo de 20px — o caráter some e a legibilidade cai. Em **versalete com tracking ≥ 0,20em** ela funciona a partir de 8,5px, e é justamente o rótulo da casa.

### Escala

Display usa razão 1,24 (dramática, poucos passos). Texto usa 1,13 (fina, para hierarquia sutil).

```css
/* Fraunces 300 — o que emociona */
--d-hero:    70px;  /* line-height 1.10 · tracking -0.014em */
--d-page:    46px;  /* 1.16 · -0.012em */
--d-screen:  36px;  /* 1.17 · -0.012em */
--d-section: 29px;  /* 1.17 · -0.012em */
--d-inline:  20px;  /* 1.32 · -0.008em */

/* Fraunces 400 — o rótulo da casa */
--l-label:   11px;  /* 1.30 · tracking +0.28em · UPPERCASE */
--l-micro: 10.5px;  /* 1.30 · tracking +0.20em · UPPERCASE */

/* Inter 400 — o que informa */
--t-lede:    18px;  /* 1.72 */
--t-body:  16.5px;  /* 1.68 */
--t-ui:      15px;  /* 1.60 */
--t-small:   14px;  /* 1.68 */

/* Mono — só dado tabular no admin */
--m-data:  12.5px;
```

Repare que o corpo de texto tem entrelinha **1,68**, não 1,5. Ar entre linhas é metade da delicadeza.

### 🔴 O rótulo é versalete serifado, nunca mono

```css
font-family: Fraunces; font-size: 11px; font-weight: 400;
letter-spacing: .28em; text-transform: uppercase;
```

**Mono é sinal de tecnologia.** Num produto de festa, versalete serifado com tracking largo é o mesmo gesto na linguagem de convite e papelaria — e amarra a tela à peça impressa, que é o arco inteiro do produto.

Mono sobrevive em **um** lugar: dado tabular no admin, onde números precisam alinhar em coluna. Em nenhum outro.

### Numeração romana nas missões

`MISSÃO 03` lê como sistema. `Missão III` lê como convite. Vale para tela, card impresso e telão. A data na papelaria segue a mesma lógica: `XIV · XI · MMXXVI`.

Numeral arábico fica onde é quantidade real — "6 de 10", contadores, verificações do admin.

### A regra de hierarquia

**Serifada carrega o que emociona E o que rotula. Sans fica onde precisa desaparecer.**

- Fraunces 300: nome do casal, texto da missão, confirmação, título, o campo de nome
- Fraunces 400 versalete: `ANA & JOÃO`, `MISSÕES`, `ENVIADA`, numeral romano
- Inter: corpo, descrição, botão — tudo operacional

Hierarquia por função e por espaço, nunca empilhando negrito.

### Detalhes

- Texto corrido próximo de **58–65 caracteres** de largura
- `text-wrap: balance` em todo título
- `font-variant-numeric: tabular-nums` em qualquer dígito que se alinhe em coluna
- **Itálico do Fraunces é recurso expressivo**, não ênfase. Use na segunda linha de um par ("Tira foto. / *A gente cuida do resto.*"), no nome do evento no telão, no placeholder. Nunca em texto corrido

---

## 4. Estilos de componentes

### 🔴 O princípio que governa todos: filete, não caixa

Superfície preenchida é peso visual. Num produto onde **a foto é a interface**, o cromo precisa ceder — então componente se define por **um filete de 1px**, não por um retângulo com fundo.

Card com fundo sobrou em um lugar: o admin no modo claro, onde não há foto competindo.

### Botão

```
Primário   fundo --accent · texto #15100A · raio 100px
           min-height 54px · padding 16px 22px
           Inter 15px / peso 500 / tracking +0.05em
Hairline   transparente · borda 1px --ink a 13% · texto --ink-2
           min-height 48px · peso 400
Admin      transparente · borda 1px --ink · texto --ink
           hover inverte para fundo --ink
```

Peso **500 com tracking aberto**, nunca 600 apertado — 600 lê como botão de aplicativo, 500 espaçado lê como convite.

Altura mínima de toque: **54px no fluxo do convidado** (está de pé, no escuro), 48px no admin.
`:active` → `scale(.977)`. `:focus-visible` → contorno **1px** `--accent`, offset 4px. Contorno grosso quebra a delicadeza.

Botão diz exatamente o que acontece: **"Enviar"**, depois **"Enviada"**. Nunca "Confirmar ação".

### 🔴 Botão: o primário muda de cor conforme o chão

| Superfície | Primário | Secundário |
|---|---|---|
| **Clara** (landing, admin) | `--tinta` sólido, texto `--papel` | transparente, contorno 1px a 16% |
| **Escura** (convidado) | `--event-accent` sólido, texto quase preto | transparente, contorno 1px a 18% |

**No claro o primário é preto sólido, nunca âmbar.** Duas razões: âmbar reprova contraste sobre `papel`, e âmbar é metal — filete, não superfície grande. Preenchimento sólido cabe ao preto quente.

**Proporção:** largo e contido — 50px de altura com 34px de padding horizontal. Alto e estreito lê como botão de formulário.

**Sem ícone dentro do botão.** Disco com seta, chevron, glifo — tudo isso polui e, repetido em cada botão, para de significar qualquer coisa. Rótulo sozinho.

**Tracking zero.** Espaçamento de letra em rótulo curto de sans só afrouxa a palavra. O tracking largo pertence ao versalete, não ao botão.

**Sem sombra no primário sólido.** Cor cheia já tem presença; sombra grande deixa pesado.

### Campo de texto — só um filete embaixo

```
sem fundo · sem borda · sem raio
border-bottom 1px --ink a 17%
padding 10px 2px 14px
foco: border-bottom vira --accent (transição 300ms)
placeholder: itálico, --ink a 18%
```

**O campo de nome usa Fraunces 300 em 30px, não Inter.** É a única entrada de texto do fluxo do convidado, e escrever o próprio nome em serifada grande sobre uma linha faz o gesto parecer **assinar**, não preencher cadastro. É a assinatura tipográfica do produto.

### Superfície

```
claro (admin)  fundo --surface · borda 1px --hair · raio 18px · sombra e2
escuro (guest) SEM fundo, SEM borda de caixa.
               Separação por filete horizontal --ink a 7–9%
```

Raios: **18px** em superfície de admin, **20px** em mídia (visor, foto), **100px** em botão. Nada de escada de seis raios — três bastam e a consistência é o que lê como sistema.

### Item de missão

```
sem fundo · border-bottom 1px --ink a 7%
grid 34px | 1fr | 12px
numeral romano: Fraunces 10,5px · tracking +0.20em · --accent
texto: Fraunces 300 · 17px · line-height 1.36
chevron: --ink a 22%, desliza 3px e vira --accent no hover
cumprida: opacidade 30%, numeral perde o acento, chevron vira ✓
```

### Preset / chip — sublinhado, não pílula

```
sem fundo · sem borda de caixa
Fraunces 10,5px versalete · tracking +0.20em
border-bottom 1px transparente → --accent quando ativo
gap de 22px entre itens
```

Pílula preenchida é vocabulário de aplicativo. Sublinhado é vocabulário de menu impresso.

### Progresso — filete, não barra

Um segmento por missão. **1,5px de altura**, 4px de gap, **sem raio**. Preenchido em `--accent`, vazio em `--ink` a 12%.

**Nunca porcentagem numérica** — o convidado não está completando formulário.

### Checkbox — círculo, não quadrado

Círculo de 19px com borda de 1px. Marcado preenche um disco âmbar de 9px no centro, com transição de 260ms. Sem ícone de "check": o disco é mais silencioso e mais chique.

### Cópia impressa — a foto como objeto físico

A unidade de exibição da superfície **clara** (landing, admin, papelaria) não é um card: é uma **cópia impressa**.

```
fundo #FDFBF7 · padding 9px 9px 30px (margem inferior maior, como revelação)
raio 2px · sombra dupla quente
rotação entre -7° e +5.5° · sobreposição por margem negativa
legenda em versalete 8,5px sob a foto
hover: rotação a 0°, sobe 8px, sombra abre
```

**Por que isso e não grade:** o arco do produto termina em **livro impresso**, e o que os convidados mandam é literalmente uma pilha de instantâneos. A metáfora é verdadeira, não decorativa — e diferencia de todo concorrente, que exibe grade.

**A regra que impede virar bagunça:** a pilha é **arranjada**, nunca aleatória. Rotação e ordem de empilhamento são valores fixos por posição. Rotação aleatória em runtime lê como gerado por máquina, que é o oposto do efeito desejado.

Companheiro: o **cartão de recado**, para legenda de convidado — fundo `#F6F0E4`, fita âmbar translúcida no topo, rotação de 1,6°, texto em serifada 300 com assinatura em versalete.

### Herói de landing — moldura recuada, foto sangrando

Foto em `16/10` dentro de moldura recuada (não sangra até a borda da janela), com scrim vertical, versalete de **tracking 0,42em** acima e o título em Fraunces 300 por cima da imagem.

O recuo é o que dá sensação de **página impressa** em vez de site. Nunca use fonte script no lugar do Fraunces aqui, por mais que a categoria inteira use — é anti-padrão do §7.

### 🔴 Presets de foto — LUT no cliente, nunca IA generativa

O preset é uma **tabela de cor** aplicada em canvas: curvas, operações por canal, grão e halação. Decisão vinculante em [ADR 0007](./docs/adr/0007-ai-policy-luts-not-generation.md).

O catálogo, com **oito filtros, intensidade contínua e quatro ajustes** — no padrão do Instagram:

| Preset | Registro |
|---|---|
| **Original** | sem transformação |
| **35 mm** | negativo com flash fill — o único em canvas, não CSS |
| **Amanhecer** | quente, claro, dourado |
| **Brasa** | quente, denso, saturado |
| **Prata** | monocromático com contraste elevado |
| **Névoa** | lavado, baixo contraste, arejado |
| **Vinho** | quente profundo, saturado, denso |
| **Madrugada** | frio, contido |

**Os filtros são paramétricos, não strings fixas** — cada um é um conjunto de sépia, saturação, matiz, brilho e contraste. É isso que permite **intensidade contínua de 0 a 100** em vez de liga/desliga.

**Ajustes manuais** entram por cima do filtro: Luz, Calor, Contraste e Vinheta. A vinheta é camada radial real, não truque de contraste.

**Cada miniatura da tira mostra a foto do próprio convidado** com aquele filtro aplicado — nunca uma imagem genérica de exemplo. É o que torna a escolha instantânea.

### 🔴 O filtro recomendado pelos noivos

O casal escolhe um filtro no admin. Na tira do convidado ele ganha **selo, nome em destaque e primeiro lugar**.

*Por quê:* se metade dos convidados aceitar a sugestão, o acervo inteiro fica parecendo um rolo só — que é a coerência que o produto vende, obtida **por convite em vez de imposição**. Forçar o filtro seria mais eficaz e destruiria a espontaneidade que é o resto da tese.

Anatomia do 35 mm, que é o mais elaborado:

```
ombro nas altas       c / (1 + c·0.20) · 1.20    latitude do negativo
flash fill            c · (1−0.055) + 0.055      abre as sombras
contraste             0.5 + (c−0.5) · 0.88       near-field suave
viés verde-frio       g += 0.022 · 4c(1−c)       só nos médios
piso frio             b += 0.014 · sombra        density floor
saturação             lum + (c−lum) · 0.93       moderada, vermelhos ×1.045
grão                  ±15/255 · (0.45 + médios)  visível, controlado
halação               brilhos borrados, lighter a 14%
```

**Por que não IA:** o preset precisa rodar **offline** (a fila é a fonte da verdade e não pode depender de rede) e precisa ser **idêntico nas 3.000 fotos**. Uma IA generativa produz uma interpretação diferente de cada foto — o álbum deixaria de parecer um rolo de filme e passaria a parecer 3.000 decisões independentes, quebrando exatamente a coerência que o produto vende. Some-se o custo: a opção mais barata do mercado custaria ~R$ 50 por evento contra R$ 0 da LUT.

O preset é aplicado **depois** da captura, sobre a foto boa da câmera nativa — nunca como preview ao vivo, que custaria qualidade de HDR e modo noturno.

---

## 5. Princípios de layout

**Escala de espaçamento** (base 4, ritmo crescente):
`4 · 8 · 12 · 16 · 20 · 26 · 34 · 44 · 56 · 72 · 96`

Grupos irmãos usam `flex`/`grid` com `gap`, **nunca** margem por elemento — margem colapsa ou dobra em silêncio.

**Composição do fluxo do convidado:** cada tela é uma coluna vertical com um espaçador elástico no meio. O conteúdo ancora no topo, a ação primária ancora no rodapé, e o vazio no meio é intencional — é o que faz o alvo ser inconfundível e o polegar chegar sem esticar.

**Uma ação primária por tela.** Nenhuma escolha secundária competindo. Se uma tela precisa de duas decisões, são duas telas.

**Densidade:** baixa no convidado (está de pé, no escuro), média no admin (está sentado, decidindo), zero no telão (a foto ocupa tudo).

Conteúdo largo — tabela, código, diagrama — recebe `overflow-x: auto` no próprio contêiner. A página nunca rola na horizontal.

---

## 6. Profundidade e elevação

**Profundidade vem de elevação, luz implícita e sombra quente. Nunca de blur, translucidez ou refração.**

```css
--e1: 0 1px 2px rgba(26,22,19,.18);
--e2: 0 24px 52px -22px rgba(26,22,19,.24);
--e3: 0 30px 64px -22px rgba(26,22,19,.38);
```

🔴 **A sombra é marrom-quente, nunca preta.** `rgba(0,0,0,…)` sobre `noite` simplesmente some, e sobre `papel` lê como sujeira cinza. O valor `rgba(26,22,19,…)` é a tinta da marca — é o que faz a sombra parecer parte da paleta em vez de um efeito aplicado por cima.

🔴 **No escuro, sombra quase não lê. A elevação vem da superfície clarear** (`--bg` → `--surface` → `--surface-2`). Empilhar sombra no escuro é desperdício de pintura; use a cor.

### 🔴 Âmbar é metal, não tinta

A regra que mais define se a superfície lê chique.

```
✅  filete de 1px · sublinhado · disco de 9px · numeral pequeno
    borda inferior de campo em foco · barra de progresso de 1,5px
❌  fundo de card · superfície grande preenchida · bloco de cor
```

A única exceção é o **botão primário**, que precisa de presença porque é a ação que decide a H1 num ambiente escuro.

A referência é **hot stamp sobre papel escuro** — e não é analogia solta: o §13.6 da marca já exige que o símbolo funcione em uma cor, em baixo relevo e em quente. A interface passou a obedecer o mesmo requisito da papelaria.

Âmbar raro é âmbar que vale alguma coisa.

### Fonte de luz implícita

No escuro, um halo âmbar quase invisível no alto da tela dá volume sem gradiente decorativo:

```css
background: radial-gradient(120% 46% at 50% -14%, rgba(232,135,58,.09), transparent 62%);
```

É o que produtos como o Raycast fazem com glow frio — aqui em **temperatura de vela**. A opacidade fica abaixo de 10%: se der para apontar onde está, está forte demais.

Adicione grão sutil (ruído SVG inline, opacidade ~4%, `mix-blend-mode: overlay`) sobre superfícies escuras grandes. Sem ele, um gradiente amplo faz banding em tela de celular ruim — e a textura combina com a direção de imagem, que pede grão e imperfeição.

### Movimento

**Existe em exatamente dois lugares: o telão e a confirmação do primeiro envio.** Todo o resto é parado.

```css
--ease: cubic-bezier(.32, .72, 0, 1);   /* física iOS */
--t-micro: 200ms;   /* hover, pressão, foco */
--t-pane:  420ms;   /* troca de tela */
--t-dawn: 1500ms;   /* a varredura */
```

**"A foto amanhece"** — o movimento assinatura. Uma varredura âmbar diagonal atravessa a imagem recém-chegada, como luz nascendo sobre ela, e se acomoda.

```css
background: linear-gradient(102deg,
  transparent 28%,
  rgba(255,212,152,.46) 47%,
  rgba(232,135,58,.20) 56%,
  transparent 72%);
transform: translateX(-118%) → translateX(118%);
easing: cubic-bezier(.38, 0, .2, 1);
```

Lenta e translúcida. A varredura anterior era mais rápida e mais opaca e lia como efeito; a 1500ms e 46% lê como **luz atravessando**, que é o que o nome promete.

Transição entre telas é **acomodação, não animação**: 7px de deslocamento e opacidade, nada mais. Sem bounce, sem elástico, sem escala. Honre `prefers-reduced-motion` desativando a varredura por completo.

---

## 7. O que fazer e o que não fazer

### ❌ Anti-padrões visuais — bloqueantes

Estes são proibições de produto, não preferência de gosto. A categoria inteira usa verde sage e rosa blush; usar também é desaparecer.

```
glassmorphism · neon · gradiente roxo · dark mode "tech"
fonte script · verde sage · rosa blush
ícone de aliança, pombinha ou coração
marca d'água na foto
```

Também evite os defaults genéricos de IA: creme quente `#F4F1EA` com serifada e terracota, hero com gradiente roxo-azul, emoji como marcador de seção, tudo centralizado, `rounded-lg` em tudo, barra de acento em card arredondado.

### ❌ Nunca

- Hex literal em componente
- Assumir que o acento é âmbar
- Âmbar como cor de texto sobre `papel`
- **Âmbar preenchendo superfície grande** — é metal, não tinta. Exceção única: o botão primário
- **Mono como rótulo** — mono é sinal de tecnologia. Versalete serifado no lugar
- **Pílula preenchida como chip ou filtro** — sublinhado, que é vocabulário de menu impresso
- **Fraunces acima de 400** — display fica em 300
- **Card com fundo na superfície escura** — filete, não caixa
- Toggle de tema em qualquer superfície
- Sombra preta pura
- Scroll infinito ou notificação no fluxo do convidado
- Contagem visível de curtida (ranking de popularidade num casamento é drama familiar garantido)
- Comentário em foto — não existe, em nenhuma fase
- Marca Albora no telão
- Identidade colorindo o QR Code (âmbar sobre noite é lindo no preview e **não escaneia** em luz baixa)

### ✅ Sempre

- Todo valor sai de token
- Uma ação primária por tela
- Alvo de 54px no fluxo do convidado
- Na dúvida entre corpo maior e peso maior: **corpo maior, peso menor**
- Filete no lugar de caixa
- Versalete serifado para rótulo; mono só em dado tabular do admin
- Numeral romano em missão e data de papelaria
- Sombra quente, ou elevação por cor no escuro
- A foto é a interface — o cromo cede espaço a ela

### Voz e copy

**Quente, direta, brasileira, sem ser boba.** Fala como uma amiga que entende de festa — não como software, não como marca de luxo. Segunda pessoa, frases curtas.

| Faça | Não faça |
|---|---|
| "Tira foto. A gente cuida do resto." | "Otimize a captura de memórias do seu evento" |
| "Seus convidados" | "Os participantes" |
| "Missão" | "Desafio gamificado" |
| "Foto 2 ✓ — já tá no telão" | "Upload concluído com sucesso" |
| "Como te chamamos?" | "Insira seu nome completo" |
| "Sem sinal. Suas fotos sobem sozinhas quando voltar." | "Erro de rede" |
| "Ainda não tem foto. Seja o primeiro." | "Nenhum conteúdo disponível" |

**Palavras da marca:** festa · convidados · noivos · missão · álbum · madrugada · amanhecer · dump · junto · todo mundo

**Palavras proibidas:** plataforma · solução · engajamento · experiência imersiva · inovador · disruptivo · **memórias eternas** · **momentos mágicos**

As duas últimas são o clichê padrão da categoria. Todo concorrente usa. Usar também é desaparecer.

Erro nunca expõe interno — sem código HTTP, sem stack, sem nome de tabela.

### Direção de imagem

Luz baixa e quente · mãos, celulares, telas acesas no escuro · grão, movimento, imperfeição · convidados brasileiros reais, de todas as idades.

**Nunca:** stock genérico de casamento · mockup de iPhone flutuando em fundo branco · casal genérico sorrindo em campo ensolarado · interface como protagonista.

> **Teste:** se a imagem poderia ilustrar qualquer plataforma de casamento do mercado, descarte.

---

## 8. Comportamento responsivo

**Mobile-first não é estilo, é o caso real.** 100% do fluxo do convidado acontece em celular, com uma mão, no escuro.

```
guest    360–430px   coluna única. Nunca há versão desktop
admin    de 390px    coluna única → 2 colunas a partir de 860px
telão    16:9 fixo   1920×1080 típico. O layout se adapta;
                     a foto NUNCA é cortada em rosto
landing  de 360px    coluna única → editorial a partir de 900px
```

**Alvos de toque:** 54px no convidado, 48px no admin. Espaçamento mínimo entre alvos: 8px.

**Zona do polegar:** a ação primária vive nos 30% inferiores da tela. Nada acionável no topo além do voltar.

**Teste em Android antigo e iPhone.** A tela do convidado precisa funcionar num aparelho de 2019 com bateria em 8% e modo de economia ligado.

---

## 9. Guia de instruções do agente

Ao gerar qualquer tela nova para o Albora, aplique nesta ordem:

1. **Identifique a superfície** → convidado (escuro, denso-baixo, marca quase nula) · admin (claro, editorial) · telão (escuro, zero cromo) · landing (claro, editorial).
2. **Puxe o par de tokens correto** para a base daquela superfície.
3. **Nomeie a única ação primária.** Se houver duas, divida em duas telas.
4. **Distribua a tipografia por função** — serifada emociona, mono informa, sans opera.
5. **Escreva a copy antes do layout.** As palavras são material de design; a caixa se ajusta ao texto, não o contrário.
6. **Confira contra a lista de anti-padrões** da §7 antes de considerar pronto.

### Auto-verificação obrigatória

- [ ] Zero hex literal fora do bloco de tokens
- [ ] Âmbar aparece só como filete, sublinhado, disco ou numeral — nunca preenchendo superfície (exceto o botão primário)
- [ ] Âmbar não é usado como texto sobre fundo claro
- [ ] Nenhum peso de Fraunces acima de 400; display em 300
- [ ] Nenhum rótulo em mono — versalete serifado com tracking ≥ 0.20em
- [ ] Missões e data de papelaria em numeral romano
- [ ] Nenhum card com fundo na superfície escura — filete de 1px
- [ ] Nenhuma sombra `rgba(0,0,0,…)`
- [ ] Sem blur, translucidez ou refração em lugar nenhum
- [ ] Alvo de toque ≥ 54px na superfície do convidado
- [ ] Contraste do corpo de texto **não** foi reduzido em nome da delicadeza
- [ ] Movimento aparece só no telão e na confirmação de envio
- [ ] Nenhum token do evento foi tratado como constante da marca
- [ ] A copy passa na tabela de voz e não usa palavra proibida
- [ ] `prefers-reduced-motion` desliga a varredura

### Prompts reutilizáveis

```
"Gere a galeria pós-evento seguindo o DESIGN.md do Albora — superfície
 do convidado, base noite, a foto é a interface, sem contagem de curtida."

"Gere os estados de falha do upload: sem sinal, fila pendente, envio
 falhado. Voz da tabela da §7 — nunca código de erro."

"Gere a landing de casamento — superfície clara, editorial, base papel.
 Hero: 'Seu fotógrafo não pode estar em todo lugar. Seus convidados podem.'"

"Varie o acento para um evento de paleta fria e prove que nenhum
 componente quebrou — é o teste da propagação de tokens."
```

O último prompt é o mais importante do arquivo. **Se trocar `--event-accent` quebra alguma tela, um hex vazou** — e cada hex vazado é um pedaço da identidade do casal que não propaga. Não é lint: é regressão da funcionalidade principal do produto.
