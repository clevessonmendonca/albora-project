import {
  bloquearConvidado,
  comEvento,
  ErroSessaoDeOutroEvento,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Corpo = { sessaoId?: unknown };

/** Bloqueio simetrico entre convidados no evento (spec 014). */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    return erro(403, "bloqueio.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const limite = consumir(identidadeParaLimite(req, sessao), 30, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const alvo =
    typeof corpo.sessaoId === "string" && UUID.test(corpo.sessaoId) ? corpo.sessaoId : null;
  if (!alvo) {
    return erro(422, "validation_error", "Sessão inválida", { campos: ["sessaoId"] });
  }

  if (alvo === sessao.sessaoId) {
    return erro(422, "bloqueio.proprio", "Não é possível bloquear a si");
  }

  try {
    const resultado = await comEvento(banco(), sessao.eventoId, (c) =>
      bloquearConvidado(c, {
        eventoId: sessao.eventoId,
        bloqueadorId: sessao.sessaoId,
        bloqueadoId: alvo,
      }),
    );

    console.log("bloqueio.registrado", {
      eventoId: sessao.eventoId,
      bloqueadorId: sessao.sessaoId,
      novo: resultado.registrado,
    });

    return ok({ registrado: resultado.registrado });
  } catch (e) {
    if (e instanceof ErroSessaoDeOutroEvento) {
      return erro(404, "bloqueio.sessao_ausente", "Convidado não encontrado");
    }
    return erroInesperado("bloqueio", e);
  }
}
