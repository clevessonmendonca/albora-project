import {
  listDueRetentionJobs,
  processRetentionJob,
  type NotificacaoRetencao,
} from "@albora/db";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { getAggregatorPool, getPool } from "@/lib/db";
import { driveConfig } from "@/lib/drive-config";
import { getDriveClient, getDriveVault } from "@/lib/drive";
import { deleteObject } from "@/lib/r2";
import { sendHostEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

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
  // sendHostEmail absorve falhas internamente — duplica a defesa de
  // notificarSemQuebrar que já envolve esta função no processRetentionJob.
  await sendHostEmail(mail);
}

/**
 * Tenta obter o vault do Drive sem derrubar o runner quando o Drive não está
 * configurado (ambiente sem segredos de OAuth). `processRetentionJob` trata
 * `vault: undefined` como "não revogar no Google — apenas marcar revogado no
 * banco". O purge de bytes no R2 e o commit da transação continuam normalmente.
 */
function vaultSeConfigurado() {
  try {
    driveConfig();
    return getDriveVault();
  } catch {
    return undefined;
  }
}

/**
 * Runner HTTP dos jobs de retenção LGPD (spec drive-export §6).
 *
 * `Authorization: Bearer $CRON_SECRET` — em dev sem segredo, só APP_ENV=dev.
 *
 * Chamado por Cloudflare Cron Trigger diário. Um POST sem corpo faz a
 * varredura completa: lista jobs vencidos e processa um a um.
 *
 * Design:
 * - Listagem usa `getAggregatorPool()` (BYPASSRLS) — a query cruza eventos
 *   sem `app.event_id` setado; pool comum devolveria zero linhas.
 * - Processamento usa `getPool()` — `processRetentionJob` seta `app.event_id`
 *   via SET LOCAL dentro da transação antes de qualquer escrita RLS-protegida.
 * - Purge de bytes no R2 acontece DEPOIS do commit (spec §1.6): se falhar,
 *   o próximo ciclo reenvia (idempotente — 404 é sucesso).
 * - Revogação do token Drive acontece DEPOIS do commit pelos mesmos motivos.
 * - Todo side-effect pós-commit (R2, Google) é wrapped em try/catch para
 *   não interromper o processamento dos demais eventos no mesmo sweep.
 */
export async function postOpsRetencao(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  try {
    const jobs = await listDueRetentionJobs(getAggregatorPool());

    let processados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const job of jobs) {
      const vault = vaultSeConfigurado();
      const resultado = await processRetentionJob(getPool(), job, {
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
    return jsonOk({ jobs: jobs.length, processados, ignorados, erros });
  } catch (e) {
    return unexpectedError("ops.retencao", e);
  }
}
