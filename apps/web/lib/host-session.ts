/**
 * @deprecated Importar de `@/lib/infrastructure/session` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export {
  HOST_COOKIE,
  hostTokenFromRequest,
  hostFromRequest,
  hostFromToken,
  hostCookie,
  clearHostCookie,
} from "./infrastructure/session/host-session";
