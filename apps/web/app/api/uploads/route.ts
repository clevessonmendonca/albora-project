import { comEvento, removerUploadProprio } from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Corpo = { uploadId?: unknown };

/** Remove uma foto confirmada desta sessão (spec 008). */
export async function DELETE(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

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

  const uploadId = typeof corpo.uploadId === "string" && UUID.test(corpo.uploadId) ? corpo.uploadId : null;
  if (!uploadId) return erro(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });

  try {
    const removido = await comEvento(banco(), sessao.eventoId, (c) =>
      removerUploadProprio(c, uploadId, sessao.sessaoId),
    );

    if (!removido) return erro(403, "upload.remover_negado", "Não foi possível remover esta foto");

    return ok({ uploadId, removido: true });
  } catch (e) {
    return erroInesperado("upload.remover", e);
  }
}
