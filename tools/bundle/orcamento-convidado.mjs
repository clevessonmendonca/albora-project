/**
 * Orçamento de First Load JS nas rotas críticas do convidado (gate pós-H1).
 *
 * Roda `next build --no-lint`, lê a tabela de rotas do stdout e compara com
 * `orcamentos.json`. Modo `--report-only` nunca reprova o processo — serve
 * para observar tendência no CI antes de tornar o gate bloqueante.
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const WEB = join(RAIZ, "apps", "web");
const ORCAMENTOS_PATH = join(AQUI, "orcamentos.json");

/** Linha da tabela de rotas emitida por `next build`. */
const LINHA_ROTA =
  /(\/e\/\[slug\]\/[a-z-]+)\s+[\d.]+\s+\wB\s+([\d.]+)\s+kB/;

export function parseKb(valor) {
  const m = String(valor).match(/([\d.]+)\s*kB/i);
  return m ? Number.parseFloat(m[1]) : null;
}

export function extrairRotas(saida) {
  const achados = new Map();
  for (const linha of saida.split("\n")) {
    const m = linha.match(LINHA_ROTA);
    if (!m) continue;
    achados.set(m[1], parseKb(`${m[2]} kB`));
  }
  return achados;
}

export function comparar(rotasMedidas, orcamentos) {
  return Object.entries(orcamentos.rotas).map(([rota, cfg]) => {
    const medido = rotasMedidas.get(rota) ?? null;
    const limite = cfg.firstLoadKb;
    const dentro = medido !== null && medido <= limite;
    return {
      rota,
      descricao: cfg.descricao,
      medidoKb: medido,
      limiteKb: limite,
      dentro,
      ausente: medido === null,
    };
  });
}

function carregarOrcamentos() {
  return JSON.parse(readFileSync(ORCAMENTOS_PATH, "utf8"));
}

function executarPasso(args, cwd) {
  const r = spawnSync("pnpm", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return {
    code: r.status ?? 1,
    saida: `${r.stdout ?? ""}\n${r.stderr ?? ""}`,
  };
}

export function executarBuild() {
  const pre = [
    ["sw:build", "--producao"],
    ["fontes"],
  ];
  for (const args of pre) {
    const r = executarPasso(args, WEB);
    if (r.code !== 0) {
      return { ok: false, saida: r.saida, motivo: `prebuild falhou: pnpm ${args.join(" ")}` };
    }
  }

  const build = executarPasso(["exec", "next", "build", "--no-lint"], WEB);
  if (build.code !== 0) {
    return { ok: false, saida: build.saida, motivo: "next build falhou" };
  }
  return { ok: true, saida: build.saida };
}

function formatarRelatorio(resultados, reportOnly) {
  const linhas = ["Orçamento de bundle — rotas do convidado (First Load JS)", ""];
  linhas.push("Rota                          Medido   Limite   Status");
  linhas.push("────────────────────────────────────────────────────────");

  for (const r of resultados) {
    const medido = r.medidoKb === null ? "  —   " : `${r.medidoKb.toFixed(1).padStart(5)} kB`;
    const limite = `${r.limiteKb.toFixed(0).padStart(5)} kB`;
    let status;
    if (r.ausente) status = "AUSENTE";
    else if (r.dentro) status = "OK";
    else status = "ACIMA";

    linhas.push(
      `${r.rota.padEnd(28)} ${medido}  ${limite}  ${status}`,
    );
    if (r.descricao) {
      linhas.push(`  ↳ ${r.descricao}`);
    }
  }

  const acima = resultados.filter((r) => !r.dentro && !r.ausente);
  const ausentes = resultados.filter((r) => r.ausente);

  linhas.push("");
  if (ausentes.length > 0) {
    linhas.push(
      `⚠ ${ausentes.length} rota(s) não encontrada(s) na saída do build — verifique se a rota ainda existe.`,
    );
  }
  if (acima.length > 0) {
    const verbo = reportOnly ? "excede(m) o orçamento (report-only)" : "excede(m) o orçamento";
    linhas.push(`✗ ${acima.length} rota(s) ${verbo}.`);
  } else if (ausentes.length === 0) {
    linhas.push("✓ Todas as rotas monitoradas dentro do orçamento.");
  }

  if (reportOnly && acima.length > 0) {
    linhas.push("");
    linhas.push(
      "Modo report-only: CI não será bloqueado. Ajuste o código ou revise os limites em tools/bundle/orcamentos.json.",
    );
  }

  return linhas.join("\n");
}

export function avaliar({ saida, orcamentos, reportOnly }) {
  const rotas = extrairRotas(saida);
  const resultados = comparar(rotas, orcamentos);
  const relatorio = formatarRelatorio(resultados, reportOnly);
  const reprova =
    !reportOnly &&
    resultados.some((r) => r.ausente || !r.dentro);
  return { resultados, relatorio, reprova };
}

function main() {
  const reportOnly =
    process.argv.includes("--report-only") ||
    process.env.BUNDLE_BUDGET_REPORT_ONLY === "1";

  const orcamentos = carregarOrcamentos();
  const build = executarBuild();

  if (!build.ok) {
    console.error(`✗ orçamento de bundle — ${build.motivo}\n`);
    console.error(build.saida.trim());
    process.exit(reportOnly ? 0 : 1);
  }

  const { relatorio, reprova } = avaliar({
    saida: build.saida,
    orcamentos,
    reportOnly,
  });

  console.log(relatorio);
  process.exit(reprova ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
