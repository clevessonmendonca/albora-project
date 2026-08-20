/**
 * Fila do export Drive — Cloudflare Queues em produção, fallback local no dev.
 *
 * Payload mínimo: um tick por mensagem. Se o job não fechou, re-enfileira o
 * mesmo payload (encadeamento spec drive-export §9).
 */

export type DriveExportTickMessage = {
  eventId: string;
  jobId: string;
  accountId: string;
};

type QueueBinding = { send: (body: DriveExportTickMessage) => Promise<void> };

function queueBinding(): QueueBinding | null {
  const global = globalThis as { DRIVE_EXPORT_QUEUE?: QueueBinding };
  return global.DRIVE_EXPORT_QUEUE ?? null;
}

export async function enqueueDriveExportTick(message: DriveExportTickMessage): Promise<"queue" | "http" | "local"> {
  const fila = queueBinding();
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
