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
| Degradê alvorada | `#9E4A22 → #D9793C → #EFA463` | Símbolo em fundo escuro |
| Degradê claro | `#8A3A12 → #C2410C → #D9793C` | Símbolo em fundo claro |
| Âmbar | `#D9793C` | Ponto, acento |
| Brasa | `#C2410C` | Acento em fundo claro |
| Noite | `#0C0A09` | Fundo padrão |
| Tinta | `#1A1613` | Texto em fundo claro |
| Papel | `#F4F0E9` | Texto em fundo escuro |
| Flash | `#FDEBCF` | Só na animação |

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
