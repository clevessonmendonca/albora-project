/**
 * Service para processamento de arquivos de câmera.
 * Pura business logic, sem dependência de React.
 */

export type FileValidationError =
  | "file-too-large"
  | "invalid-type"
  | "corrupted"
  | "unsupported";

export type CameraValidationResult =
  | { valid: true; file: File }
  | { valid: false; error: FileValidationError; message: string };

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/**
 * Valida arquivo capturado pela câmera.
 */
export function validateCameraFile(file: File): CameraValidationResult {
  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "file-too-large",
      message: "Arquivo muito grande. Máximo 50MB.",
    };
  }

  // Validar tipo
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: "invalid-type",
      message: "Tipo de arquivo não suportado.",
    };
  }

  // Validar se o arquivo não está vazio
  if (file.size === 0) {
    return {
      valid: false,
      error: "corrupted",
      message: "Arquivo corrompido ou vazio.",
    };
  }

  return { valid: true, file };
}

/**
 * Detecta orientação de imagem via EXIF.
 * Retorna orientação EXIF (1-8) ou null se não encontrar.
 */
export async function detectImageOrientation(file: File): Promise<number | null> {
  if (!file.type.startsWith("image/")) return null;

  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Verificar assinatura JPEG
    if (view.getUint16(0, false) !== 0xffd8) return null;

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 marker (EXIF)
      if (marker === 0xffe1) {
        const exifLength = view.getUint16(offset, false);
        const exifOffset = offset + 2;

        // Verificar "Exif\0\0"
        if (
          view.getUint32(exifOffset, false) === 0x45786966 &&
          view.getUint16(exifOffset + 4, false) === 0x0000
        ) {
          const tiffOffset = exifOffset + 6;

          // Ler byte order
          const byteOrder = view.getUint16(tiffOffset, false);
          const littleEndian = byteOrder === 0x4949;

          // Ler IFD offset
          const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian);
          const tagCount = view.getUint16(tiffOffset + ifdOffset, littleEndian);

          // Procurar tag de orientação (0x0112)
          for (let i = 0; i < tagCount; i++) {
            const tagOffset = tiffOffset + ifdOffset + 2 + i * 12;
            const tag = view.getUint16(tagOffset, littleEndian);

            if (tag === 0x0112) {
              return view.getUint16(tagOffset + 8, littleEndian);
            }
          }
        }

        offset += exifLength;
      } else {
        // Pular para próximo marker
        const segmentLength = view.getUint16(offset, false);
        offset += segmentLength;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Determina se arquivo é vídeo.
 */
export function isVideoFile(file: File): boolean {
  return ALLOWED_VIDEO_TYPES.includes(file.type);
}

/**
 * Determina se arquivo é imagem.
 */
export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

/**
 * Formata tamanho de arquivo para exibição.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Cria URL de preview para arquivo.
 * Lembrar de revogar com URL.revokeObjectURL quando não precisar mais.
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoga URL de preview.
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
