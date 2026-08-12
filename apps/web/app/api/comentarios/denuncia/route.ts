import {
  comEvento,
  denunciarComentario,
  ErroComentarioDeOutroEvento,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Corpo = { comentarioId?: unknown };

/** Denuncia de comentario (spec 014) — mesmo caminho da denuncia em foto. */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    return erro(403, "comentarios.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const limite = consumir(identidadeParaLimite(req, sessao), 60, 60, Date.now());
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

  const comentarioId =
    typeof corpo.comentarioId === "string" && UUID.test(corpo.comentarioId)
      ? corpo.comentarioId
      : null;
  if (!comentarioId) {
    return erro(422, "validation_error", "Comentário inválido", { campos: ["comentarioId"] });
  }

  try {
    const resultado = await comEvento(banco(), sessao.eventoId, (c) =>
      denunciarComentario(c, { comentarioId, sessaoId: sessao.sessaoId }),
    );

    console.log("comentarios.denuncia", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      comentarioId,
      nova: resultado.registrada,
    });

    return ok({ registrada: resultado.registrada });
  } catch (e) {
    if (e instanceof ErroComentarioDeOutroEvento) {
      return erro(404, "comentario.inexistente", "Comentário não encontrado");
    }
    return erroInesperado("comentarios.denuncia", e);
  }
}
