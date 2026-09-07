import type { DriveTokenVault } from "@albora/core";
import { VaultDeTokenDrive } from "@albora/db";
import { driveConfig } from "./drive-config";
import { googleDriveClient, type DriveClient } from "./drive-client";

/** Memoizada como `getPool()`, mas construída só depois de `driveConfig()` validar segredos. `keyVersion` fixo em 1; rotação (spec §2) troca e passa versão antiga como `chavesAntigas`. */

let vault: DriveTokenVault | null = null;

export function getDriveVault(): DriveTokenVault {
  if (!vault) {
    const { tokenEncKey } = driveConfig();
    vault = new VaultDeTokenDrive({ versao: 1, chave: tokenEncKey });
  }
  return vault;
}

let client: DriveClient | null = null;

export function getDriveClient(): DriveClient {
  if (!client) {
    const { oauthClientId, oauthClientSecret } = driveConfig();
    client = googleDriveClient(oauthClientId, oauthClientSecret);
  }
  return client;
}

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
