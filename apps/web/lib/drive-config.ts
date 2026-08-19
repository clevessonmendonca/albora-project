import { ConfigError } from "./config";

/**
 * Config do Google Drive — validada só no primeiro uso da rota de Drive,
 * NUNCA em `config()` global (CLAUDE.md, instrução do mantenedor: as chaves
 * chegam depois, e ambientes que nunca usam Drive não podem quebrar no boot
 * por falta delas). Mesma disciplina de segredo: `driveConfig()` lança
 * `ConfigError` — a mesma classe que já valida `SESSION_SECRET`/R2 — nunca
 * um default inseguro.
 *
 * Três segredos, três domínios de confiança, nunca compartilhados entre si
 * nem com `SESSION_SECRET`: comprometer um não expõe os outros.
 */

export type DriveConfig = {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthStateSecret: string;
  /** 32 bytes — chave AES-256 do vault, decodificada de base64. */
  tokenEncKey: Buffer;
};

let memo: DriveConfig | null = null;

export function driveConfig(): DriveConfig {
  if (memo) return memo;

  const missing: string[] = [];
  const readEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) missing.push(name);
    return value ?? "";
  };

  const oauthClientId = readEnv("DRIVE_OAUTH_CLIENT_ID");
  const oauthClientSecret = readEnv("DRIVE_OAUTH_CLIENT_SECRET");
  const oauthStateSecret = readEnv("DRIVE_OAUTH_STATE_SECRET");
  const tokenEncKeyRaw = readEnv("DRIVE_TOKEN_ENC_KEY");

  if (missing.length > 0) throw new ConfigError(missing);

  if (oauthStateSecret.length < 32) {
    throw new ConfigError(["DRIVE_OAUTH_STATE_SECRET (mínimo 32 caracteres)"]);
  }

  let tokenEncKey: Buffer;
  try {
    tokenEncKey = Buffer.from(tokenEncKeyRaw, "base64");
  } catch {
    throw new ConfigError(["DRIVE_TOKEN_ENC_KEY (base64 inválido)"]);
  }
  if (tokenEncKey.length !== 32) {
    throw new ConfigError(["DRIVE_TOKEN_ENC_KEY (precisa decodificar para 32 bytes — AES-256)"]);
  }

  memo = { oauthClientId, oauthClientSecret, oauthStateSecret, tokenEncKey };
  return memo;
}
