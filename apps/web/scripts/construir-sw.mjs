import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Compila `sw/sw.ts` em `public/sw.js`.
 *
 * O passo de bundle existe para o Service Worker poder **importar**
 * `@albora/core` em vez de reescrever o laço de upload à mão. Um `sw.js`
 * escrito direto em JS seria a segunda fonte da verdade que o ADR 0010
 * proíbe — e ela divergiria em silêncio.
 */

const RAIZ_WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = join(RAIZ_WEB, "sw", "sw.ts");
const SAIDA = join(RAIZ_WEB, "public", "sw.js");

/** Substituído pelo hash do próprio bundle depois da compilação. */
const MARCADOR = "__HASH_DO_SW__";

const producao = process.argv.includes("--producao") || process.env.NODE_ENV === "production";

const resultado = await build({
  entryPoints: [ENTRADA],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: producao,
  legalComments: "none",
  write: false,
  define: { __VERSAO_SW__: JSON.stringify(MARCADOR) },
  banner: {
    // `eslint .` alcança /public e reprovaria o bundle por globais de Service
    // Worker que não existem no `lib` do app. Suprimir o artefato não afrouxa
    // nada: a fonte, `sw/sw.ts`, continua lintada e tipada.
    js: "/* eslint-disable -- artefato de build; a fonte lintada é apps/web/sw/sw.ts */",
  },
});

const [arquivo] = resultado.outputFiles;
if (!arquivo) throw new Error("esbuild não produziu saída para o Service Worker");

// A versão sai do conteúdo, não de um número escrito à mão nem do relógio:
// ela precisa mudar quando — e só quando — o SW muda, porque é ela que decide
// quais caches o `activate` apaga.
const versao = createHash("sha256").update(arquivo.text).digest("hex").slice(0, 12);
const codigo = arquivo.text.replaceAll(MARCADOR, versao);

await mkdir(dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, codigo, "utf8");

console.log(
  `sw.js ${versao} · ${(codigo.length / 1024).toFixed(1)} kB${producao ? " (minificado)" : ""}`,
);
