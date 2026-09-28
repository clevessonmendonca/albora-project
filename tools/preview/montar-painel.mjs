import { readFileSync, readdirSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

/**
 * Monta as páginas de conferência visual do painel a partir dos fragmentos que
 * `features/admin/harness-do-painel.test.tsx` escreve, com o CSS **realmente
 * compilado** pelo Tailwind — não uma folha escrita à mão que se parece com ele.
 *
 * Existe porque as telas do painel pedem banco no request: vê-las exigiria
 * `next dev`, e numa máquina em swap o dev server não responde. Isto não afirma
 * nada sobre correção; serve para olhar.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..");
const web = join(raiz, "apps", "web");
const fragmentos = process.env.PREVIEW_OUT ?? join(raiz, ".preview-painel");

// postcss e tailwind vivem em apps/web/node_modules; resolver a partir daqui
// acharia o postcss 7 da home, que quebra o Tailwind v4 com erro que não
// menciona versão.
const tailwindDir = join(raiz, "node_modules", ".pnpm", "@tailwindcss+postcss@4.3.3");
const exigir = createRequire(join(tailwindDir, "node_modules", "@tailwindcss", "postcss", "package.json"));
const postcss = exigir("postcss");
const tailwind = exigir("@tailwindcss/postcss");
const destino = join(fragmentos, "site");

const paginas = readdirSync(fragmentos).filter((n) => n.endsWith(".html")).sort();
if (paginas.length === 0) {
  throw new Error(`nenhum fragmento em ${fragmentos} — rode o harness com PREVIEW=1 antes`);
}

mkdirSync(join(destino, "fontes"), { recursive: true });
for (const fonte of readdirSync(join(web, "public", "fontes"))) {
  copyFileSync(join(web, "public", "fontes", fonte), join(destino, "fontes", fonte));
}
for (const svg of readdirSync(join(web, "public")).filter((n) => n.endsWith(".svg"))) {
  copyFileSync(join(web, "public", svg), join(destino, svg));
}

/** O Tailwind v4 varre a partir do CSS; aponto para os fragmentos além do código. */
const entrada = [
  `@source "${fragmentos}/*.html";`,
  `@source "${web}/features/admin/**/*.tsx";`,
  `@source "${web}/app/admin/**/*.tsx";`,
  readFileSync(join(web, "app", "tailwind.css"), "utf8"),
  readFileSync(join(web, "app", "tipografia.css"), "utf8"),
  readFileSync(join(web, "app", "base.css"), "utf8"),
  readFileSync(join(web, "app", "fontes.css"), "utf8"),
].join("\n");

const css = await postcss([tailwind()]).process(entrada, {
  from: join(web, "app", "tailwind.css"),
  to: join(destino, "painel.css"),
});
writeFileSync(join(destino, "painel.css"), css.css, "utf8");

const { claro, escuro } = JSON.parse(readFileSync(join(fragmentos, "vars.json"), "utf8"));
const comoCss = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v};`).join(" ");
const vars = comoCss(claro);
const varsEscuras = comoCss(escuro);

const indice = [];
for (const nome of paginas) {
  const corpo = readFileSync(join(fragmentos, nome), "utf8");
  const titulo = nome.replace(/^\d+-/, "").replace(/\.html$/, "").replace(/-/g, " ");
  writeFileSync(
    join(destino, nome),
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Painel — ${titulo}</title>
<link rel="stylesheet" href="./painel.css">
<style>:root { ${vars} } .escuro { ${varsEscuras} } body { margin: 0; background: var(--bg); }</style>
</head><body>${corpo}</body></html>`,
    "utf8",
  );
  indice.push(`<li><a href="./${nome}">${titulo}</a></li>`);
}

writeFileSync(
  join(destino, "index.html"),
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conferência do painel</title>
<link rel="stylesheet" href="./painel.css"><style>:root { ${vars} } body { margin:0; background: var(--bg); padding: 3rem; }</style>
</head><body><h1 class="tipo-title text-ink">Conferência do painel</h1><ul class="text-ink-2">${indice.join("")}</ul></body></html>`,
  "utf8",
);

console.log(`${paginas.length} páginas em ${destino}`);
