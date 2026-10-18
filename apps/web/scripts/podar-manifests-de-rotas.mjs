import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

if (process.env.CF_PODAR_MANIFESTS !== "1" && process.env.CF_LEVE !== "1") process.exit(0);

const raizes = [".next/server/app", ".next/standalone/apps/web/.next/server/app"];
let removidos = 0;
let bytes = 0;

function varrer(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho);
    else if (nome === "route_client-reference-manifest.js") {
      bytes += statSync(caminho).size;
      rmSync(caminho);
      removidos++;
    }
  }
}

for (const raiz of raizes) {
  try {
    varrer(raiz);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
console.log(`podar-manifests-de-rotas: ${removidos} arquivos, ${(bytes / 1048576).toFixed(1)} MiB`);
