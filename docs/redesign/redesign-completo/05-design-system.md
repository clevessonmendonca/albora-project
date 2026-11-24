# 05 · Design system proposto

Implementação viva: [`prototipo/ds.css`](./prototipo/ds.css) (tokens + componentes) e [`prototipo/core.js`](./prototipo/core.js) (comportamento). Este documento é a regra; o CSS é a prova.

**Continuidade com o produto.** Nada de marca nova: as cinco cores, Fraunces + Instrument Sans, "filete em vez de caixa" e a camada do evento (`--ev`) vêm do `DESIGN.md` e de `packages/tokens`. O redesign muda *composição e densidade*, não identidade.

## 1. Tokens

| Grupo | Tokens | Regra |
|---|---|---|
| Marca | `--papel #FCFBF9` `--tinta #171513` `--noite #0C0A09` `--ambar #D46632` `--brasa #BB3D18` | Só cinco cores. |
| Neutros | `--fg-2` `--fg-3` `--line` `--line-2` `--surface` `--surface-2` | **Sempre mistura** de tinta/papel (`color-mix`), nunca hex novo. |
| Evento | `--ev` `--ev-2` | Só acento/preenchimento; nunca o chão. Texto sobre papel usa `--accent-text` (derivado, ≥4.5:1). |
| Semântica | `--positivo` `--atencao` `--info` `--crit-text` | Sempre acompanhada de ícone/texto (nunca só cor). |
| Tipografia | Display = Fraunces 350 (títulos); Corpo = Instrument Sans 400–650 | Escala: 44/26/17/15/13 + rótulo versalete serifado 11.5. |
| Espaço | 4·8·12·16·24·32·48·72 | Seções separadas por espaço, não por caixa. |
| Raio | 8 / 12 / 18 / pílula | Botão = pílula; superfície = 18. |
| Movimento | 180 ms `cubic-bezier(.2,0,0,1)` | `prefers-reduced-motion` zera tudo. |
| Chão | claro (anfitrião, padrão; escuro opcional) · `noite` (convidado/telão, fixo) | Convidado e telão não têm alternador. |

## 2. Componentes (todos em `ds.css`)

Botão (primário tinta · accent âmbar · quiet · line · danger; **1 primário por tela**), campo com filete + estados (foco 2px, erro, dica), switch, check circular, chip (filtro) e aba (navegação) com sublinhado, badge com ponto de estado, lista em linha (`.li`), superfície (uso raro), banner, progresso em filete, avatar, estatística, estado vazio, skeleton, tabela, foto (grade/seleção), modal↔bottom-sheet, menu, toast com "Desfazer", paleta ⌘K, layout de app (rail ⇄ ícones ⇄ barra inferior), moldura de celular do convidado.

## 3. Estados (todo componente de dados)

| Estado | Padrão |
|---|---|
| Carregando | `skeleton` com a forma do conteúdo, `aria-busy`. |
| Vazio | ícone + frase do que acontece + **uma** ação. |
| Erro | o que houve + o que fazer + "Tentar de novo". Nunca texto cru. |
| Sucesso | toast curto (3 s); ação reversível ganha "Desfazer" (6,5 s). |
| Bloqueado | explica *por quê* (plano, fase, papel) e como liberar. |
| Offline (convidado) | a foto fica na fila, com contagem e tentativa visível. |

## 4. Padrões de interação

1. **Reversível aplica e oferece Desfazer; irreversível pede confirmação com a consequência escrita** (digitar-para-confirmar nas destrutivas de conta/evento).
2. **Autosave com toast *ou* botão Salvar** — nunca os dois na mesma tela.
3. **Validação inline após a primeira tentativa**, `aria-invalid`, foco no primeiro erro, mensagem que diz como corrigir.
4. **Progressive disclosure:** o que é raro vive em sheet/seção; nada de 11 cartões iguais.
5. **⌘K** em todas as superfícies de operação; atalhos de moderação (A/R/Z/setas).
6. **Overlays prendem foco, fecham com Esc, devolvem o foco** (`A.modal`).
7. **Mobile:** modal vira sheet; barra inferior com 4 destinos + "Mais"; alvos ≥44 px (≥48 no convidado).

## 5. Responsividade

| Largura | Anfitrião |
|---|---|
| ≥1180 | rail 240 + conteúdo ≤1040; prévia lateral nos editores |
| 901–1179 | rail recolhido em ícones (72) |
| ≤900 | barra inferior + sheet "Mais"; colunas empilham |

Convidado: coluna única ≤430 px; no desktop aparece em moldura de celular.

## 6. Glossário de interface (vocabulário permitido)

| Evitar (vazava no produto) | Usar |
|---|---|
| H1, espinha, fricção | (remover — é termo interno) |
| Runbook | "Passo a passo" |
| Asaas, RLS, presign | "pagamento", (nada) |
| Dia do evento / Ao vivo / Início / Pré-evento | **Hoje** (muda com a fase) |
| Identidade / Experiência / Missões / Recado | **Estilo** |
| QR Code / Peças / Telão pareamento | **Compartilhar** |
| Moderar | "Revisar fotos" |

## 7. Acessibilidade (WCAG 2.2 AA) — como o DS garante

Contraste por token (texto `--fg`/`--fg-2` ≥ 4.5:1; `--fg-3` só para apoio ≥ 3:1 em ≥13 px — validar com render); foco visível 2 px em todo controle; alvo mínimo 44 px; `aria-live` em toasts e contagens que mudam; ordem de foco = ordem visual; "Pular para o conteúdo"; `prefers-reduced-motion`; nenhum significado só por cor (badge = ponto + texto).

**Não verificado:** auditoria automática de contraste no protótipo (ferramenta não rodou) — pendência no relatório de validação.

---

## 8. Revisão de fundamentos (3ª passada) — valores vigentes

> Esta seção **substitui** os valores de §1 onde houver diferença (espaço, tipografia, movimento, ícones). A implementação é `prototipo/ds.css` + `core.js`.

### Espaçamento (múltiplos de 4; tokens `--space-N`)
| Token | px | Uso |
|---|---|---|
| 1 | 4 | ajuste mínimo, ícone↔rótulo colado |
| 2 | 8 | ícone↔texto, título↔descrição, itens relacionados |
| 3 | 12 | interno compacto (chip, linha) |
| 4 | 16 | campo↔dica, agrupamento pequeno, gutter mínimo |
| 5 | 20 | padding de componente, campo↔campo |
| 6 | 24 | grupos de conteúdo, último campo↔botão |
| 8 | 32 | separação entre blocos, cabeçalho de página↔corpo |
| 10 | 40 | seções intermediárias |
| 12 | 48 | separação de seções |
| 16 | 64 | seções amplas |
Fluidos: `--gutter: clamp(16px,4vw,32px)` (margem lateral) e `--section: clamp(32px,6vw,64px)`. Proximidade manda: 1–3 dentro do componente, 4–6 entre irmãos, 8–16 entre grupos/seções. O antigo `--s-1…8` virou alias.

### Tipografia (6 tamanhos + 3 fluidos; entrelinha por papel)
`xs 12` (rótulo versalete) · `sm 14` (metadado/legenda, `--fg-2`) · `md 16` (corpo e campos; 16px evita zoom do iOS) · `lg 18` (lead) · `xl 22` · `--fs-title` clamp(24→30) · `--fs-display` clamp(30→44) · `--fs-hero` clamp(40→64, numeral herói). Corpo 1.55; títulos 1.1–1.2; medida de leitura `--measure: 62ch`. Fraunces em título/numeral/nome próprio/momento editorial; Instrument Sans na interface. Pesos 400/500/600 (600 só em `t-h`).

### Movimento
`--dur-1 120ms` (toque, hover, pressed) · `--dur-2 200ms` (mudança de estado) · `--dur-3 320ms` (entrada/saída de overlay, troca de etapa) com `--ease` (a curva única do produto). Só `transform` e `opacity`. Expressivo (estrela/mascote/`celebrate`) apenas na 1ª foto enviada, evento criado e telão conectado. `prefers-reduced-motion` zera tudo.

### Contêineres e breakpoints (por necessidade do conteúdo, não por aparelho)
Contêineres: narrow 720 · page 1040 · wide 1240 · feed 560. Pontos de quebra reais usados: **480** (empilha pares), **760** (tabelas viram lista, g3/g4→2 colunas), **900** (rail → barra inferior), **1180** (rail em ícones ↔ expandido), **1024** (feed do convidado em layout de duas colunas). 320/360/375/390/414/430/600/768/1024/1280/1536/1920 são **pontos de validação**, não breakpoints.

### Ícones
Lucide (a mesma biblioteca de `packages/ui-web/src/icons.tsx`; ícones extraídos de `lucide-react@1.48.0` para `prototipo/icons-lucide.js`, nenhuma mistura de famílias). Tamanhos 16/20/24, traço 1.75, `currentColor`, versão preenchida só para estado ativo (ex.: coração reagido). Ícone de ação sempre com `aria-label`; ícone+texto separados por `space-2`; alvo ≥44×44. O coração é o ícone de *reagir* (já é o `HeartIcon` do `photo-card`); **não** é ornamento: o `CLAUDE.md` proíbe coração/aliança decorativos e o ícone `heart` do pack Casamento (`packages/packs/src/casamento.ts`) segue sendo um defeito de marca a trocar.

### Estados de componente
default · hover · `:focus-visible` (2 px, `--accent-text`) · pressed (`scale .977`) · disabled · `.is-loading` · sucesso/erro (toast + rótulo do botão: “Enviar” → “Enviada”). Campos: foco com filete 2 px, erro com `aria-invalid` + mensagem, preenchido, desabilitado.
