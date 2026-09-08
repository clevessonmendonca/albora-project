# Albora — Pack de marca

## Estrutura

```
estaticas/   28 arquivos — logotipo e símbolo
animadas/     9 arquivos — abertura, loaders
icones/       5 arquivos — app e favicon
```

## Duas famílias

| | Quando |
|---|---|
| **Ponto** (`logo-*`, `marca-*`) | **Padrão.** Sóbrio, atemporal, sobrevive a qualquer redução |
| **Estrela** (`logo-estrela-*`, `marca-estrela-*`) | Expressivo. Capa de álbum, avatar social, papelaria, camiseta, selo |

A estrela é o estado de flash da animação, congelado. Use quando quiser calor e brilho; use o ponto quando quiser silêncio.

⚠️ **A estrela é frágil embaixo.** A cintura fina do losango fecha por volta de 40 px — abaixo disso vira um borrão. Para favicon e ícone pequeno, sempre a versão com ponto.

## Qual usar

### Logotipo (símbolo + nome)

| Arquivo | Onde |
|---|---|
| `logo-degrade-escuro.svg` | **Padrão.** Fundo noite |
| `logo-degrade-claro.svg` | Fundo papel |
| `logo-mono-papel.svg` | Uma cor sobre escuro · hot stamp negativo |
| `logo-mono-tinta.svg` | Uma cor sobre claro · gráfica |
| `logo-mono-ambar.svg` | Fundo neutro, marca em destaque |
| `logo-empilhado-*.svg` | Espaço estreito e vertical |
| `logo-descritor-escuro.svg` | Primeiro contato, apresentação, papelaria |

### Símbolo

| Arquivo | Onde |
|---|---|
| `marca-degrade.svg` | Acima de 32 px |
| `marca-plana-*.svg` | **Abaixo de 32 px** e impressão de uma cor |

> ⚠️ Abaixo de 32 px o traço fino some e o degradê vira cor chapada. Use sempre a versão plana.

### Ícones

`icone-app-512.svg` · `icone-app-invertido-512.svg` · `favicon.svg` · `favicon-mono.svg`

Para as lojas, exporte PNG a partir do 512 nos tamanhos exigidos. Não arredonde os cantos — o sistema operacional aplica a máscara.

### Animadas

| Arquivo | Onde | Duração |
|---|---|---|
| `logo-animado-estrela.svg` | **Splash do app, abertura de vídeo** | 2,0 s |
| `logo-animado-sem-estrela.svg` | Abertura sóbria, contexto formal | 1,9 s |
| `logo-animado-estrela-claro.svg` | Abertura em fundo claro | 2,0 s |
| `marca-animada-estrela.svg` | Só o símbolo, com flash | 1,8 s |
| `marca-animada-sem-estrela.svg` | Só o símbolo, sem flash | 1,4 s |
| `splash-animado.svg` | Formato vertical para splash mobile | 2,0 s |
| `loader.svg` | Carregando · indeterminado | 2,1 s em loop |
| `loader-mono.svg` | Carregando, uma cor | 2,1 s em loop |
| `loader-progresso.svg` | Progresso real de upload | controlado por JS |

#### Progresso controlado

```js
const arco = document.getElementById('prog');   // dentro do SVG inline
const L = 65.97;
function setProgresso(p){                        // p de 0 a 1
  arco.style.strokeDashoffset = L * (1 - p);
}
```

## Regras de movimento

```
Abertura      uma vez por sessão, nunca a cada navegação
Flash         só na abertura — nunca em hover, nunca repetido
Carregando    só acima de 400 ms de espera
Nunca         em loop no cabeçalho
Nunca         no telão — lá a foto é a protagonista
Sempre        prefers-reduced-motion desliga e mostra o estado final
```

Todos os arquivos animados já respeitam `prefers-reduced-motion`.

## Cores

| Token | Hex | Uso |
|---|---|---|
| Degradê alvorada | `#9A3E1C → #D46632 → #E98A52` | Símbolo em fundo escuro |
| Degradê claro | `#853624 → #BB3D18 → #D46632` | Símbolo em fundo claro |
| Âmbar | `#D46632` | Ponto, acento |
| Brasa | `#BB3D18` | Acento em fundo claro |
| Noite | `#0C0A09` | Fundo padrão |
| Tinta | `#171513` | Texto em fundo claro |
| Papel | `#FCFBF9` | Texto em fundo escuro |
| Flash | `#FDEBCF` | Só na animação |
| Ocre | `#A96F18` | Atenção — precisa de olho, não de pânico |
| Verde-mata | `#28744E` | Confirmação, "tudo em dia" |
| Azul-tinta | `#3265B5` | Informação neutra, anel de foco |

As três últimas entraram com o redesign v5 (`docs/redesign/prototipos/console.html`).
Antes delas a marca só tinha âmbar e brasa, e a consequência aparecia na operação:
severidade caía em crítico ou em neutro, sem meio-termo — uma fila em que tudo é
vermelho ensina a ignorar vermelho.

Nenhuma destas é usada crua em componente. `packages/tokens` deriva a versão legível
para cada chão (`acentoLegivelSobre`), e é essa que sai como `--atencao`, `--positivo`
e `--informativo`. Em fundo claro, ocre vira `#915F15` para passar AA — a marca define
a intenção, a escala garante o contraste.

## Antes de produção

⚠️ **Converta o texto em curvas.** Os arquivos usam Fraunces 400 (`letter-spacing 3.4`, corpo 42) como fonte viva. Isso significa:

- Como `<img>`, a fonte não carrega e cai no fallback Georgia
- Gráfica, lojas de aplicativo e registro no INPI exigem texto vetorizado

Os arquivos de **símbolo** não têm texto e funcionam em qualquer contexto.

## Não fazer

- Engrossar o traço fora da versão plana
- Fechar o arco em círculo completo
- Subir o ponto — ele fica no horizonte, não no meio da cúpula
- Girar o símbolo
- Reduzir o espacejamento do logotipo
- Usar degradê abaixo de 32 px ou em impressão de uma cor
- Colocar o logotipo completo dentro do ícone de app
- Repetir o flash fora da abertura
