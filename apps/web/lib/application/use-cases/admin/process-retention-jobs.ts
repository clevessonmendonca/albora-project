/**
 * Use Case: Process Retention Jobs
 *
 * Processa jobs de retenção LGPD (spec §6).
 */
import {
  listDueRetentionJobs,
  processRetentionJob,
  type NotificacaoRetencao,
} from "@albora/db";
import type { Pool } from "pg";
import { driveConfig } from "@/lib/drive-config";
import { getDriveClient, getDriveVault } from "@/lib/drive";
import { deleteObject } from "@/lib/r2";
import { sendHostEmail } from "@/lib/email";

function emailDeAviso(n: NotificacaoRetencao): Parameters<typeof sendHostEmail>[0] | null {
  if (n.kind === "d330_drive") {
    return {
      to: n.email,
      subject: "Baixe o álbum antes que ele seja apagado",
      text: [
        "Olá!",
        "",
        "Suas fotos estão salvas no Albora há um ano. Lembre de baixar o álbum completo",
        "pelo painel antes do prazo de exclusão definitiva.",
        "",
        "Acesse: https://app.albora.app",
      ].join("\n"),
    };
  }

  if (n.kind === "d358_warn") {
    return {
      to: n.email,
      subject: `Atenção: suas fotos serão apagadas em ${n.diasRestantes} dias`,
      text: [
        "Olá!",
        "",
        `Faltam ${n.diasRestantes} ${n.diasRestantes === 1 ? "dia" : "dias"} para as fotos do seu evento`,
        "serem removidas permanentemente do Albora.",
        "",
        "Faça o download agora pelo painel: https://app.albora.app",
      ].join("\n"),
    };
  }

  // d365_skip — não enviamos e-mail; só log de ops (sem PII)
  return null;
}

async function notificarHost(n: NotificacaoRetencao): Promise<void> {
  const mail = emailDeAviso(n);
  if (!mail) return;
  await sendHostEmail(mail);
}

/** Vault do Drive opcional: sem segredos OAuth, `processRetentionJob` recebe `undefined` e só marca revogado no banco; purge R2 e commit continuam. */
function vaultSeConfigurado() {
  try {
    driveConfig();
    return getDriveVault();
  } catch {
    return undefined;
  }
}

export type ProcessRetentionJobsOutput = {
  jobs: number;
  processados: number;
  ignorados: number;
  erros: number;
};

/**
 * Runner LGPD (spec §6): listagem via aggregator pool (BYPASSRLS, cruza eventos);
 * processamento via pool normal com SET LOCAL; purge R2 e revogação Drive pós-commit.
 */
export async function processRetentionJobs(
  pool: Pool,
  aggregatorPool: Pool,
): Promise<ProcessRetentionJobsOutput> {
  const jobs = await listDueRetentionJobs(aggregatorPool);

  let processados = 0;
  let ignorados = 0;
  let erros = 0;

  for (const job of jobs) {
    const vault = vaultSeConfigurado();
    const resultado = await processRetentionJob(pool, job, {
      notify: notificarHost,
      ...(vault ? { vault } : {}),
    });

    if (resultado.status === "aguardando") {
      ignorados++;
      continue;
    }

    if (resultado.status === "failed") {
      erros++;
      // Sem PII — só IDs e kind para diagnóstico de ops.
      console.error("retencao.job_falhou", {
        id: job.id,
        eventId: job.eventId,
        kind: job.kind,
        erro: resultado.error,
      });
      continue;
    }

    processados++;

    // d365_delete: apagar bytes no R2 depois do commit (spec §1.6).
    // Falha individual não para o loop; 404 já é sucesso (idempotente).
    if (resultado.status === "done" && resultado.chavesParaApagar?.length) {
      for (const key of resultado.chavesParaApagar) {
        try {
          await deleteObject(key);
        } catch (e) {
          // Enriquecimento pós-commit — não derruba o sweep.
          console.warn("retencao.purge_r2_falhou", {
            eventId: job.eventId,
            erro: String(e),
          });
        }
      }
      console.log("retencao.d365_purgado", {
        eventId: job.eventId,
        chaves: resultado.chavesParaApagar.length,
      });
    }

    // d365_delete: revogar refresh token no Google depois do commit (spec §1.6).
    // Enriquecimento — o purge dos nossos dados já commitou independentemente.
    if (resultado.status === "done" && resultado.driveRefreshTokenParaRevogar) {
      try {
        await getDriveClient().revoke(resultado.driveRefreshTokenParaRevogar);
      } catch (e) {
        console.warn("retencao.revoke_drive_falhou", {
          eventId: job.eventId,
          erro: String(e),
        });
      }
    }
  }

  console.log("retencao.sweep", { jobs: jobs.length, processados, ignorados, erros });

  return { jobs: jobs.length, processados, ignorados, erros };
}
