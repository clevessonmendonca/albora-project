import type { ErroMusica, LinkDeMusica, ResultadoDeLink } from "./types";

export function recusar(erro: ErroMusica): ResultadoDeLink {
  return { ok: false, erro };
}

export function aceitar(link: LinkDeMusica): ResultadoDeLink {
  return { ok: true, link };
}

export function segmentos(url: URL): string[] {
  return url.pathname.split("/").filter((s) => s !== "");
}

export const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;
export const ID_VIDEO = /^[A-Za-z0-9_-]{11}$/;
export const ID_LISTA = /^[A-Za-z0-9_-]{2,64}$/;
export const ID_NUMERICO = /^[0-9]{1,12}$/;
export const ID_PLAYLIST_APPLE = /^pl\.[A-Za-z0-9-]{1,64}$/;
export const REGIAO = /^[a-z]{2}$/;
