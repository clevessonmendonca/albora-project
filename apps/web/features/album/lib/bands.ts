import type { ServedAlbum, ServedPhoto } from "@/lib/album";

export type AlbumBand = {
  chave: string;
  hora: number | null;
  inicioDaHora: string | null;
  amanhecer: boolean;
  fotos: ServedPhoto[];
};

const SEM_HORA = "sem-hora";

/**
 * A unidade do álbum é a hora. Páginas do mesmo instante (lugares diferentes)
 * viram uma faixa só — o convidado navega a noite, não o layout.
 */
export function bandsFromAlbum(
  album: ServedAlbum,
  missaoId: string | null = null,
): AlbumBand[] {
  const porChave = new Map<string, AlbumBand>();
  const ordem: string[] = [];

  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      const fotos = missaoId
        ? pagina.fotos.filter((f) => f.missaoId === missaoId)
        : pagina.fotos;
      if (fotos.length === 0) continue;

      const chave = pagina.inicioDaHora ?? SEM_HORA;
      const existente = porChave.get(chave);
      if (existente) {
        existente.fotos.push(...fotos);
        existente.amanhecer = existente.amanhecer || pagina.amanhecer;
        continue;
      }

      ordem.push(chave);
      porChave.set(chave, {
        chave,
        hora: pagina.hora,
        inicioDaHora: pagina.inicioDaHora,
        amanhecer: pagina.amanhecer,
        fotos: [...fotos],
      });
    }
  }

  return ordem.flatMap((chave) => {
    const faixa = porChave.get(chave);
    return faixa ? [faixa] : [];
  });
}

export function firstCoverUrl(album: ServedAlbum): string | null {
  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      const foto = pagina.fotos[0];
      if (foto?.url) return foto.url;
    }
  }
  return null;
}

export function flattenPhotos(faixas: readonly AlbumBand[]): ServedPhoto[] {
  return faixas.flatMap((f) => f.fotos);
}
