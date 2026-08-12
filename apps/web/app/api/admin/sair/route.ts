import { revogarHostSessao } from "@albora/db";
import { banco } from "@/lib/banco";
import { config } from "@/lib/config";
import { limparCookieHost, tokenDoHost } from "@/lib/host-sessao";

export const dynamic = "force-dynamic";

/** Sair: revoga a sessão de host no banco e apaga o cookie. */
export async function POST(req: Request) {
  const token = tokenDoHost(req);
  if (token) {
    try {
      await revogarHostSessao(banco(), config().sessionSecret, token);
    } catch {
      // Sair é best-effort: mesmo que a revogação falhe, o cookie some.
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "set-cookie": limparCookieHost(),
    },
  });
}
