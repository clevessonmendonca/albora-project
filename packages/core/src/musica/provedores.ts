import { aceitar, ID_LISTA, ID_NUMERICO, ID_PLAYLIST_APPLE, ID_SPOTIFY, ID_VIDEO, recusar, REGIAO, segmentos } from "./link-interno";
import type { ResultadoDeLink, TipoDeConteudo } from "./types";

const TIPO_SPOTIFY: ReadonlyMap<string, TipoDeConteudo> = new Map([
  ["track", "faixa"],
  ["album", "album"],
  ["playlist", "playlist"],
] as const);

const TIPO_DEEZER: ReadonlyMap<string, TipoDeConteudo> = new Map([
  ["track", "faixa"],
  ["album", "album"],
  ["playlist", "playlist"],
] as const);

export function lerSpotify(url: URL): ResultadoDeLink {
  const partes = segmentos(url);
  const semIdioma = partes[0]?.startsWith("intl-") === true ? partes.slice(1) : partes;
  const [rotulo, id] = semIdioma;

  const tipo = rotulo === undefined ? undefined : TIPO_SPOTIFY.get(rotulo);
  if (rotulo === undefined || tipo === undefined) {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "spotify" } });
  }
  if (id === undefined || !ID_SPOTIFY.test(id)) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "spotify" } });
  }

  return aceitar({
    provedor: "spotify",
    tipo,
    identificador: id,
    regiao: null,
    url: `https://open.spotify.com/${rotulo}/${id}`,
  });
}

export function lerYoutube(url: URL, provedor: "youtube" | "youtube-music"): ResultadoDeLink {
  const base = provedor === "youtube" ? "https://www.youtube.com" : "https://music.youtube.com";
  const partes = segmentos(url);

  if (url.hostname.toLowerCase() === "youtu.be") {
    const id = partes[0];
    if (partes.length !== 1 || id === undefined || !ID_VIDEO.test(id)) {
      return recusar({ code: "musica.identificador_invalido", details: { provedor } });
    }
    return aceitar({
      provedor,
      tipo: "faixa",
      identificador: id,
      regiao: null,
      url: `${base}/watch?v=${id}`,
    });
  }

  const rotulo = partes[0];

  if (rotulo === "watch" && partes.length === 1) {
    const id = url.searchParams.get("v");
    if (id === null || !ID_VIDEO.test(id)) {
      return recusar({ code: "musica.identificador_invalido", details: { provedor } });
    }
    return aceitar({
      provedor,
      tipo: "faixa",
      identificador: id,
      regiao: null,
      url: `${base}/watch?v=${id}`,
    });
  }

  if (rotulo === "playlist" && partes.length === 1) {
    const id = url.searchParams.get("list");
    if (id === null || !ID_LISTA.test(id)) {
      return recusar({ code: "musica.identificador_invalido", details: { provedor } });
    }
    return aceitar({
      provedor,
      tipo: "playlist",
      identificador: id,
      regiao: null,
      url: `${base}/playlist?list=${id}`,
    });
  }

  return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor } });
}

export function lerAppleMusic(url: URL): ResultadoDeLink {
  const partes = segmentos(url);
  const [regiao, rotulo, ...resto] = partes;

  if (regiao === undefined || !REGIAO.test(regiao) || rotulo === undefined) {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "apple-music" } });
  }
  if (rotulo !== "album" && rotulo !== "song" && rotulo !== "playlist") {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "apple-music" } });
  }

  const id = resto[resto.length - 1];
  if (id === undefined) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "apple-music" } });
  }

  if (rotulo === "playlist") {
    if (!ID_PLAYLIST_APPLE.test(id)) {
      return recusar({
        code: "musica.identificador_invalido",
        details: { provedor: "apple-music" },
      });
    }
    return aceitar({
      provedor: "apple-music",
      tipo: "playlist",
      identificador: id,
      regiao,
      url: `https://music.apple.com/${regiao}/playlist/${id}`,
    });
  }

  const faixa = url.searchParams.get("i");
  if (rotulo === "album" && faixa !== null) {
    if (!ID_NUMERICO.test(faixa)) {
      return recusar({
        code: "musica.identificador_invalido",
        details: { provedor: "apple-music" },
      });
    }
    return aceitar({
      provedor: "apple-music",
      tipo: "faixa",
      identificador: faixa,
      regiao,
      url: `https://music.apple.com/${regiao}/song/${faixa}`,
    });
  }

  if (!ID_NUMERICO.test(id)) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "apple-music" } });
  }

  return aceitar({
    provedor: "apple-music",
    tipo: rotulo === "song" ? "faixa" : "album",
    identificador: id,
    regiao,
    url: `https://music.apple.com/${regiao}/${rotulo}/${id}`,
  });
}

export function lerDeezer(url: URL): ResultadoDeLink {
  const partes = segmentos(url);
  const primeiro = partes[0];
  const semRegiao =
    primeiro !== undefined && REGIAO.test(primeiro) ? partes.slice(1) : partes;
  const [rotulo, id] = semRegiao;

  const tipo = rotulo === undefined ? undefined : TIPO_DEEZER.get(rotulo);
  if (rotulo === undefined || tipo === undefined) {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "deezer" } });
  }
  if (id === undefined || !ID_NUMERICO.test(id)) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "deezer" } });
  }

  return aceitar({
    provedor: "deezer",
    tipo,
    identificador: id,
    regiao: null,
    url: `https://www.deezer.com/${rotulo}/${id}`,
  });
}
