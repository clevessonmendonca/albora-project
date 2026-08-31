import { config, ErroConfig, ErroOrigemDeMidia } from "@/lib/config";
import { errorResponse } from "./response";

export type RequireConfigOptions = {
  log?: boolean;
  mediaOrigin?: boolean;
};

/** Returns a 503 response when required env config is missing; otherwise null. */
export function requireConfig(
  context: string,
  options: RequireConfigOptions = {},
): Response | null {
  try {
    config();
    return null;
  } catch (e) {
    if (e instanceof ErroConfig) {
      if (options.log !== false) {
        console.error(`${context}.config_ausente`, { faltando: e.faltando });
      }
      return errorResponse(503, "config.missing", "Serviço indisponível");
    }
    if (options.mediaOrigin && e instanceof ErroOrigemDeMidia) {
      return errorResponse(503, e.code, "Serviço indisponível");
    }
    throw e;
  }
}
