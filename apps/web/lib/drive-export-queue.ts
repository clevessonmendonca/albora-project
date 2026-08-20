/**
 * Fila do export Drive — Cloudflare Queues em produção, fallback local no dev.
 *
 * Payload mínimo: um tick por mensagem. Se o job não fechou, re-enfileira o
 * mesmo payload (encadeamento spec drive-export §9).
 */

export type { DriveExportTickMessage } from "@/lib/drive-export-tick-message";

import type { DriveExportTickMessage } from "@/lib/drive-export-tick-message";

type QueueBinding = { send: (body: DriveExportTickMessage) => Promise<void> };

async function queueBinding(): Promise<QueueBinding | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const fila = env.DRIVE_EXPORT_QUEUE;
    if (fila) {
      return {
        send: async (body) => {
          await fila.send(body);
        },
      };
    }
  } catch {
    // fora do Worker / dev sem initOpenNextCloudflareForDev
  }

  const global = globalThis as { DRIVE_EXPORT_QUEUE?: QueueBinding };
  return global.DRIVE_EXPORT_QUEUE ?? null;
}

export async function enqueueDriveExportTick(message: DriveExportTickMessage): Promise<"queue" | "http" | "local"> {
  const fila = await queueBinding();
  if (fila) {
    await fila.send(message);
    return "queue";
  }

  const secret = process.env.JOB_RUNNER_SECRET;
  const base = process.env.APP_URL?.replace(/\/$/, "");
  if (secret && base) {
    void fetch(`${base}/api/jobs/drive-export`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
    }).catch((e) => {
      console.error("drive_export.enqueue_http_falhou", { ...message, erro: String(e) });
    });
    return "http";
  }

  return "local";
}
