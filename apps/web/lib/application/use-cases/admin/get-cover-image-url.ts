/**
 * Use Case: Get Cover Image URL
 *
 * Retorna URL assinada da imagem de capa atual.
 */
import { VALIDADE_PRESIGN_SEGUNDOS } from "@albora/core";
import { signGet } from "@/lib/r2";

export type GetCoverImageInput = {
  eventId: string;
  coverImageKey: string | null;
};

export type GetCoverImageOutput = {
  url: string | null;
  chave: string | null;
};

export async function getCoverImageUrl(
  input: GetCoverImageInput,
): Promise<GetCoverImageOutput> {
  if (!input.coverImageKey) {
    return { url: null, chave: null };
  }

  const url = await signGet(input.coverImageKey, VALIDADE_PRESIGN_SEGUNDOS);
  return { url: url.toString(), chave: input.coverImageKey };
}
