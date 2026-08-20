// @ts-expect-error `.open-next/worker.js` é gerado no build OpenNext
import { default as handler } from "../.open-next/worker.js";
import { consumirLoteDriveExport } from "./drive-export-consumer";

export default {
  fetch: handler.fetch,

  async queue(batch, env) {
    await consumirLoteDriveExport(batch, env);
  },
} satisfies ExportedHandler<CloudflareEnv>;
