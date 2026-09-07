import type { HostResolvida } from "@albora/db";
import { hostFromRequest } from "@/lib/host-session";
import { errorResponse } from "./response";

export { hostCookie, clearHostCookie, hostTokenFromRequest } from "@/lib/host-session";

export type HostSessionOptions = {
  message?: string;
  code?: string;
};

export async function requireHostSession(
  req: Request,
  options: HostSessionOptions = {},
): Promise<{ host: HostResolvida } | Response> {
  const host = await hostFromRequest(req);
  if (!host) {
    return errorResponse(
      401,
      options.code ?? "host.sessao_invalida",
      options.message ?? "Sessão inválida",
    );
  }
  return { host };
}
