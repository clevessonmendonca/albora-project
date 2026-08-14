import { criarPareamento } from "@albora/db";
import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";
import { consume } from "@/lib/rate-limit-store";
import { pairingCookie } from "@/lib/wall";

export const dynamic = "force-dynamic";

const VALIDADE_PAREAMENTO_SEGUNDOS = 10 * 60;

/**
 * A TV abre um pareamento (spec 010).
 *
 * Sem sessão e sem evento — a TV ainda não pertence a nenhum. O servidor
 * devolve um **código** curto para a tela e guarda o **token de poll** num
 * cookie `HttpOnly`: o segredo de máquina nunca aparece na tela nem no corpo da
 * resposta. Quem já está no evento é que autoriza, e é de lá que o evento vem.
 */
export async function POST(req: Request) {
  const configError = requireConfig("parede");
  if (configError) return configError;

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limite = consume(`parear:${ip.split(",")[0]!.trim()}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const expiraEm = new Date(Date.now() + VALIDADE_PAREAMENTO_SEGUNDOS * 1000);
    const { code, pollToken } = await criarPareamento(getPool(), config().sessionSecret, expiraEm);

    console.log("parede.pareamento_criado", { expiraEm: expiraEm.toISOString() });

    return jsonOk(
      { code, expiraEm: expiraEm.toISOString() },
      {
        status: 201,
        headers: { "set-cookie": pairingCookie(pollToken, VALIDADE_PAREAMENTO_SEGUNDOS) },
      },
    );
  } catch (e) {
    return unexpectedError("parede.parear", e);
  }
}
