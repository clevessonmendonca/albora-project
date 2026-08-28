#!/usr/bin/env node
/**
 * Runner do export assíncrono para Google Drive (spec drive-export §7/§9).
 *
 *   DATABASE_URL=... node tools/jobs/drive-export.mjs
 *
 * Processa um tick (`ITENS_POR_TICK_DRIVE`) de cada job `enviando`. Agendar
 * via cron (ex.: a cada 1–5 min) ou Cloudflare Queues apontando pra este
 * entrypoint. Cross-event — `DATABASE_URL` precisa BYPASSRLS/superuser.
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
import { listarJobsDriveEnviando } from ${JSON.stringify(join(raiz, "packages/db/src/export-db.ts"))};
import { VaultDeTokenDrive } from ${JSON.stringify(join(raiz, "packages/db/src/drive-token-vault.ts"))};
import { googleDriveClient } from ${JSON.stringify(join(raiz, "apps/web/lib/drive-client.ts"))};
import { processDriveExportJob } from ${JSON.stringify(join(raiz, "apps/web/lib/drive-export-worker.ts"))};
import { sendHostEmail } from ${JSON.stringify(join(raiz, "apps/web/lib/email.ts"))};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? process.env.DATABASE_URL_DEV });

const temDriveEnv =
  process.env.DRIVE_TOKEN_ENC_KEY && process.env.DRIVE_OAUTH_CLIENT_ID && process.env.DRIVE_OAUTH_CLIENT_SECRET;
if (!temDriveEnv) {
  console.error("drive_export.sem_credenciais", "DRIVE_TOKEN_ENC_KEY + DRIVE_OAUTH_* obrigatórios");
  process.exit(1);
}

const vault = new VaultDeTokenDrive({ versao: 1, chave: Buffer.from(process.env.DRIVE_TOKEN_ENC_KEY, "base64") });
const driveClient = googleDriveClient(process.env.DRIVE_OAUTH_CLIENT_ID, process.env.DRIVE_OAUTH_CLIENT_SECRET);

async function emailDoEvento(eventId) {
  const { rows } = await pool.query(
    "SELECT a.email FROM events e JOIN accounts a ON a.id = e.account_id WHERE e.id = $1",
    [eventId],
  );
  return rows[0]?.email ?? null;
}

const jobs = await listarJobsDriveEnviando(pool, 20);
console.log("drive_export.jobs_pendentes", jobs.length);

for (const job of jobs) {
  const email = await emailDoEvento(job.eventId);
  const fechou = await processDriveExportJob(pool, job.eventId, job.accountId, job.jobId, {
    driveClient,
    vault,
    onPronto: email
      ? async ({ total, job: fechado }) => {
          await sendHostEmail({
            to: email,
            subject: "Suas fotos já estão no Google Drive",
            text: [
              \`\${total} \${total === 1 ? "arquivo foi enviado" : "arquivos foram enviados"} para o Drive de vocês.\`,
              "",
              fechado.driveFolderId
                ? \`https://drive.google.com/drive/folders/\${fechado.driveFolderId}\`
                : "",
            ].join("\\n"),
          });
        }
      : undefined,
  });
  console.log(fechou ? "drive_export.fechou" : "drive_export.tick", job.eventId, job.jobId);
}

await pool.end();
console.log("drive_export.pronto");
`;

const localOutDir = join(raiz, "apps/web", ".tmp-drive-export-job");
const outfile = join(localOutDir, "drive-export-run.mjs");

try {
  const result = esbuild.buildSync({
    stdin: {
      contents: entrySource,
      resolveDir: raiz,
      sourcefile: "drive-export-entry.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    external: ["pg", "pg-native", "aws4fetch"],
    alias: {
      "@albora/core": join(raiz, "packages/core/src/index.ts"),
      "@albora/db": join(raiz, "packages/db/src/index.ts"),
    },
  });

  rmSync(localOutDir, { recursive: true, force: true });
  mkdirSync(localOutDir, { recursive: true });
  writeFileSync(outfile, result.outputFiles[0].text);

  await import(pathToFileURL(outfile).href);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  rmSync(localOutDir, { recursive: true, force: true });
}
