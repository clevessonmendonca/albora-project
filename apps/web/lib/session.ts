/**
 * @deprecated Importar de `@/lib/infrastructure/auth` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export {
  GUEST_SESSION_COOKIE,
  sessionCookieHeader,
  tokenFromRequest,
  guestSessionFromRequest,
  guestSessionFromToken,
  limitIdentity,
} from "./infrastructure/auth/session";
