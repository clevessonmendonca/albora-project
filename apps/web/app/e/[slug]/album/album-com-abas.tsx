"use client";

import { PaginaAlbum, type MissaoDoAlbum } from "./pagina-album";
import { BarraDeAbas } from "../barra-de-abas";

export function AlbumComAbas({
  slug,
  missoes,
  caminhoDaCamera,
}: {
  slug: string;
  missoes: MissaoDoAlbum[];
  caminhoDaCamera: string;
}) {
  return (
    <>
      <PaginaAlbum missoes={missoes} caminhoDaCamera={caminhoDaCamera} />
      <BarraDeAbas slug={slug} ativa="album" />
    </>
  );
}
