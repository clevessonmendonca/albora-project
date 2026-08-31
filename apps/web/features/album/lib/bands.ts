import { CAPITULO_SEM_HORA, CAPITULO_UNICO } from "@albora/core";
import type { ServedAlbum, ServedPage, ServedPhoto } from "@/lib/album";

export type AlbumBand = {
  chave: string;
  hora: number | null;
  inicioDaHora: string | null;
  amanhecer: boolean;
  fotos: ServedPhoto[];
};

export type AlbumChapterView = {
  id: string;
  titulo: string;
  comecaEm: string | null;
  nomear: boolean;
  faixas: AlbumBand[];
};

const SEM_HORA = "sem-hora";

/** Unidade do álbum = hora; páginas do mesmo instante viram uma faixa — o convidado navega a noite, não o layout. */
export function bandsFromPages(
  paginas: readonly ServedPage[],
  missaoId: string | null = null,
): AlbumBand[] {
  const porChave = new Map<string, AlbumBand>();
  const ordem: string[] = [];

  for (const pagina of paginas) {
    const fotos = missaoId ? pagina.fotos.filter((f) => f.missaoId === missaoId) : pagina.fotos;
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

  return ordem.flatMap((chave) => {
    const faixa = porChave.get(chave);
    return faixa ? [faixa] : [];
  });
}

export function bandsFromAlbum(
  album: ServedAlbum,
  missaoId: string | null = null,
): AlbumBand[] {
  return bandsFromPages(
    album.capitulos.flatMap((c) => c.paginas),
    missaoId,
  );
}

/** Capítulos na ordem do núcleo, com faixas de hora; capítulo sem foto some. */
export function chaptersFromAlbum(
  album: ServedAlbum,
  missaoId: string | null = null,
): AlbumChapterView[] {
  return album.capitulos.flatMap((capitulo) => {
    const faixas = bandsFromPages(capitulo.paginas, missaoId);
    if (faixas.length === 0) return [];
    return [
      {
        id: capitulo.id,
        titulo: capitulo.titulo,
        comecaEm: capitulo.comecaEm,
        nomear: capitulo.id !== CAPITULO_SEM_HORA && capitulo.id !== CAPITULO_UNICO,
        faixas,
      },
    ];
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

export function flattenChapterPhotos(capitulos: readonly AlbumChapterView[]): ServedPhoto[] {
  return capitulos.flatMap((c) => flattenPhotos(c.faixas));
}
