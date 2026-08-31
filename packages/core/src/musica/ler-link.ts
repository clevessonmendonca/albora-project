import { provedorDoHost } from "./hosts";
import { recusar } from "./link-interno";
import { lerAppleMusic, lerDeezer, lerSpotify, lerYoutube } from "./provedores";
import type { ResultadoDeLink } from "./types";

export function lerLinkDeMusica(colado: string): ResultadoDeLink {
  let url: URL;
  try {
    url = new URL(colado.trim());
  } catch {
    return recusar({ code: "musica.url_ilegivel", details: {} });
  }

  if (url.protocol !== "https:") {
    return recusar({ code: "musica.esquema_recusado", details: { esquema: url.protocol } });
  }
  if (url.username !== "" || url.password !== "") {
    return recusar({ code: "musica.credenciais_na_url", details: {} });
  }
  if (url.port !== "") {
    return recusar({ code: "musica.porta_recusada", details: { porta: url.port } });
  }

  const host = url.hostname.toLowerCase();
  const provedor = provedorDoHost(host);
  if (provedor === undefined) {
    return recusar({ code: "musica.provedor_fora_da_lista", details: { host } });
  }

  switch (provedor) {
    case "spotify":
      return lerSpotify(url);
    case "youtube":
    case "youtube-music":
      return lerYoutube(url, provedor);
    case "apple-music":
      return lerAppleMusic(url);
    case "deezer":
      return lerDeezer(url);
  }
}
