import type { ExibicaoDaMusica, LinkDeMusica, MetadadoDaMusica } from "./types";

function capaSegura(capaUrl: string | null): string | null {
  if (capaUrl === null) return null;
  try {
    return new URL(capaUrl).protocol === "https:" ? capaUrl : null;
  } catch {
    return null;
  }
}

export function exibirMusica(
  link: LinkDeMusica,
  metadado: MetadadoDaMusica | null,
): ExibicaoDaMusica {
  const titulo = metadado?.titulo.trim() ?? "";
  if (titulo === "") {
    return { rotulo: link.url, url: link.url, capaUrl: null, resolvida: false };
  }

  const artista = metadado?.artista?.trim() ?? "";
  return {
    rotulo: artista === "" ? titulo : `${titulo} — ${artista}`,
    url: link.url,
    capaUrl: capaSegura(metadado?.capaUrl ?? null),
    resolvida: true,
  };
}
