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
/**
 * As rotas entram na varredura de domínio, não na de import.
 *
 * A regra do `CLAUDE.md` diz "nem no JSX", e a maior superfície de copy de
 * domínio do produto é a landing — que mora aqui, não em `packages`. Uma rota
 * *pode* importar um pack: é ela que escolhe qual. O que ela não pode é
 * escrever a palavra.
 */
const ROTAS = ["apps/web/app", "apps/mobile/app"];

const IMPORTA_PACK = /from\s+["']@albora\/packs/;

/**
 * Palavras de domínio. O núcleo não sabe que casamento existe.
 * Fronteira de palavra para não pegar "casamento" dentro de "descasamento"
 * nem `noiva` dentro de `noivado` — falso positivo aqui gera afrouxamento.
 */
const DOMINIO = /\b(noiv[oa]s?|casamento|padrinh[oa]s?|madrinhas?|aniversariante|debutante)\b/gi;

/**
 * A palavra em prosa é violação; o identificador do pack não é.
 *
 * `import { CASAMENTO } from "@albora/packs"` é a rota escolhendo qual pack
 * servir — é o mecanismo funcionando, não burlado. Já `"casamento"` e
 * `Casamento` são texto que o pack deveria ter dado. Constante em CAIXA ALTA é
 * a única forma que o produto usa para identificador de pack, então é ela a
 * exceção — e ela é estreita de propósito.
 */
function palavraDeDominio(linha) {
  return [...linha.matchAll(DOMINIO)].some(([achado]) => achado !== achado.toUpperCase());
}

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

  for (const alvo of [...TODO_NUCLEO_E_UI, ...ROTAS]) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx"])) {
      linhasDeCodigo(caminho).forEach((semComentario, i) => {
        if (palavraDeDominio(semComentario)) {
          violacoes.push(violacao(raiz, caminho, i, semComentario, "string de domínio fora do pack — resolva por chave de vocabulário"));
        }
      });
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("packs", verificar);
