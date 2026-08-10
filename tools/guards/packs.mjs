import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de packs — dependência unidirecional `pack → core`, nunca o contrário.
 *
 * O teste de sanidade do produto é trocar o pack de um evento e a UI inteira
 * mudar sem tocar no núcleo. Basta um import invertido, ou uma string de
 * domínio no núcleo, para esse teste virar mentira.
 */

const NUCLEO = ["packages/core", "packages/db", "packages/tokens"];
const TODO_NUCLEO_E_UI = [...NUCLEO, "packages/ui-web", "packages/ui-native"];

const IMPORTA_PACK = /from\s+["']@albora\/packs/;

/**
 * Palavras de domínio. O núcleo não sabe que casamento existe.
 * Fronteira de palavra para não pegar "casamento" dentro de "descasamento"
 * nem `noiva` dentro de `noivado` — falso positivo aqui gera afrouxamento.
 */
const DOMINIO = /\b(noiv[oa]s?|casamento|padrinh[oa]s?|madrinhas?|aniversariante|debutante)\b/i;

export function verificar(raiz) {
  const violacoes = [];

  for (const alvo of NUCLEO) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx"])) {
      linhasDeCodigo(caminho).forEach((semComentario, i) => {
        if (IMPORTA_PACK.test(semComentario)) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "núcleo importando de @albora/packs — a dependência é pack → core"));
        }
      });
    }
  }

  for (const alvo of TODO_NUCLEO_E_UI) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx"])) {
      linhasDeCodigo(caminho).forEach((semComentario, i) => {
        if (DOMINIO.test(semComentario)) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "string de domínio fora do pack — resolva por chave de vocabulário"));
        }
      });
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("packs", verificar);
