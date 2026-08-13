import {
  derivarChaveMidia,
  ehMimeVideo,
  podeEnviarVideo,
  validarDeclaracao,
  VALIDADE_PRESIGN_SEGUNDOS,
} from "@albora/core";
import { comEvento, contarVideosDaSessao, planoDoEvento } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { assinarPut } from "@/lib/r2";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

type Corpo = { uploadId?: unknown; mime?: unknown; bytes?: unknown };

/**
 * Emite dois PUT presigned — full e thumb — e mais nada.
 *
 * O servidor **nunca toca nos bytes de mídia**: os dois sistemas do caminho
 * crítico são object storage e Postgres, e este endpoint é a única coisa
 * entre eles. Medido na task 001: 21 bytes de corpo aqui contra 819 200 no
 * storage.
 */
export async function POST(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("presign.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  // Circuito no portão: um pedido condenado não consome assinatura, nem cota,
  // nem espaço no bucket.
  const limite = consumir(identidadeParaLimite(req, sessao), 120, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Muitas fotos de uma vez", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const { uploadId, mime, bytes } = corpo;
  if (typeof uploadId !== "string" || typeof mime !== "string" || typeof bytes !== "number") {
    return erro(422, "validation_error", "Dados incompletos", {
      campos: ["uploadId", "mime", "bytes"],
    });
  }

  const invalido = validarDeclaracao(mime, bytes);
  if (invalido) return erro(422, invalido.code, "Arquivo recusado", invalido.details);

  if (ehMimeVideo(mime)) {
    const cota = await comEvento(banco(), sessao.eventoId, async (c) => {
      const plano = await planoDoEvento(c, sessao.eventoId);
      const enviados = await contarVideosDaSessao(c, sessao.eventoId, sessao.sessaoId);
      return { plano, enviados };
    });

    if (!podeEnviarVideo(cota.plano, cota.enviados)) {
      return erro(403, "video.cota_esgotada", "Limite de vídeos atingido para este convidado");
    }
  }

  // 🔴 A chave é derivada aqui, a partir do event_id da **sessão**. O cliente
  // não a informa e não a escolhe, nem no presign nem no confirm — ADR 0002 e
  // ADR 0004. Aceitar chave do cliente é o caminho mais curto para um evento
  // escrever dentro do outro.
  const chave = derivarChaveMidia(sessao.eventoId, uploadId, "full").replace(/\/full$/, "");

  try {
    const full = await assinarPut(`${chave}/full`, mime, VALIDADE_PRESIGN_SEGUNDOS);
    const thumb = ehMimeVideo(mime)
      ? await assinarPut(`${chave}/thumb`, "image/jpeg", VALIDADE_PRESIGN_SEGUNDOS)
      : await assinarPut(`${chave}/thumb`, mime, VALIDADE_PRESIGN_SEGUNDOS);

    console.log("presign.emitido", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      chave,
      bytes,
    });

    return ok({
      uploadId,
      chave,
      full,
      thumb,
      expiraEm: Date.now() + VALIDADE_PRESIGN_SEGUNDOS * 1000,
    });
  } catch (e) {
    return erroInesperado("presign.assinar", e);
  }
}
