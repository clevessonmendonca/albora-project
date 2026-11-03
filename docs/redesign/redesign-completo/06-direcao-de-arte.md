# 06 · Direção de arte — recuperar a identidade, eliminar o "genérico"

## 1. Assets oficiais encontrados (nada foi recriado)

| Asset | Caminho no repo | Uso no protótipo |
|---|---|---|
| Logotipo (arco âmbar com degradê + ponto + "Albora" em Fraunces) | `brand/estaticas/logo-degrade-claro.svg`, `logo-degrade-escuro.svg`; componente `packages/ui-web/src/logo.tsx` (`LogoAlbora`) | Rail do anfitrião (`A.logo`, mesma geometria do componente, cores por token) |
| Símbolo (arco + ponto) | `brand/estaticas/marca-plana-{ambar,papel,tinta}.svg`, `marca-degrade*.svg` | Rail recolhido, favicon (`assets/`) |
| Estrela (4 pontas, família expressiva) | `brand/estaticas/marca-estrela-*.svg`, `brand/animadas/marca-animada-estrela.svg` | Recompensa da 1ª foto (`A.star`) |
| Mascote (criatura creme com faixa âmbar espiando sobre o arco, com a estrela) | `brand/mascote/albora-marca-mascote-v2-transparente.png`, `albora-mascote-transparente.png`, `albora-mascote-sticker-512.png` | Estados vazios, sucesso, "Pronto", erro leve — **nunca** no console ou em tabelas |
| Avatar social | `brand/social/albora-perfil-mascote-ambar-1080.png` (+10 variantes) | Referência de avatar |
| Animadas (splash, loader, progresso) | `brand/animadas/*.svg` | `loader.svg`, `splash-animado.svg` copiados |
| Regras de uso | `brand/LEIA-ME.md`, `DESIGN.md` §1b, §2, §4 | seguidas abaixo |

**Cópias:** `prototipo/assets/` (cópia byte a byte, só renomeei os PNGs do mascote). **Não localizado:** nenhuma regra escrita de *onde* o mascote entra (o `DESIGN.md` e o `CLAUDE.md` não o citam e o código do produto ainda não o usa). A política acima é decisão deste redesign, para validar com o time de marca.

**Erro encontrado no meu trabalho anterior:** o núcleo do protótipo desenhava uma marca própria (disco âmbar com a letra "a") no lugar da logo oficial, e usava a cor do evento como cromo do painel. Os dois foram corrigidos (§2 e `core.js`).

## 2. Âmbar: token vigente e papel

- **Vigente:** `ALBORA_BRAND.cores.acento = #D46632` (`packages/tokens/src/marca.ts`; commit `f111bca5` "paleta v5 vira a base da marca"). O `#D9793C` das linhagens antigas de protótipo é anterior e **não** vale.
- **Regra do próprio DESIGN.md:** "âmbar é metal, não tinta" — filete, sublinhado, disco, numeral, foco, progresso fino. No chão claro o primário é **tinta**, nunca âmbar (âmbar reprova contraste sobre papel). No chão escuro (convidado) o primário é o acento.
- **Antes (meu erro):** o cromo do painel herdava `--ev` (cor do casal). Resultado: um painel marsala, sem âmbar da marca.
- **Agora:** `--ac` = cromo do produto. Anfitrião: `--ac = --ambar` (marca). Convidado/telão: `--ac` = acento do evento **derivado para ser legível sobre noite**. `--ev` só pinta o que é do evento (avatar, prévias, capa). Fornecedor: `--ac` = cor da marca do fornecedor.
- **Onde aparece o âmbar no anfitrião:** ponto do item ativo do menu, sublinhado da aba, checks, switches, progresso, foco, contador de pendências, arco da logo e o arco-contagem da Hoje. Não há bloco preenchido de âmbar.

## 3. Opal — qual é e o que se aproveita

**Qual Opal:** assumi o **Opal (controle de tempo de tela e foco; opalapp.com; iOS/Android/Mac)**, o app mais conhecido com esse nome em "experiências de nova geração". Se você quis dizer outro produto de mesmo nome (ex.: câmeras/webcams Opal), me avise.

**Evidência (limitada):** só li a página institucional e a ficha da App Store/críticas (texto). **Não vi telas reais do app** nem animações; paleta e tipografia não constam no texto (a página sugere fundos escuros com halos azuis/amarelos nas imagens — inferência). O que segue é o que o texto sustenta:

| Padrão do Opal (texto) | Por que serve ao Albora | Como entra |
|---|---|---|
| Um número-síntese como herói (Opal Score) | O anfitrião quer saber "como está a minha festa" num olhar | Hoje: **um** número grande em Fraunces (dias que faltam / fotos hoje / fotos no álbum) em vez de grade de cartões |
| Objetos de recompensa táteis e luminosos (gems com halo) | O convidado precisa de um motivo emocional depois da 1ª foto | Estrela + mascote espiando sobre o arco na confirmação, com halo âmbar de vela (já previsto no DESIGN.md §6) |
| Escuro luminoso, foco único por tela | É a situação real do convidado às 22h | Convidado e telão: chão noite, halo ≤9%, um gesto por tela |
| Microcopy curta, tom de apoio, não de culpa | Convidado não pediu para estar ali | Textos de 1 linha; nada promocional |
| Automação ("sem decisões constantes") | Anfitrião quer não operar no dia | Hoje/Durante decide por padrão; só pede ação quando preciso |

**Não adotado:** gamificação de streaks/gems, pontuação para o convidado, "modo sem saída", paleta azul/gelo, qualquer 3D que concorra com a foto (a foto é a interface).

## 4. Composição por superfície (o que muda de verdade)

| Superfície | Humor | Composição-assinatura | Mascote | Densidade |
|---|---|---|---|---|
| **Convidado** | emocional, escuro, tátil | Capa do evento com **monograma** em Fraunces (não imagem genérica); foto em largura total sem cartão; obturador grande; progresso de envio no **arco** da marca; recompensa com estrela | Confirmação da 1ª foto, vazio, offline | baixa |
| **Anfitrião** | acolhedor, claro, editorial | **Hoje**: antes = arco-contagem (o ponto-sol percorre o arco até a data) + próximo passo; durante = faixa viva com a última foto + números grandes; depois = capa do álbum/Reviver. **Fotos**: grade sem moldura. **Estilo**: editor + prévia lado a lado. **Compartilhar**: a placa/QR como objeto impresso, grande | Vazios, Pronto, erro leve | média |
| **Fornecedor** | profissional, white-label | Slot de marca do fornecedor (nome/cor dele, "feito com Albora" discreto); lista de eventos densa e ordenável | Não | média-alta |
| **Console** | operacional, preciso | Monocromático, números tabulares, âmbar só em foco/seleção; sem mascote | **Nunca** | alta |
| **Telão** | cinematográfico | Fundo noite fixo, foto inteira, marca animada só na abertura | Não | mínima |

## 5. Anti-"AI slop": critérios usados na revisão

Cartões para tudo · título+subtítulo+3 cartões+botão em toda tela · ilustração genérica no lugar do mascote · placeholder de foto com formas abstratas · sombras e raios iguais em tudo · dois CTAs de mesmo peso · cor do evento como cromo · ícone sem critério · promessa de marketing no texto de interface · área vazia sem função. Resultado por tela em `07-auditoria-por-tela.md`.
