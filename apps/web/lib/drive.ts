/**
 * @deprecated Importar de `@/lib/infrastructure/storage/drive` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export {
  getDriveVault,
  getDriveClient,
  DRIVE_SCOPE,
  DRIVE_AUTH_ENDPOINT,
} from "./infrastructure/storage/drive/drive";
export type { DriveTokenVault as DriveVault } from "@albora/core";
