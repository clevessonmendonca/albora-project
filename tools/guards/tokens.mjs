import { basename } from "node:path";
import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de tokens — regra do CLAUDE.md.
 *
 * Um hex literal em componente é um lugar onde a identidade do casal **não**
 * propaga. Isso é bug de produto, não de estilo: a placa impressa deixa de
 * combinar com o telão.
 *
 * Roda em `ui-web` e `ui-native` com a mesma regra (ADR 0010) — dois sistemas
 * de tema com um nome só é exatamente o que o ADR 0003 proíbe.
 */

const ALVOS = ["packages/ui-web", "packages/ui-native", "apps/web/app", "apps/mobile/app"];

/** Hex de 3, 4, 6 ou 8 dígitos. */
const HEX = /#[0-9a-fA-F]{3,8}\b/;
/** `bg-[#...]`, `text-[rgb(...)]` — cor arbitrária do Tailwind. */
const ARBITRARIA = /\b(?:bg|text|border|fill|stroke|from|via|to)-\[(?!var\()[^\]]*\]/;
/** Paleta pronta do Tailwind: a identidade do evento não passa por ela. */
const PALETA = /\b(?:bg|text|border|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

/**
 * Raio e curva também são identidade, e escapavam.
 *
 * `border-radius: 12px` e `ease-out` passavam limpos pelo CI enquanto o guard
 * cuidava só de cor. Não quebravam nada e nada avisava — e três telas depois
 * havia três linguagens de forma, que é o mesmo defeito do hex literal com
 * outro nome. A pílula da marca é `var(--raio-pilula)`, e o produto tem UMA
 * curva: nove curvas diferentes é o que faz uma interface parecer nove.
 */
const RAIO_LITERAL = /border-?[Rr]adius\s*:\s*["'`]?\s*\d/;
/**
 * Geometria, não escala: `50%` é círculo e `0` é reset — nenhum dos dois é
 * decisão de identidade, e nenhum dos dois tem token. Reprová-los seria o ruído
 * que faz alguém desligar o guard, e guard desligado é pior que guard ausente,
 * porque parece que existe.
 */
const GEOMETRIA = /border-?[Rr]adius\s*:\s*["'`]?\s*(?:50%|0(?:px|rem)?(?![\d.]))/;

const CURVA_LITERAL =
  /cubic-bezier\s*\(|\b(?:ease-in-out|ease-out|ease-in)\b|\d\s*m?s\s+(?:ease|linear)\b/;

/**
 * Exceções por arquivo, com motivo. **Nunca afrouxar a regra** — é o plano
 * escrito no risco da task 002. Arquivo só entra aqui se a cor for
 * genuinamente independente da identidade do evento.
 */
const EXCECOES = new Map([
  ["marca.ts", "define a paleta da marca; é a origem dos tokens, não consumidor"],
]);

export function verificar(raiz) {
  const violacoes = [];

  for (const alvo of ALVOS) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx", ".css"])) {
      if (EXCECOES.has(basename(caminho))) continue;

      // Sem `else`: uma linha pode burlar de três formas ao mesmo tempo, e
      // relatar só a primeira faz o autor corrigir uma e ser reprovado de novo.
      linhasDeCodigo(caminho).forEach((semComentario, i) => {
        if (HEX.test(semComentario)) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "hex literal — use var(--token) de @albora/tokens"));
        }
        if (ARBITRARIA.test(semComentario)) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "cor arbitrária — só `-[var(--token)]` é aceito"));
        }
        if (PALETA.test(semComentario)) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "paleta do Tailwind — a identidade do evento não passa por ela"));
        }
        if (RAIO_LITERAL.test(semComentario) && !GEOMETRIA.test(semComentario)) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "raio literal — use var(--raio), var(--raio-pilula) ou var(--raio-superficie)"));
        }
        if (CURVA_LITERAL.test(semComentario) && !semComentario.includes("var(--curva)")) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "curva literal — o produto tem uma só: var(--curva)"));
        }
      });
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("tokens", verificar);
