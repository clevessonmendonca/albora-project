import { comEvento, denunciar, ErroMidiaDeOutroEvento } from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Corpo = { uploadId?: unknown };

/**
 * Denúncia de uma foto por um convidado, sem login (spec 011).
 *
 * As 150 pessoas na sala são o melhor sensor de moderação, e são de graça:
 * duas denúncias tiram a foto do telão sozinhas. A decisão de exibição não
 * mora aqui — este handler só registra o sinal; `decidirExibicao` do
 * `@albora/core` o lê no caminho do telão e do feed.
 *
 * As mesmas regras do resto da interação, e nenhuma é negociável:
 *
 * 1. **O evento vem da sessão, nunca da URL.** O `evento` da querystring, se
 *    vier, é conferido contra ela — divergência é 403, nunca "usa o da URL".
 * 2. **A foto tem de ser deste evento.** `denunciar` confere a visibilidade
 *    sob RLS antes de gravar e recusa a foto de outra festa; a resposta é a de
 *    "não existe", porque distinguir já contaria que aquele id vive noutro
 *    evento.
 */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(identidadeParaLimite(req, sessao), 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    console.warn("denuncia.evento_divergente", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
    });
    return erro(403, "denuncia.evento_divergente", "Esta sessão não pertence a este evento");
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const { uploadId } = corpo;
  if (typeof uploadId !== "string" || !UUID.test(uploadId)) {
    return erro(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });
  }

  try {
    const resultado = await comEvento(banco(), sessao.eventoId, (c) =>
      denunciar(c, { uploadId, sessaoId: sessao.sessaoId }),
    );

    console.log("denuncia.registrada", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      uploadId,
      novaDenuncia: resultado.registrada,
    });

    return ok({ registrada: resultado.registrada });
  } catch (e) {
    if (e instanceof ErroMidiaDeOutroEvento) {
      // Foto não é deste evento: mesma resposta de "não existe". Distinguir
      // contaria ao convidado que aquele id vive em outra festa.
      return erro(404, "midia.inexistente", "Foto não encontrada");
    }
    return erroInesperado("denuncia", e);
  }
}
