export type MusicPageInput = {
  slug: string;
};

export type MusicPageData = {
  slug: string;
};

export async function getMusicPage(input: MusicPageInput): Promise<MusicPageData> {
  return { slug: input.slug };
}
