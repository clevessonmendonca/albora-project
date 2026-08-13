"use client";

import { PaginaAlbum, type MissaoDoAlbum } from "./pagina-album";
import { BarraDeAbas } from "../barra-de-abas";

export function AlbumComAbas({
  slug,
  missoes,
  missaoInicial = null,
  caminhoDaCamera,
}: {
  slug: string;
  missoes: MissaoDoAlbum[];
  missaoInicial?: string | null;
  caminhoDaCamera: string;
}) {
  return (
    <>
      <PaginaAlbum
        slug={slug}
        missoes={missoes}
        missaoInicial={missaoInicial}
        caminhoDaCamera={caminhoDaCamera}
      />
      <BarraDeAbas slug={slug} ativa="album" />
    </>
  );
}
