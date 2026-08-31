import { ConfigError } from "@/lib/config";
import { driveConfig } from "@/lib/drive-config";
import { errorResponse } from "./response";

/** Espelha `requireConfig` mas para segredos do Drive — validados só no primeiro uso, nunca em `config()` global; ambientes sem Drive não quebram no boot. */
export function requireDriveConfig(context: string): Response | null {
  try {
    driveConfig();
    return null;
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`${context}.drive_config_ausente`, { faltando: e.missing });
      return errorResponse(503, "config.missing", "Conexão com o Drive indisponível");
    }
    throw e;
  }
}
