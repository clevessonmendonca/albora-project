/**
 * Use Case: Confirm Upload
 * 
 * Confirma um upload de mídia após validações completas de negócio.
 */

import {
  prefixoDoEvento,
  validarObjetoRecebido,
  withinPlanDimensions,
  logger,
  metrics,
} from "@albora/core";
import {
  withEvent,
  confirmUpload as confirmUploadDB,
  createStory,
  challengeBelongsToEvent,
  UploadConflictError,
  eventTimeZone,
  eventPack,
  planoDoEvento,
} from "@albora/db";
import { isValidConfessionPrompt, PACKS } from "@albora/packs";
import type { PoolClient } from "pg";
import {
  cleanCaption,
  acceptedPlace,
  acceptedTakenAt,
  acceptedTakenAtInTimeZone,
  acceptedSize,
} from "@/lib/details";

export type ConfirmUploadInput = {
  eventoId: string;
  sessaoId: string;
  uploadId: string;
  chave: string;
  mime: string;
  bytes: number;
  inicio: ArrayBuffer;
  thumbBytes: number;
  thumbInicio: ArrayBuffer;
  legenda?: string;
  lugar?: string;
  desafioId?: string;
  promptKey?: string;
  capturadaEm?: string | number;
  capturadaEmParede?: boolean;
  largura?: number;
  altura?: number;
  story?: boolean;
  musicTrackId?: string;
};

export type ConfirmUploadResult =
  | {
      ok: true;
      uploadId: string;
      estado: "criado" | "duplicado" | "aprovacao";
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

/**
 * Confirma upload de mídia com validações completas.
 * 
 * Validações:
 * - Chave pertence ao evento
 * - Objeto e thumb existem e são válidos
 * - Missão pertence ao evento (se informada)
 * - Pack/confessionário são válidos
 * - Tamanho respeita limites do plano
 * 
 * Cria story opcionalmente (degrada em caso de falha).
 * 
 * @param input - Dados do upload e metadados
 * @param getClient - Factory de conexão
 * @returns Resultado da confirmação ou erro
 * @throws {UploadConflictError} Se chave não pertence ao evento
 */
export async function confirmUpload(
  input: ConfirmUploadInput,
  getClient: () => Promise<PoolClient>,
): Promise<ConfirmUploadResult> {
  const log = logger.child({ eventId: input.eventoId, uploadId: input.uploadId });

  if (!input.chave.startsWith(prefixoDoEvento(input.eventoId))) {
    log.warn({ sessaoId: input.sessaoId }, "confirm.chave_de_outro_evento");
    metrics.increment("upload.failed", 1, { eventId: input.eventoId, reason: "invalid_key" });
    return {
      ok: false,
      code: "upload.chave_invalida",
      message: "Chave não pertence a este evento",
    };
  }

  const recusa = validarObjetoRecebido(input.mime, input.bytes, input.inicio);
  if (recusa) {
    log.warn({ ...recusa.details }, "confirm.conteudo_recusado");
    metrics.increment("upload.failed", 1, { eventId: input.eventoId, reason: "content_rejected" });
    return {
      ok: false,
      code: recusa.code,
      message: "Arquivo recusado",
      details: recusa.details,
    };
  }

  const recusaThumb = validarObjetoRecebido(
    "image/jpeg",
    input.thumbBytes,
    input.thumbInicio,
  );
  if (recusaThumb) {
    log.warn({ ...recusaThumb.details }, "confirm.thumb_recusada");
    metrics.increment("upload.failed", 1, { eventId: input.eventoId, reason: "thumb_rejected" });
    return {
      ok: false,
      code: recusaThumb.code,
      message: "Miniatura recusada",
      details: recusaThumb.details,
    };
  }

  const client = await getClient();

  try {
    const resultado = await withEvent(
      { query: client.query.bind(client) } as PoolClient,
      input.eventoId,
      async (c) => {
        // Validar missão
        const daMissao =
          input.desafioId &&
          (await challengeBelongsToEvent(c, input.eventoId, input.desafioId))
            ? input.desafioId
            : null;

        // Validar pack e confessionário
        const packId = await eventPack(c, input.eventoId);
        const pack = packId ? PACKS[packId] : undefined;
        let prompt: string | null = null;
        if (input.promptKey && pack && isValidConfessionPrompt(pack, input.promptKey)) {
          if (!input.mime.startsWith("video/")) {
            return { erro: "confessionario.video" as const };
          }
          prompt = input.promptKey;
        }

        // Preparar metadados
        const fuso = await eventTimeZone(c, input.eventoId);
        const tamanho = acceptedSize(input.largura, input.altura);
        const takenAt =
          input.capturadaEmParede === true
            ? acceptedTakenAtInTimeZone(input.capturadaEm, fuso)
            : acceptedTakenAt(input.capturadaEm);

        // Validar limites do plano (apenas para imagens)
        if (!input.mime.startsWith("video/") && tamanho) {
          const plano = await planoDoEvento(c, input.eventoId);
          const limite = withinPlanDimensions(
            tamanho.width,
            tamanho.height,
            plano,
          );
          if (!limite.ok) {
            return {
              erro: "upload.resolucao_acima_do_plano" as const,
              limite: limite.limite,
              ladoMaior: limite.ladoMaior,
            };
          }
        }

        // Confirmar upload
        const confirmado = await confirmUploadDB(c, {
          uploadId: input.uploadId,
          eventId: input.eventoId,
          sessionId: input.sessaoId,
          challengeId: daMissao,
          storageKey: `${input.chave}/full`,
          mime: input.mime,
          bytes: input.bytes,
          caption: cleanCaption(input.legenda),
          place: acceptedPlace(packId, input.lugar),
          takenAt,
          width: tamanho?.width ?? null,
          height: tamanho?.height ?? null,
          promptKey: prompt,
        });

        // Criar story (degradável)
        if (input.story === true) {
          await c.query("SAVEPOINT marcar_story");
          try {
            await createStory(c, {
              eventoId: input.eventoId,
              sessaoId: input.sessaoId,
              uploadId: input.uploadId,
              musicTrackId: input.musicTrackId || null,
            });
            await c.query("RELEASE SAVEPOINT marcar_story");
          } catch {
            await c.query("ROLLBACK TO SAVEPOINT marcar_story");
            log.warn("confirm.story_falhou");
          }
        }

        return { ok: true as const, resultado: confirmado };
      },
    );

    if ("erro" in resultado) {
      if (resultado.erro === "confessionario.video") {
        return {
          ok: false,
          code: resultado.erro,
          message: "O confessionário pede um vídeo",
        };
      }
      return {
        ok: false,
        code: resultado.erro,
        message: "A foto passou do tamanho do plano",
        details: {
          limite: resultado.limite,
          ladoMaior: resultado.ladoMaior,
        },
      };
    }

    const { resultado: confirmado } = resultado;

    console.log("confirm.ok", {
      eventoId: input.eventoId,
      uploadId: input.uploadId,
      estado: confirmado.estado,
      bytes: input.bytes,
    });

    return {
      ok: true,
      uploadId: input.uploadId,
      estado: confirmado.estado,
    };
  } catch (e) {
    if (e instanceof UploadConflictError) {
      return {
        ok: false,
        code: "upload.chave_invalida",
        message: "Chave não pertence a este evento",
      };
    }
    throw e;
  } finally {
    client.release();
  }
}
