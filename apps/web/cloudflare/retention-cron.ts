const PATH = "/api/ops/retencao";

export function urlOpsRetencao(env: CloudflareEnv): string {
  const base = env.APP_URL?.replace(/\/$/, "");
  if (base) return `${base}${PATH}`;
  return `https://internal${PATH}`;
}

/**
 * Dispara o sweep de retenção LGPD (`POST /api/ops/retencao`, d330 export / d365 delete)
 * a partir do Cron Trigger declarado em `wrangler.jsonc` (`env.homol`/`env.prod`).
 * Um Cron Trigger não recebe request de entrada, só `env` — por isso o self-fetch,
 * mesmo padrão que `drive-export-consumer.ts` usa para a fila de export.
 * Não relança erro: o worker não deve marcar a invocação do cron como falha por um
 * sweep que pode tentar de novo amanhã (jobs "devidos" continuam devidos).
 */
export async function executarRetencaoAgendada(env: CloudflareEnv): Promise<void> {
  const secret = env.CRON_SECRET;
  if (!secret) {
    console.error("retencao.cron_sem_segredo");
    return;
  }

  const fetchImpl = env.WORKER_SELF_REFERENCE
    ? (req: Request) => env.WORKER_SELF_REFERENCE!.fetch(req)
    : fetch;

  const url = urlOpsRetencao(env);

  try {
    const res = await fetchImpl(
      new Request(url, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    if (!res.ok) {
      console.error("retencao.cron_falhou", { status: res.status });
      return;
    }
    console.log("retencao.cron_ok");
  } catch (e) {
    console.error("retencao.cron_erro", { erro: String(e) });
  }
}
