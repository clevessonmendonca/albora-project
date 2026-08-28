import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { isHeic } from "@albora/core";
import type { CaptureSource } from "./capture";

const AVISO_HEIC =
  "Este aparelho não abre fotos HEIC. No iPhone: Ajustes → Câmera → Formatos → \u201cMais compatível\u201d.";

export type NormalizeOpts = {
  /** Cabeçalho (≥12 bytes) do arquivo para detecção de formato. Ignorado quando `alwaysConvert` for true. */
  head: Uint8Array;
  /** Caminho local da imagem (file:// ou ph:// URI). */
  uri: string;
  width?: number;
  height?: number;
  /** Quando true, converte para JPEG independente do formato detectado. Use para URIs de galeria (ph://, content://) onde leitura direta pode falhar. */
  alwaysConvert?: boolean;
  /** Injeção para testes: substitui `manipulateAsync` do expo-image-manipulator. Recebe a URI e devolve a URI do JPEG produzido. */
  manipulate?: (uri: string) => Promise<string>;
};

export type NormalizeResult =
  | { ok: true; source: CaptureSource }
  | { ok: false; erro: string };

/** Normaliza uma imagem da galeria ou de câmera para JPEG. Converte quando: (a) o cabeçalho indica HEIC, ou (b) alwaysConvert é true (padrão para URIs de galeria). Retorna CaptureSource pronto para persistCapture. */
export async function normalizeSource(opts: NormalizeOpts): Promise<NormalizeResult> {
  const { head, uri, width, height } = opts;
  const needsConversion = opts.alwaysConvert || isHeic(head);

  if (!needsConversion) {
    const source: CaptureSource = { uri };
    if (width !== undefined) source.width = width;
    if (height !== undefined) source.height = height;
    return { ok: true, source };
  }

  try {
    const manipulate = opts.manipulate ?? defaultManipulate;
    const jpegUri = await manipulate(uri);
    return { ok: true, source: { uri: jpegUri } };
  } catch {
    return { ok: false, erro: AVISO_HEIC };
  }
}

async function defaultManipulate(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [], {
    format: SaveFormat.JPEG,
    compress: 0.82,
  });
  return result.uri;
}
