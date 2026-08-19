#!/usr/bin/env node
/**
 * Job runner de retenção (spec drive-export §6/§9, fase 7).
 *
 *   DATABASE_URL=... node tools/jobs/retention.mjs
 *
 * Cross-event por desenho — `DATABASE_URL` precisa ser um papel BYPASSRLS ou
 * superuser (mesma exigência de `tools/jobs/analytics-snapshots.mjs`), porque
 * o runner lê `retention_jobs` JOIN `events` para vários eventos de uma vez.
 *
 * `plus_48h` / `d330_drive` (nudge) / `d358_warn` (aviso final) processam
 * assim que vencem. `d365_delete` é irreversível: fail-closed via
 * `mayDeleteAtD365`, com folga de 60min (`podeProcessarAgora`) e
 * `pg_advisory_xact_lock` por evento — tudo isso já mora em
 * `@albora/core`/`@albora/db` (`packages/db/src/retention-jobs.ts`); este
 * arquivo só resolve dependências de runtime (e-mail, storage, Drive) e
 * decide o que fazer com o resultado.
 *
 * Credenciais do Drive (`DRIVE_TOKEN_ENC_KEY`, `DRIVE_OAUTH_CLIENT_ID`,
 * `DRIVE_OAUTH_CLIENT_SECRET`) são OPCIONAIS aqui: sem elas, o runner ainda
 * faz tudo que a retenção promete (avisos, gate do D365, purge da nossa
 * cópia) — só não chama `revoke` no Google (fica só marcado `revogado` no
 * nosso banco). Isso é enriquecimento, nunca bloqueia o D365 (CLAUDE.md §3).
 *
 * `OPS_ALERT_WEBHOOK` — opcional. Sem ele, o alerta de skip do D365 degrada
 * para um `console.error` bem visível (spec §6.5).
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
  listDueRetentionJobs,
  processRetentionJob,
} from ${JSON.stringify(join(raiz, "packages/db/src/retention-jobs.ts"))};
import { sendHostEmail } from ${JSON.stringify(join(raiz, "apps/web/lib/email.ts"))};
import { VaultDeTokenDrive } from ${JSON.stringify(join(raiz, "packages/db/src/drive-token-vault.ts"))};
import { googleDriveClient } from ${JSON.stringify(join(raiz, "apps/web/lib/drive-client.ts"))};
import { deleteObject as apagarObjetoR2 } from ${JSON.stringify(join(raiz, "apps/web/lib/r2.ts"))};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? process.env.DATABASE_URL_DEV });

// Drive é opcional (credenciais "chegam depois", instrução do mantenedor):
// sem elas, o runner degrada — faz tudo que não depende do Google. As
// classes/funções em si não fazem I/O na importação (sem efeito colateral),
// só na construção/chamada — por isso o import acima é estático (esbuild
// bundleia TS de verdade; um \`import()\` dinâmico de um .ts não rodaria em
// Node puro) e a decisão de usar é toda em runtime, aqui embaixo.
let vault;
let driveClient;
const temDriveEnv =
  process.env.DRIVE_TOKEN_ENC_KEY && process.env.DRIVE_OAUTH_CLIENT_ID && process.env.DRIVE_OAUTH_CLIENT_SECRET;
if (temDriveEnv) {
  try {
    vault = new VaultDeTokenDrive({ versao: 1, chave: Buffer.from(process.env.DRIVE_TOKEN_ENC_KEY, "base64") });
    driveClient = googleDriveClient(process.env.DRIVE_OAUTH_CLIENT_ID, process.env.DRIVE_OAUTH_CLIENT_SECRET);
  } catch (e) {
    console.warn("retention.drive_indisponivel", String(e));
  }
} else {
  console.warn("retention.drive_sem_credenciais", "revogação no Google desligada — o purge da nossa cópia segue de qualquer jeito");
}

// R2 (purge dos bytes no D365) também é best-effort — sem as envs de
// storage, a nossa cópia em Postgres já foi apagada (o que importa para o
// isolamento e para o LGPD de ponteiro); os bytes ficam órfãos até uma
// reconciliação futura, e isso é logado alto, não silencioso.
const temR2Env =
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET;
const deleteObject = temR2Env ? apagarObjetoR2 : null;
if (!temR2Env) console.warn("retention.r2_sem_credenciais", "purge de bytes desligado — só os ponteiros em Postgres são apagados");

async function alertarOps(evento, detalhes) {
  const webhook = process.env.OPS_ALERT_WEBHOOK;
  const payload = { evento, ...detalhes, em: new Date().toISOString() };
  if (!webhook) {
    console.error("OPS_ALERT (sem webhook configurado)", JSON.stringify(payload));
    return;
  }
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("retention.alerta_falhou", String(e));
  }
}

function textoDoAviso(n) {
  if (n.kind === "d330_drive") {
    return {
      subject: "Já dá para exportar suas fotos pro Google Drive",
      text: [
        "A festa terminou faz um tempo, e o álbum já pode ir pro Drive de vocês.",
        "Entre no painel quando quiser — não tem prazo pra começar.",
      ].join("\\n"),
    };
  }
  if (n.kind === "d358_warn") {
    return {
      subject: "Últimos dias para exportar suas fotos",
      text: [
        \`Faltam \${n.diasRestantes} \${n.diasRestantes === 1 ? "dia" : "dias"} antes de apagarmos nossa cópia das fotos.\`,
        "Exporte para o Google Drive no painel — depois disso não temos mais como recuperar.",
      ].join("\\n"),
    };
  }
  return {
    subject: "Não conseguimos confirmar seu backup ainda",
    text: [
      "Ainda não vimos uma cópia completa e atual das suas fotos no Google Drive.",
      "Vamos manter suas fotos por mais alguns dias, mas exporte assim que puder — o prazo não se estende sozinho para sempre.",
    ].join("\\n"),
  };
}

async function notify(n) {
  const { subject, text } = textoDoAviso(n);
  await sendHostEmail({ to: n.email, subject, text });
  if (n.kind === "d365_skip") {
    console.error("retention.d365_skip", { eventId: n.eventId, motivo: n.reason, diasDeAtraso: n.diasDeAtraso });
    await alertarOps("retention.d365_skip", {
      eventId: n.eventId,
      motivo: n.reason,
      diasDeAtraso: n.diasDeAtraso,
    });
  }
}

const due = await listDueRetentionJobs(pool, 50);
console.log(\`→ \${due.length} job(s) vencido(s)\`);

const contagem = { done: 0, skipped: 0, failed: 0, aguardando: 0 };

for (const job of due) {
  const r = await processRetentionJob(pool, job, { notify, vault });
  contagem[r.status] = (contagem[r.status] ?? 0) + 1;

  if (r.status === "done" && job.kind === "d365_delete") {
    console.log("  d365 apagado", job.eventId, { chaves: r.chavesParaApagar?.length ?? 0 });

    if (deleteObject && r.chavesParaApagar?.length) {
      let falhas = 0;
      for (const chave of r.chavesParaApagar) {
        try {
          await deleteObject(chave);
        } catch (e) {
          falhas += 1;
          console.error("retention.purge_objeto_falhou", { eventId: job.eventId, erro: String(e) });
        }
      }
      if (falhas > 0) {
        await alertarOps("retention.purge_r2_parcial", { eventId: job.eventId, falhas });
      }
    } else if (r.chavesParaApagar?.length) {
      console.warn("retention.r2_indisponivel_bytes_orfaos", { eventId: job.eventId, chaves: r.chavesParaApagar.length });
    }

    if (driveClient && r.driveRefreshTokenParaRevogar) {
      try {
        await driveClient.revoke(r.driveRefreshTokenParaRevogar);
      } catch (e) {
        console.warn("retention.drive_revoke_falhou", { eventId: job.eventId, erro: String(e) });
      }
    }
  } else {
    console.log(\`  \${r.status} \${job.kind} \${job.eventId}\`);
  }
}

console.log("pronto:", contagem);
await pool.end();
if (contagem.failed > 0) process.exitCode = 1;
`;

// Escreve dentro de apps/web/ (não tools/jobs/) de propósito: o bundle
// importa apps/web/lib/r2.ts, que depende de `aws4fetch` — um pacote só
// instalado em apps/web/node_modules (pnpm não hoisteia pra raiz por
// padrão). A resolução de módulo do Node sobe a árvore de diretórios a
// partir de onde o arquivo mora; rodando fora de apps/web ela nunca acha
// `aws4fetch`, mesmo com o pacote instalado em outro lugar do monorepo.
const localOutDir = join(raiz, "apps/web", ".tmp-retention-job");
const outfile = join(localOutDir, "retention-run.mjs");

try {
  const result = esbuild.buildSync({
    stdin: {
      contents: entrySource,
      resolveDir: raiz,
      sourcefile: "retention-entry.ts",
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
