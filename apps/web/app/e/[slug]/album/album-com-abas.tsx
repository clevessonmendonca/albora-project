"use client";

import type { AlbumServido } from "@/lib/album";
import { AlbumUI } from "../../../album/album-ui";
import { BarraDeAbas } from "../barra-de-abas";

export function AlbumComAbas({ slug, album }: { slug: string; album: AlbumServido }) {
  return (
    <>
      <AlbumUI album={album} />
      <BarraDeAbas slug={slug} ativa="album" />
    </>
  );
}
