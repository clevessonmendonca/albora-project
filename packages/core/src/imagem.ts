export const TIPOS_IMAGEM_CAPA = ["image/jpeg", "image/png", "image/webp"] as const;
export type MimeImagemCapa = (typeof TIPOS_IMAGEM_CAPA)[number];

export const TETO_BYTES_IMAGEM_CAPA = 5 * 1024 * 1024;

export function normalizarMimeImagemCapa(mime: string): MimeImagemCapa | null {
  const lower = mime.toLowerCase().trim();
  return (TIPOS_IMAGEM_CAPA as readonly string[]).includes(lower)
    ? (lower as MimeImagemCapa)
    : null;
}

export function validarDeclaracaoImagemCapa(mime: MimeImagemCapa, bytes: number): string | null {
  if (bytes <= 0) return "imagem.vazia";
  if (bytes > TETO_BYTES_IMAGEM_CAPA) return "imagem.grande_demais";
  return null;
}

export function validarConteudoImagemCapa(mime: MimeImagemCapa, inicio: Uint8Array): boolean {
  if (mime === "image/jpeg") {
    return inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      inicio[0] === 0x89 && inicio[1] === 0x50 && inicio[2] === 0x4e &&
      inicio[3] === 0x47 && inicio[4] === 0x0d && inicio[5] === 0x0a
    );
  }
  if (mime === "image/webp") {
    return (
      inicio[0] === 0x52 && inicio[1] === 0x49 && inicio[2] === 0x46 &&
      inicio[3] === 0x46 && inicio.length > 11 &&
      inicio[8] === 0x57 && inicio[9] === 0x45 && inicio[10] === 0x42 && inicio[11] === 0x50
    );
  }
  return false;
}
