import { prefixoDoEvento, validarObjetoRecebido } from "@albora/core";
import {
  comEvento,
  confirmarUpload,
  criarStory,
  desafioDoEvento,
  ErroUploadDeOutroEvento,
  fusoDoEvento,
  packDoEvento,
} from "@albora/db";
import { isValidConfessionPrompt, PACKS } from "@albora/packs";
import { recordFunnelEvent } from "@/features/guest/lib/record-funnel";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { cleanCaption, acceptedPlace, acceptedTakenAt, acceptedTakenAtInTimeZone, acceptedSize } from "@/lib/details";
import { inspecionarObjeto } from "@/lib/r2";

export const dynamic = "force-dynamic";

type Corpo = {
  uploadId?: unknown;
  chave?: unknown;
  mime?: unknown;
  legenda?: unknown;
  lugar?: unknown;
  desafioId?: unknown;
  promptKey?: unknown;
  capturadaEm?: unknown;
  capturadaEmParede?: unknown;
  largura?: unknown;
  altura?: unknown;
  story?: unknown;
};

export async function POST(req: Request) {
  const configError = requireConfig("confirm");
  if (configError) return configError;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, {
    message: "Muitas fotos de uma vez",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const {
    uploadId,
    chave,
    mime,
    legenda,
    lugar,
    desafioId,
    promptKey,
    capturadaEm,
    capturadaEmParede,
    largura,
    altura,
    story,
  } = parsed.data;
  if (typeof uploadId !== "string" || typeof chave !== "string" || typeof mime !== "string") {
    return errorResponse(422, "validation_error", "Dados incompletos", {
      campos: ["uploadId", "chave", "mime"],
    });
  }

  if (!chave.startsWith(prefixoDoEvento(auth.session.eventoId))) {
    console.warn("confirm.chave_de_outro_evento", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
    });
    return errorResponse(403, "upload.chave_invalida", "Chave não pertence a este evento");
  }

  try {
    const objeto = await inspecionarObjeto(`${chave}/full`);
    if (!objeto) {
      return errorResponse(409, "upload.objeto_ausente", "O arquivo ainda não chegou", {
        chave: `${chave}/full`,
      });
    }

    const recusa = validarObjetoRecebido(mime, objeto.bytes, objeto.inicio);
    if (recusa) {
      console.warn("confirm.conteudo_recusado", {
        eventoId: auth.session.eventoId,
        ...recusa.details,
      });
      return errorResponse(422, recusa.code, "Arquivo recusado", recusa.details);
    }

    const resultado = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const daMissao =
        typeof desafioId === "string" && (await desafioDoEvento(c, auth.session.eventoId, desafioId))
          ? desafioId
          : null;

      const packId = await packDoEvento(c, auth.session.eventoId);
      const pack = packId ? PACKS[packId] : undefined;
      let prompt: string | null = null;
      if (typeof promptKey === "string" && pack && isValidConfessionPrompt(pack, promptKey)) {
        if (!mime.startsWith("video/")) {
          return { erro: "confessionario.video" as const };
        }
        prompt = promptKey;
      }

      const fuso = await fusoDoEvento(c, auth.session.eventoId);
      const tamanho = acceptedSize(largura, altura);
      const takenAt =
        capturadaEmParede === true
          ? acceptedTakenAtInTimeZone(capturadaEm, fuso)
          : acceptedTakenAt(capturadaEm);

      const confirmado = await confirmarUpload(c, {
        uploadId,
        eventId: auth.session.eventoId,
        sessionId: auth.session.sessaoId,
        challengeId: daMissao,
        storageKey: `${chave}/full`,
        mime,
        bytes: objeto.bytes,
        caption: cleanCaption(legenda),
        place: acceptedPlace(packId, lugar),
        takenAt,
        width: tamanho?.width ?? null,
        height: tamanho?.height ?? null,
        promptKey: prompt,
      });

      // Marca a story na MESMA transação do confirm, não numa segunda chamada:
      // a fila offline já retenta o confirm até ele passar (spec 020), e
      // reaproveitar esse retry evita um segundo round-trip que poderia falhar
      // depois de a foto já estar salva — a foto nunca espera a story.
      // Idempotente via `UNIQUE (upload_id)`: o mesmo retry marcando duas
      // vezes não duplica.
      if (story === true) {
        await criarStory(c, {
          eventoId: auth.session.eventoId,
          sessaoId: auth.session.sessaoId,
          uploadId,
        });
      }

      return { ok: true as const, resultado: confirmado };
    });

    if ("erro" in resultado) {
      return errorResponse(422, resultado.erro, "O confessionário pede um vídeo");
    }

    const { resultado: confirmado } = resultado;

    console.log("confirm.ok", {
      eventoId: auth.session.eventoId,
      uploadId,
      estado: confirmado.estado,
      bytes: objeto.bytes,
    });

    if (confirmado.estado === "criado") {
      await recordFunnelEvent(auth.session.eventoId, auth.session.sessaoId, "upload_ok");
    }

    return jsonOk({ uploadId, estado: confirmado.estado });
  } catch (e) {
    if (e instanceof ErroUploadDeOutroEvento) {
      return errorResponse(403, "upload.chave_invalida", "Chave não pertence a este evento");
    }
    return unexpectedError("confirm", e);
  }
}
