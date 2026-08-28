import { prefixoDoEvento, validarObjetoRecebido, withinPlanDimensions } from "@albora/core";
import {
  withEvent,
  confirmUpload,
  createStory,
  challengeBelongsToEvent,
  UploadConflictError,
  eventTimeZone,
  eventPack,
  planoDoEvento,
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
  musicTrackId?: unknown;
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
    musicTrackId,
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

    const thumb = await inspecionarObjeto(`${chave}/thumb`);
    if (!thumb) {
      return errorResponse(409, "upload.thumb_ausente", "A miniatura ainda não chegou", {
        chave: `${chave}/thumb`,
      });
    }

    const recusaThumb = validarObjetoRecebido("image/jpeg", thumb.bytes, thumb.inicio);
    if (recusaThumb) {
      console.warn("confirm.thumb_recusada", {
        eventoId: auth.session.eventoId,
        ...recusaThumb.details,
      });
      return errorResponse(422, recusaThumb.code, "Miniatura recusada", recusaThumb.details);
    }

    const resultado = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const daMissao =
        typeof desafioId === "string" && (await challengeBelongsToEvent(c, auth.session.eventoId, desafioId))
          ? desafioId
          : null;

      const packId = await eventPack(c, auth.session.eventoId);
      const pack = packId ? PACKS[packId] : undefined;
      let prompt: string | null = null;
      if (typeof promptKey === "string" && pack && isValidConfessionPrompt(pack, promptKey)) {
        if (!mime.startsWith("video/")) {
          return { erro: "confessionario.video" as const };
        }
        prompt = promptKey;
      }

      const fuso = await eventTimeZone(c, auth.session.eventoId);
      const tamanho = acceptedSize(largura, altura);
      const takenAt =
        capturadaEmParede === true
          ? acceptedTakenAtInTimeZone(capturadaEm, fuso)
          : acceptedTakenAt(capturadaEm);

      if (!mime.startsWith("video/") && tamanho) {
        const plano = await planoDoEvento(c, auth.session.eventoId);
        const limite = withinPlanDimensions(tamanho.width, tamanho.height, plano);
        if (!limite.ok) {
          return {
            erro: "upload.resolucao_acima_do_plano" as const,
            limite: limite.limite,
            ladoMaior: limite.ladoMaior,
          };
        }
      }

      const confirmado = await confirmUpload(c, {
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

      // Story marcada na mesma transação do confirm, atrás de SAVEPOINT — falha em createStory reverte só a story, nunca o confirm da foto (story degrada, nunca falha); idempotente via UNIQUE (upload_id).
      if (story === true) {
        await c.query("SAVEPOINT marcar_story");
        try {
          await createStory(c, {
            eventoId: auth.session.eventoId,
            sessaoId: auth.session.sessaoId,
            uploadId,
            musicTrackId: typeof musicTrackId === "string" ? musicTrackId : null,
          });
          await c.query("RELEASE SAVEPOINT marcar_story");
        } catch {
          await c.query("ROLLBACK TO SAVEPOINT marcar_story");
          console.warn("confirm.story_falhou", {
            eventoId: auth.session.eventoId,
            sessaoId: auth.session.sessaoId,
            uploadId,
          });
        }
      }

      return { ok: true as const, resultado: confirmado };
    });

    if ("erro" in resultado) {
      if (resultado.erro === "confessionario.video") {
        return errorResponse(422, resultado.erro, "O confessionário pede um vídeo");
      }
      return errorResponse(422, resultado.erro, "A foto passou do tamanho do plano", {
        limite: resultado.limite,
        ladoMaior: resultado.ladoMaior,
      });
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
    if (e instanceof UploadConflictError) {
      return errorResponse(403, "upload.chave_invalida", "Chave não pertence a este evento");
    }
    return unexpectedError("confirm", e);
  }
}
