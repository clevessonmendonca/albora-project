import { relatar } from "./util.mjs";
import { verificar as isolamento } from "./isolamento.mjs";
import { verificar as tokens } from "./tokens.mjs";
import { verificar as dominio } from "./dominio.mjs";
import { verificar as packs } from "./packs.mjs";
import { verificar as sessao } from "./sessao.mjs";
import { verificar as features } from "./features.mjs";
import { verificar as apiRoutes } from "./api-routes.mjs";

export const GUARDS = {
  isolamento,
  tokens,
  dominio,
  packs,
  sessao,
  features,
  "api-routes": apiRoutes,
};

const raiz = process.argv[2] ?? process.cwd();
let falhas = 0;

for (const [nome, verificar] of Object.entries(GUARDS)) {
  falhas += relatar(nome, verificar(raiz));
}

if (falhas > 0) {
  console.error(`\n${falhas} guard(s) reprovaram.`);
}
process.exit(falhas > 0 ? 1 : 0);
