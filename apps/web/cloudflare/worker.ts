// @ts-expect-error `.open-next/worker.js` é gerado no build OpenNext
import { default as handler } from "../.open-next/worker.js";
import { consumirLoteDriveExport } from "./drive-export-consumer";
import { executarEntregaAgendada, executarRetencaoAgendada } from "./retention-cron";

export default {
  fetch: handler.fetch,

  async queue(batch, env) {
    await consumirLoteDriveExport(batch, env);
  },

  // Cron Trigger (`triggers.crons` em wrangler.jsonc, env.homol/env.prod) — sweep
  // de retenção LGPD (d330 export, d365 delete) e runner diário de entrega das
  // fotos (ADR 0019), mesmo disparo diário, não dois agendamentos. `waitUntil`
  // para não bloquear o retorno do evento agendado enquanto os sweeps rodam.
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(executarRetencaoAgendada(env));
    ctx.waitUntil(executarEntregaAgendada(env));
  },
} satisfies ExportedHandler<CloudflareEnv>;
