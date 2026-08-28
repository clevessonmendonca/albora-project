/**
 * @deprecated Importar de `@/lib/infrastructure/storage` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export type { R2UploadResult, PresignedPutUrlOptions } from "./infrastructure/storage/r2-client";
export { getR2Client, uploadMedia, presignedPutUrl } from "./infrastructure/storage/r2-client";
