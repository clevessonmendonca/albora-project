/**
 * Combina o corpo renderizado pelo harness com o CSS realmente compilado
 * pelo Tailwind — conferir tela com CSS aproximado não confere nada.
 *
 * Resolve postcss por caminho explícito de propósito: existe um
 * `~/node_modules/postcss` 7.x na home que sombreia o do repo e quebra o
 * plugin do Tailwind v4 com "plugin is not a function".
 *
 *   PREVIEW=1 pnpm vitest run apps/web/features/console/preview-harness.test.tsx
 *   node tools/preview/montar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const SAIDA = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";

function resolverUnico(padrao) {
  const base = path.join(REPO, "node_modules/.pnpm");
  const achado = fs.readdirSync(base).filter((d) => d.startsWith(padrao)).sort().pop();
  if (!achado) throw new Error(`pacote não encontrado em .pnpm: ${padrao}`);
  return path.join(base, achado, "node_modules");
}

const postcss = (
  await import(pathToFileURL(path.join(resolverUnico("postcss@8."), "postcss/lib/postcss.mjs")).href)
).default;
const twMod = await import(
  pathToFileURL(path.join(resolverUnico("@tailwindcss+postcss@"), "@tailwindcss/postcss/dist/index.mjs")).href
);
const tw = twMod.default?.default ?? twMod.default ?? twMod;

const raiz = path.join(REPO, "apps/web/app");
const entrada = ["tailwind.css", "tipografia.css", "base.css"]
  .map((f) => fs.readFileSync(path.join(raiz, f), "utf8"))
  .join("\n");
const { css } = await postcss([tw({ base: raiz })]).process(entrada, { from: path.join(raiz, "tailwind.css") });

const corpo = fs.readFileSync(path.join(SAIDA, "body.html"), "utf8");
fs.writeFileSync(
  path.join(SAIDA, "console.html"),
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Console — preview</title><style>${css}</style></head><body style="margin:0">${corpo}</body></html>`,
);
console.log(`preview em ${path.join(SAIDA, "console.html")} · CSS ${css.length} bytes`);
