import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type SlotAlbum = { id: string; proporcao: string; fracao: number };

export type FotoAlbum = {
  id: string;
  url: string;
  urlThumb: string;
  mime: string;
  missaoId: string | null;
  slot: SlotAlbum;
};

export type PaginaAlbum = {
  layoutId: string;
  amanhecer: boolean;
  hora: number | null;
  inicioDaHora: string | null;
  lugarId: string | null;
  fotos: FotoAlbum[];
};

export type CapituloAlbum = {
  id: string;
  titulo: string;
  comecaEm: string | null;
  paginas: PaginaAlbum[];
};

export type AlbumResposta = {
  capitulos: CapituloAlbum[];
  totalDePaginas: number;
  contadores: { fotos: number; convidados: number; missoes: number };
  interacao: string;
  expiraEm: number;
};

export type FalhaAlbum = "rede" | "sessao";

export type ResultadoAlbum =
  | { ok: true; album: AlbumResposta }
  | { ok: false; falha: FalhaAlbum };

export async function buscarAlbum(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<ResultadoAlbum> {
  const url = new URL(`${apiOrigin()}/api/album`);
  url.searchParams.set("eventoId", session.eventoId);

  let res: Response;
  try {
    res = await fetchFn(url.toString(), {
      headers: { cookie: cookieHeader(session.token) },
    });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, falha: "sessao" };
  if (!res.ok) return { ok: false, falha: "rede" };

  try {
    const corpo = (await res.json()) as { album?: AlbumResposta };
    if (!corpo.album || typeof corpo.album.expiraEm !== "number") {
      return { ok: false, falha: "rede" };
    }
    return { ok: true, album: corpo.album };
  } catch {
    return { ok: false, falha: "rede" };
  }
}

/** Thumb da capa de um capítulo: primeira foto da primeira página, se existir. */
export function thumbDoCaptitulo(capitulo: CapituloAlbum): string | null {
  return capitulo.paginas[0]?.fotos[0]?.urlThumb ?? null;
}

/** Total de fotos de um capítulo somando todas as páginas. */
export function totalFotosCapitulo(capitulo: CapituloAlbum): number {
  return capitulo.paginas.reduce((acc, p) => acc + p.fotos.length, 0);
}
