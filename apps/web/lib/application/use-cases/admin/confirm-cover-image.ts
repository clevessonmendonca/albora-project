/**
 * Use Case: Confirm Cover Image Upload
 *
 * Confirma upload e valida conteúdo da imagem de capa.
 */
import {
  isCoverImageKey,
  normalizeCoverImageMime,
  validateCoverImageDeclaration,
  validateCoverImageContent,
  VALIDADE_PRESIGN_SEGUNDOS,
  type CoverImageMime,
} from "@albora/core";
import { atualizarChaveImagemCapa, withEvent } from "@albora/db";
import type { Pool } from "pg";
import { inspectObject, signGet } from "@/lib/r2";

export type ConfirmCoverImageInput = {
  eventId: string;
  accountId: string;
  chave: string;
  mime: string;
};

export type ConfirmCoverImageResult =
  | {
      ok: true;
      chave: string;
      url: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

export async function confirmCoverImageUpload(
  input: ConfirmCoverImageInput,
  pool: Pool,
): Promise<ConfirmCoverImageResult> {
  if (!isCoverImageKey(input.eventId, input.chave)) {
    return {
      ok: false,
      code: "imagem.chave_invalida",
      message: "Chave de storage inválida",
    };
  }

  const mimeNormalizado: CoverImageMime | null = normalizeCoverImageMime(input.mime);
  if (!mimeNormalizado) {
    return {
      ok: false,
      code: "imagem.tipo_recusado",
      message: "Formato não aceito",
      details: {
        aceitos: ["image/jpeg", "image/png", "image/webp"],
        recebido: input.mime,
      },
    };
  }

  const objeto = await inspectObject(input.chave);
  if (!objeto) {
    return {
      ok: false,
      code: "imagem.ausente",
      message: "A imagem ainda não chegou ao storage",
    };
  }

  const invalido = validateCoverImageDeclaration(mimeNormalizado, objeto.bytes);
  if (invalido) {
    return {
      ok: false,
      code: invalido,
      message: invalido === "imagem.vazia" ? "Imagem vazia" : "Imagem grande demais",
      details: invalido === "imagem.grande_demais" ? { limite_bytes: 10 * 1024 * 1024 } : undefined,
    };
  }

  if (!validateCoverImageContent(mimeNormalizado, objeto.inicio)) {
    return {
      ok: false,
      code: "imagem.conteudo_recusado",
      message: "Arquivo recusado",
    };
  }

  await withEvent(pool, input.eventId, (c) =>
    atualizarChaveImagemCapa(c, input.eventId, input.chave),
  );

  const url = await signGet(input.chave, VALIDADE_PRESIGN_SEGUNDOS);

  console.log("admin.cover_image.confirmado", {
    accountId: input.accountId,
    eventId: input.eventId,
  });

  return {
    ok: true,
    chave: input.chave,
    url: url.toString(),
  };
}
