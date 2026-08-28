import { parseDriveExportTickMessage } from "../lib/drive-export-tick-message";

const TICK_PATH = "/api/jobs/drive-export";

export async function tickDriveExportViaFetch(
  message: ReturnType<typeof parseDriveExportTickMessage> & object,
  opts: { fetchImpl: (req: Request) => Promise<Response>; url: string; secret: string },
): Promise<Response> {
  return opts.fetchImpl(
    new Request(opts.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${opts.secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
    }),
  );
}

export function urlTickDriveExport(env: CloudflareEnv): string {
  const base = env.APP_URL?.replace(/\/$/, "");
  if (base) return `${base}${TICK_PATH}`;
  return `https://internal${TICK_PATH}`;
}

export async function consumirLoteDriveExport(batch: MessageBatch<unknown>, env: CloudflareEnv): Promise<void> {
  const secret = env.JOB_RUNNER_SECRET;
  if (!secret) {
    console.error("drive_export.queue_sem_segredo");
    for (const msg of batch.messages) msg.retry();
    return;
  }

  const fetchImpl = env.WORKER_SELF_REFERENCE
    ? (req: Request) => env.WORKER_SELF_REFERENCE!.fetch(req)
    : fetch;

  const url = urlTickDriveExport(env);

  for (const msg of batch.messages) {
    const tick = parseDriveExportTickMessage(msg.body);
    if (!tick) {
      console.error("drive_export.queue_payload_invalido", { body: msg.body });
      msg.ack();
      continue;
    }

    try {
      const res = await tickDriveExportViaFetch(tick, { fetchImpl, url, secret });
      if (res.ok) {
        msg.ack();
        continue;
      }
      console.error("drive_export.queue_tick_falhou", { tick, status: res.status });
      msg.retry();
    } catch (e) {
      console.error("drive_export.queue_tick_erro", { tick, erro: String(e) });
      msg.retry();
    }
  }
}
