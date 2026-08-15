import { PACKS, resolvePackText } from "@albora/packs";

export type MusicPageInput = {
  slug: string;
  packId: string;
};

export type MusicPageData = {
  slug: string;
  escolhaLabel: string;
};

export async function getMusicPage(input: MusicPageInput): Promise<MusicPageData> {
  const pack = PACKS[input.packId];
  return {
    slug: input.slug,
    escolhaLabel: pack ? resolvePackText(pack, "musica.escolha") : "Escolha dos anfitriões",
  };
}
