import type { AlbumServido } from "@/lib/album";

export function truncateLabel(label: string, max = 16): string {
  return label.length <= max ? label : `${label.slice(0, max - 1)}…`;
}

export function albumCoverUrl(album: AlbumServido): string | null {
  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      const foto = pagina.fotos[0];
      if (foto?.url) return foto.url;
    }
  }
  return null;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(
    new Date(iso),
  );
}
