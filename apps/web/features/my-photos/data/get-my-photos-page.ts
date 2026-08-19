import { comEvento, refDoEvento } from "@albora/db";
import { getPool } from "@/lib/db";

export type MyPhotosPageInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
};

export type MyPhotosPageData = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  cameraPath: string;
  /** Ref de atribuição da festa (spec A1) — CTA na tela final do recap. */
  refToken: string | null;
};

export async function getMyPhotosPage(input: MyPhotosPageInput): Promise<MyPhotosPageData> {
  const { slug, eventoId, sessaoId } = input;

  const refToken = await comEvento(getPool(), eventoId, (c) => refDoEvento(c, eventoId)).catch(
    () => null,
  );

  return {
    slug,
    eventoId,
    sessaoId,
    cameraPath: `/e/${encodeURIComponent(slug)}/photo`,
    refToken,
  };
}
