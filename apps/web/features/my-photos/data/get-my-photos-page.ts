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
};

export async function getMyPhotosPage(input: MyPhotosPageInput): Promise<MyPhotosPageData> {
  const { slug, eventoId, sessaoId } = input;

  return {
    slug,
    eventoId,
    sessaoId,
    cameraPath: `/e/${encodeURIComponent(slug)}/photo`,
  };
}
