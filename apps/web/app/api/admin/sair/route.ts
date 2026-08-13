import { revogarHostSessao } from "@albora/db";
import { enforceRateLimit, jsonOk, clearHostCookie, hostTokenFromRequest } from "@/lib/api";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Sair: revoga a sessão de host no banco e apaga o cookie. */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, null, {
    max: 30,
    keyPrefix: "admin_sair:",
  });
  if (limited) return limited;

  const token = hostTokenFromRequest(req);
  if (token) {
    try {
      await revogarHostSessao(getPool(), config().sessionSecret, token);
    } catch {
      // Sair é best-effort: mesmo que a revogação falhe, o cookie some.
    }
  }

  return jsonOk({ ok: true }, { headers: { "set-cookie": clearHostCookie() } });
}
