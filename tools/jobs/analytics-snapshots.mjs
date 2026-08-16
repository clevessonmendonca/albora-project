#!/usr/bin/env node
/**
 * Materializa analytics_snapshots (scope=event, period=live) para eventos abertos.
 *
 *   DATABASE_URL=postgres://… node tools/jobs/analytics-snapshots.mjs
 *
 * Fonte da verdade: packages/db `materializeEventSnapshot` — lerFunilAgregado +
 * lerMetricasAoVivo + expected_guests → upsert com JSON só de agregados (sem
 * nomes, thumbs ou PII).
 *
 * DATABASE_URL precisa listar `events` cross-event (owner/superuser ou papel
 * BYPASSRLS), como o runner de retenção. Por evento a leitura passa por
 * SET LOCAL app.event_id via comEvento.
 */
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "../..");
const require = createRequire(import.meta.url);

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DEV;
if (!url) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const esbuild = require(require.resolve("esbuild", { paths: [join(raiz, "apps/web"), raiz] }));

const entrySource = `
import pg from "pg";
import {
  listOpenEventIdsForSnapshots,
  materializeEventSnapshot,
} from ${JSON.stringify(join(raiz, "packages/db/src/analytics.ts"))};

const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DEV;
const pool = new pg.Pool({ connectionString });

const ids = await listOpenEventIdsForSnapshots(pool);
console.log(\`→ \${ids.length} evento(s) aberto(s)\`);

let ok = 0;
let falhas = 0;
for (const eventId of ids) {
  try {
    const m = await materializeEventSnapshot(pool, eventId);
    ok += 1;
    console.log("  ok", eventId, {
      h1: Math.round(m.participacao * 100) + "%",
      fotos: m.totalFotos,
    });
  } catch (e) {
    falhas += 1;
    console.error("  falhou", eventId, String(e));
  }
}

await pool.end();
if (falhas > 0) process.exitCode = 1;
console.log(\`pronto: \${ok} ok, \${falhas} falha(s)\`);
`;

const localOutDir = join(aqui, ".tmp");
const outfile = join(localOutDir, "analytics-snapshots-run.mjs");

try {
  const result = esbuild.buildSync({
    stdin: {
      contents: entrySource,
      resolveDir: raiz,
      sourcefile: "analytics-snapshots-entry.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    external: ["pg", "pg-native"],
    alias: {
      "@albora/core": join(raiz, "packages/core/src/index.ts"),
    },
  });

  rmSync(localOutDir, { recursive: true, force: true });
  mkdirSync(localOutDir, { recursive: true });
  writeFileSync(outfile, result.outputFiles[0].text);
  
  await import(pathToFileURL(outfile).href);
} catch (e) {
  console.error(e);
  process.exit(1);
}
