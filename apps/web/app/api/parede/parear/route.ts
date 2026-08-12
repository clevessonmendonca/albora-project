import { criarPareamento } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { cookieDoPareamento } from "@/lib/parede";
import { erro, erroInesperado } from "@/lib/resposta";

export const dynamic = "force-dynamic";

/** O pareamento vive pouco: a TV mostra o código e alguém autoriza em minutos. */
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
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("parede.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limite = consumir(`parear:${ip.split(",")[0]!.trim()}`, 30, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  try {
    const expiraEm = new Date(Date.now() + VALIDADE_PAREAMENTO_SEGUNDOS * 1000);
    const { code, pollToken } = await criarPareamento(banco(), config().sessionSecret, expiraEm);

    console.log("parede.pareamento_criado", { expiraEm: expiraEm.toISOString() });

    return new Response(JSON.stringify({ code, expiraEm: expiraEm.toISOString() }), {
      status: 201,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "set-cookie": cookieDoPareamento(pollToken, VALIDADE_PAREAMENTO_SEGUNDOS),
      },
    });
  } catch (e) {
    return erroInesperado("parede.parear", e);
  }
}
