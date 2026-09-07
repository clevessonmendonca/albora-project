/**
 * Infrastructure: Session Management
 * 
 * Gestão de sessões de host (anfitrião).
 */

export {
  HOST_COOKIE,
  hostTokenFromRequest,
  hostFromRequest,
  hostFromToken,
  hostCookie,
  clearHostCookie,
} from "./host-session";
