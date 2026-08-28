import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copia faces estáticas OFL para `assets/fontes/` — mesma origem do PDF/web
 * (`piece-fonts.ts`): Fraunces 600 + Instrument Sans 400, subset latin.
 * Artefato de build, não versionado em git.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const destino = join(raiz, "assets", "fontes");

const FACES = [
  ["@fontsource/fraunces", "fraunces-latin-600-normal.woff"],
  ["@fontsource/instrument-sans", "instrument-sans-latin-400-normal.woff"],
];

mkdirSync(destino, { recursive: true });

for (const [pacote, nome] of FACES) {
  const origem = join(raiz, "node_modules", pacote, "files", nome);
  const para = join(destino, nome);
  copyFileSync(origem, para);
  console.log(`  ${nome}  ${(statSync(para).size / 1024).toFixed(1)} kB`);
}
