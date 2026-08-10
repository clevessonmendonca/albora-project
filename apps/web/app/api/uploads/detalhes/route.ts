import { anotarUpload, comEvento, packDoEvento } from "@albora/db";
import { banco } from "@/lib/banco";
import { legendaLimpa, lugarAceito } from "@/lib/detalhes";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Corpo = { uploadId?: unknown; legenda?: unknown; lugar?: unknown };

/**
 * Legenda e lugar de uma foto que **já subiu**.
 *
 * Existe porque a subida começa antes de o convidado digitar (§3.6): numa rede
 * boa a foto termina em dois segundos, e a legenda chega depois. Enquanto o
 * item ainda está na fila, quem anota é a própria fila; quando ele já saiu, é
 * esta rota.
 *
 * Nada aqui é obrigatório e nada aqui pode falhar de forma visível — a foto já
 * está no álbum, e é ela que importa.
 */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(identidadeParaLimite(req, sessao), 120, 60, Date.now());
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

  const { uploadId, legenda, lugar } = corpo;
  if (typeof uploadId !== "string" || !UUID.test(uploadId)) {
    return erro(422, "validation_error", "Dados incompletos", { campos: ["uploadId"] });
  }

  try {
    const anotado = await comEvento(banco(), sessao.eventoId, async (c) => {
      const packId = await packDoEvento(c, sessao.eventoId);

      return anotarUpload(c, {
        uploadId,
        sessionId: sessao.sessaoId,
        caption: legendaLimpa(legenda),
        place: lugarAceito(packId, lugar),
      });
    });

    // Sem o texto no log: legenda é conteúdo do convidado, e pode conter nome
    // de quem está na foto.
    console.log("detalhes.anotado", { eventoId: sessao.eventoId, uploadId, anotado });

    return ok({ uploadId, anotado });
  } catch (e) {
    return erroInesperado("detalhes", e);
  }
}
