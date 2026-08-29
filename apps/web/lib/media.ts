/**
 * @deprecated Importar de `@/lib/domain/media` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export type { MediaUrl } from "./domain/media/process";
export {
  mediaUrls,
  isExpired,
  RENEWAL_BUFFER_MS,
  MediaError,
} from "./domain/media/process";
