import { pareamentoPorLinkValido } from "@albora/db";
import { errorResponse, parseJsonBody, requireConfig, unexpectedError } from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { pairingCookie } from "@/lib/wall";

type Body = { token?: unknown };

/** TV abre o link do anfitrião: valida sem consumir e entrega o token de poll em cookie HttpOnly; o crachá sai no poll de sempre (uso único). */
export async function POST(req: Request) {
  const configError = requireConfig("parede");
  if (configError) return configError;

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limit = consume(`parear_link:${ip.split(",")[0]!.trim()}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const token = typeof parsed.data.token === "string" ? parsed.data.token.trim() : "";
  if (!token || token.length > 200) {
    return errorResponse(422, "validation_error", "Link inválido", { campos: ["token"] });
  }

  try {
    const agora = new Date();
    const r = await pareamentoPorLinkValido(getPool(), config().sessionSecret, token, agora);
    if (!r.valido) {
      return errorResponse(410, "parede.link_invalido", "Link inválido, expirado ou já usado");
    }

    const restante = Math.max(1, Math.floor((r.expiraEm.getTime() - agora.getTime()) / 1000));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "set-cookie": pairingCookie(token, restante),
      },
    });
  } catch (e) {
    return unexpectedError("parede.link_abrir", e);
  }
}
