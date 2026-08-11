import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copia a face de display do pacote para `public/fontes/`.
 *
 * Mesma escolha do `construir-sw.mjs`: o arquivo é artefato, não fonte. O
 * pacote no lockfile é a origem, e binário versionado em git envelhece sem
 * ninguém perceber.
 *
 * **Só o subset `latin`.** Português cabe nele inteiro — ã, õ, ç e os acentos
 * vivem no Latin-1 Supplement. Levar `latin-ext` e `vietnamese` junto dobraria
 * o peso na rota que decide a primeira foto, para cobrir alfabeto que nenhum
 * convidado vai digitar.
 *
 * **Só o eixo de peso.** As variantes com `opsz`, `SOFT` e `WONK` custam quase
 * o dobro e o produto não move nenhum desses eixos.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const origem = join(raiz, "node_modules", "@fontsource-variable", "fraunces", "files");
const destino = join(raiz, "public", "fontes");

const ARQUIVOS = ["fraunces-latin-wght-normal.woff2", "fraunces-latin-wght-italic.woff2"];

mkdirSync(destino, { recursive: true });

for (const nome of ARQUIVOS) {
  const de = join(origem, nome);
  const para = join(destino, nome);

  copyFileSync(de, para);
  console.log(`  ${nome}  ${(statSync(para).size / 1024).toFixed(1)} kB`);
}
