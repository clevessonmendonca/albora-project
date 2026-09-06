// @ts-expect-error `.open-next/worker.js` é gerado no build OpenNext
import { default as handler } from "../.open-next/worker.js";
import { consumirLoteDriveExport } from "./drive-export-consumer";
import { executarRetencaoAgendada } from "./retention-cron";

export default {
  fetch: handler.fetch,

  async queue(batch, env) {
    await consumirLoteDriveExport(batch, env);
  },

  // Cron Trigger (`triggers.crons` em wrangler.jsonc, env.homol/env.prod) — sweep
  // de retenção LGPD (d330 export, d365 delete). `waitUntil` para não bloquear o
  // retorno do evento agendado enquanto o sweep roda.
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(executarRetencaoAgendada(env));
  },
} satisfies ExportedHandler<CloudflareEnv>;
