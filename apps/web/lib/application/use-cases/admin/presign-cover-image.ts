/**
 * Use Case: Presign Cover Image Upload
 *
 * Gera URL presignada para upload de imagem de capa.
 */
import {
  deriveCoverImageKey,
  normalizeCoverImageMime,
  validateCoverImageDeclaration,
  VALIDADE_PRESIGN_SEGUNDOS,
  type CoverImageMime,
} from "@albora/core";
import { signPut } from "@/lib/r2";

export type PresignCoverImageInput = {
  eventId: string;
  accountId: string;
  mime: string;
  bytes: number;
};

export type PresignCoverImageResult =
  | {
      ok: true;
      chave: string;
      put: string;
      expiraEm: number;
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown> | undefined;
    };

export async function presignCoverImageUpload(
  input: PresignCoverImageInput,
): Promise<PresignCoverImageResult> {
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

  const invalido = validateCoverImageDeclaration(mimeNormalizado, input.bytes);
  if (invalido) {
    return {
      ok: false,
      code: invalido,
      message: invalido === "imagem.vazia" ? "Imagem vazia" : "Imagem grande demais",
      details: invalido === "imagem.grande_demais" ? { limite_bytes: 10 * 1024 * 1024 } : undefined,
    };
  }

  const chave = deriveCoverImageKey(input.eventId);
  const put = await signPut(chave, mimeNormalizado, VALIDADE_PRESIGN_SEGUNDOS);

  console.log("admin.cover_image.presign", {
    accountId: input.accountId,
    eventId: input.eventId,
  });

  return {
    ok: true,
    chave,
    put: put.toString(),
    expiraEm: Date.now() + VALIDADE_PRESIGN_SEGUNDOS * 1000,
  };
}
