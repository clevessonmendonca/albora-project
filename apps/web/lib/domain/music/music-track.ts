import { displayMusic, type LinkDeMusica, type MetadadoDaMusica, type MusicaDoEvento } from "@albora/core";
import { buscarMetadadoDaMusica } from "@/lib/music-metadata";

export type FaixaDoCasalNaTela = {
  provedor: string;
  rotulo: string;
  url: string;
  capaUrl: string | null;
};

export function serializarMusicaDoCasal(musica: MusicaDoEvento | null): FaixaDoCasalNaTela | null {
  if (!musica) return null;
  const exibicao = displayMusic(musica.link, musica.metadado);
  return {
    provedor: musica.link.provedor,
    rotulo: exibicao.rotulo,
    url: exibicao.url,
    capaUrl: exibicao.capaUrl,
  };
}

export async function metadadoParaFaixaDoCasal(
  link: LinkDeMusica,
): Promise<MetadadoDaMusica | null> {
  try {
    return await buscarMetadadoDaMusica(link);
  } catch {
    return null;
  }
}
