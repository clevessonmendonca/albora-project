#!/usr/bin/env node
/**
 * Mede quanto a PRIMEIRA resposta de cada rota do convidado custa — o número
 * que decidiu o ADR 0021.
 *
 * Serve para reproduzir sob demanda a intermitência que antes só aparecia por
 * acaso no CI: contra `pnpm dev` com `.next` frio, a compilação sob demanda da
 * rota entra no orçamento de 30s do teste que tocar a rota primeiro. `--carga`
 * satura a CPU para simular runner disputado.
 *
 * Uso:
 *   # cenário que falhava — dev, cache frio (feche outros dev servers antes)
 *   rm -rf apps/web/.next && pnpm dev &
 *   node tools/e2e/medir-compilacao.mjs
 *   node tools/e2e/medir-compilacao.mjs --carga=8
 *
 *   # cenário do CI hoje — build de produção
 *   pnpm build && pnpm --filter @albora/web start &
 *   node tools/e2e/medir-compilacao.mjs
 *
 * Sai com código 1 se alguma rota estourar o orçamento (--orcamento, 30s por
 * padrão: o testTimeout do Playwright).
 */

import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const achado = args.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
};

const base = (opcao("base", process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000")).replace(
  /\/+$/,
  "",
);
const slug = opcao("slug", "festa-demo");
const carga = Number(opcao("carga", "0"));
const orcamentoMs = Number(opcao("orcamento", "30")) * 1000;

/*
 * Ordem deliberada: é a ordem em que a suíte toca as rotas
 * (`playwright test --list`), porque quem paga a compilação é sempre o
 * primeiro teste a chegar na rota — não um teste sorteado.
 */
const rotas = [
  { path: `/e/${slug}`, label: "entrada (feed.spec.ts:112)", exige: /tio jo/i },
  { path: `/e/${slug}/cover`, label: "cover (feed.spec.ts:112)" },
  { path: `/e/${slug}/feed`, label: "feed (feed.spec.ts:112)" },
  { path: `/e/${slug}/photo`, label: "photo (guest-flow.spec.ts:96)" },
];

/*
 * Só a entrada é alcançável sem sessão de convidado; cover, feed e photo
 * redirecionam. O instrumento mede o custo de SERVIR a rota — a compilação
 * acontece antes de o servidor saber se há sessão, que é justamente o que
 * interessa aqui — e valida o conteúdo apenas onde isso é possível.
 *
 * Detectar estado por substring no HTML não funciona: o payload RSC carrega
 * as strings de todos os estados da tela, inclusive as de erro.
 */

/** Queima CPU em processos filhos enquanto a medição corre. */
function iniciarCarga(n) {
  if (n <= 0) return [];
  const codigo = "const fim=Date.now()+900000;while(Date.now()<fim){Math.sqrt(Math.random())}";
  return Array.from({ length: n }, () =>
    spawn(process.execPath, ["-e", codigo], { stdio: "ignore" }),
  );
}

const filhos = iniciarCarga(carga);
if (carga > 0) console.log(`carga artificial: ${carga} processos saturando CPU\n`);

let estouros = 0;

try {
  for (const { path, label, exige } of rotas) {
    const url = `${base}${path}`;
    const inicio = performance.now();
    let status = "";
    let ok = false;
    try {
      const res = await fetch(url, { redirect: "follow" });
      status = String(res.status);
      const corpo = await res.text();
      ok = res.ok;
      if (ok && exige && !exige.test(corpo)) {
        ok = false;
        status = "sem marcador";
      }
    } catch (err) {
      status = err instanceof Error ? err.message : String(err);
    }
    const ms = performance.now() - inicio;
    /*
     * Servidor fora do ar responde em 0ms, e "0ms" passaria por dentro de
     * qualquer orçamento. Um instrumento que aprova quando não mediu nada é
     * o mesmo defeito que ele existe para expor — resposta não-2xx reprova.
     */
    const estourou = ms > orcamentoMs;
    if (estourou || !ok) estouros += 1;
    console.log(
      `${estourou || !ok ? "✗" : "✓"} ${(ms / 1000).toFixed(2).padStart(8)}s  ${status.padEnd(12)}  ${label}`,
    );
  }
} finally {
  for (const filho of filhos) filho.kill();
}

console.log(`\norçamento por teste: ${orcamentoMs / 1000}s`);

if (estouros > 0) {
  console.error(
    `\n${estouros} rota(s) reprovadas — acima do orçamento ou sem 2xx. ` +
      `Um teste que toque essas rotas primeiro reprova por tempo de compilação, ` +
      `não por regressão.`,
  );
  process.exit(1);
}

console.log("Todas as rotas responderam dentro do orçamento.");
