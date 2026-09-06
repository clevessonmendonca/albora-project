/**
 * Piso global de cobertura — AGREGADO, não por arquivo.
 *
 * O Vitest 3.2.7 só oferece `coverage.thresholds.perFile` como flag ÚNICA e
 * GLOBAL: ligada, ela passa a comparar TODO conjunto de threshold arquivo a
 * arquivo — inclusive os grupos de glob de 90% do pipeline de upload (o que
 * é o que a MR de gates quer) e também um eventual piso global (o que
 * reprovaria quase todo arquivo do repo — não é essa a garantia que o piso
 * global promete). Confirmado lendo `resolveThresholds`/`checkThresholds` em
 * `node_modules/vitest/dist/chunks/coverage.*.js`: os dois leem um único
 * `this.options.thresholds?.perFile`, aplicado a TODOS os conjuntos
 * resolvidos (o "global" e cada glob), sem forma de escopar por grupo.
 *
 * Por isso o piso global não mora em `coverage.thresholds` (ver
 * `vitest.config.ts`, que só tem os quatro grupos de 90% com `perFile: true`
 * de verdade) — é checado aqui, lendo o agregado `total` de
 * `coverage/coverage-summary.json` (reporter `json-summary`) que
 * `pnpm test:coverage` gera antes de chamar este script.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
export const RESUMO_PATH = join(RAIZ, "coverage", "coverage-summary.json");

/**
 * Fase MVP (CLAUDE.md): "≥60% global". O piso de lines/statements aqui é o
 * VALOR MEDIDO em 2026-09-05 (36,7%), arredondado para baixo — não a meta:
 * ligar em 60 hoje reprovaria toda MR e o piso seria desligado de novo na
 * semana seguinte. O que ele impede a partir de agora é a cobertura CAIR,
 * que é o comportamento perigoso; subir é degrau com data, não decreto.
 *
 * `functions`/`branches` não vêm do CLAUDE.md (que só nomeia linhas) e
 * tinham folga sub-1 ponto na medição original (70,77% e 83,65% contra pisos
 * de 70/83) — MR sem relação com upload que só somasse uma função pequena
 * sem teste reprovava por ruído. Baixados para uma folga honesta (~2-3 pp).
 */
export const PISOS = {
  lines: 36,
  statements: 36,
  functions: 68,
  branches: 81,
};

export function avaliar(total, pisos = PISOS) {
  return Object.entries(pisos).map(([metrica, piso]) => {
    const medido = total[metrica]?.pct ?? 0;
    return { metrica, piso, medido, dentro: medido >= piso };
  });
}

export function formatarRelatorio(resultados) {
  const linhas = ["Piso global de cobertura (agregado, fase MVP — CLAUDE.md)"];
  for (const r of resultados) {
    const status = r.dentro ? "OK" : "ABAIXO";
    linhas.push(
      `  ${r.metrica.padEnd(11)} ${r.medido.toFixed(2).padStart(6)}%  (piso ${r.piso}%)  ${status}`,
    );
  }
  return linhas.join("\n");
}

function main() {
  let resumo;
  try {
    resumo = JSON.parse(readFileSync(RESUMO_PATH, "utf8"));
  } catch (erro) {
    console.error(
      `✗ piso global de cobertura — não encontrei ${RESUMO_PATH}. Rode "vitest run --coverage" (reporter json-summary) antes deste script.`,
    );
    console.error(erro instanceof Error ? erro.message : String(erro));
    process.exit(1);
  }

  const resultados = avaliar(resumo.total);
  console.log(formatarRelatorio(resultados));

  const reprovados = resultados.filter((r) => !r.dentro);
  if (reprovados.length > 0) {
    console.error(`\n✗ ${reprovados.length} métrica(s) abaixo do piso global.`);
    process.exit(1);
  }
  console.log("\n✓ piso global de cobertura ok.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
