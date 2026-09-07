const PATH = "/api/ops/retencao";
const PATH_ENTREGA = "/api/ops/entrega";

export function urlOpsRetencao(env: CloudflareEnv): string {
  const base = env.APP_URL?.replace(/\/$/, "");
  if (base) return `${base}${PATH}`;
  return `https://internal${PATH}`;
}

export function urlOpsEntrega(env: CloudflareEnv): string {
  const base = env.APP_URL?.replace(/\/$/, "");
  if (base) return `${base}${PATH_ENTREGA}`;
  return `https://internal${PATH_ENTREGA}`;
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

/**
 * Dispara o runner diário de entrega (`POST /api/ops/entrega`, ADR 0019) a
 * partir do MESMO Cron Trigger diário que já roda a retenção — não é um
 * novo agendamento em `wrangler.jsonc`, só outro `waitUntil` no mesmo
 * `scheduled()`. Mesmo padrão de self-fetch que `executarRetencaoAgendada`;
 * não relança erro pelo mesmo motivo: quem tem entrega devida continua
 * devida amanhã.
 */
export async function executarEntregaAgendada(env: CloudflareEnv): Promise<void> {
  const secret = env.CRON_SECRET;
  if (!secret) {
    console.error("entrega.cron_sem_segredo");
    return;
  }

  const fetchImpl = env.WORKER_SELF_REFERENCE
    ? (req: Request) => env.WORKER_SELF_REFERENCE!.fetch(req)
    : fetch;

  const url = urlOpsEntrega(env);

  try {
    const res = await fetchImpl(
      new Request(url, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    if (!res.ok) {
      console.error("entrega.cron_falhou", { status: res.status });
      return;
    }
    console.log("entrega.cron_ok");
  } catch (e) {
    console.error("entrega.cron_erro", { erro: String(e) });
  }
}
