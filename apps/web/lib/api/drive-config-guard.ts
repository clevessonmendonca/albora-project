import { ConfigError } from "@/lib/config";
import { driveConfig } from "@/lib/drive-config";
import { errorResponse } from "./response";

/**
 * Espelha `requireConfig` (config-guard.ts), mas para os segredos do Drive —
 * validados só no primeiro uso da rota de Drive, nunca em `config()` global
 * (CLAUDE.md, instrução do mantenedor: as chaves chegam depois, e ambientes
 * sem Drive não podem quebrar no boot).
 */
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
