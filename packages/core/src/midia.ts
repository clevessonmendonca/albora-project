import type { PlanoDoEvento } from "./plano-evento";
import { planoParaRedimensionamento } from "./plano-evento";

export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"] as const;
export type TipoAceito = (typeof TIPOS_ACEITOS)[number];

export const TIPOS_VIDEO = ["video/mp4", "video/quicktime"] as const;
export type TipoVideo = (typeof TIPOS_VIDEO)[number];

/** HEIC entra aqui mas sai JPEG no aparelho — nunca entra em `TIPOS_ACEITOS` ou o servidor assinaria algo que telão não exibe. */
export const TIPOS_ENTRADA = [...TIPOS_ACEITOS, "image/heic", "image/heif"] as const;
export type TipoEntrada = (typeof TIPOS_ENTRADA)[number];

export const MAX_BYTES = 12 * 1024 * 1024;

export const MAX_BYTES_VIDEO = 50 * 1024 * 1024;

export const PREFIXO_MAGIC_BYTES = 16;

export const LADO_MAIOR = {
  gratis: 2500,
  pago: 3500,
} as const;

export function tipoAceito(mime: string): mime is TipoAceito {
  return (TIPOS_ACEITOS as readonly string[]).includes(mime);
}

export function isVideoMime(mime: string): mime is TipoVideo {
  return (TIPOS_VIDEO as readonly string[]).includes(mime);
}

/** Content-Type do cliente não vale: "JPEG" que é HTML é XSS armazenado. Esta é a 1ª camada; domínio próprio é a 2ª. */
const ASSINATURAS: { mime: TipoAceito; bytes: number[]; deslocamento: number }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff], deslocamento: 0 },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], deslocamento: 0 },
  // WEBP: "RIFF" .... "WEBP" — o tamanho fica entre os dois.
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], deslocamento: 0 },
];

export function detectarTipo(inicio: Uint8Array): TipoAceito | null {
  for (const a of ASSINATURAS) {
    const casa = a.bytes.every((b, i) => inicio[a.deslocamento + i] === b);
    if (!casa) continue;

    if (a.mime === "image/webp") {
      const webp = [0x57, 0x45, 0x42, 0x50];
      if (!webp.every((b, i) => inicio[8 + i] === b)) continue;
    }
    return a.mime;
  }
  return null;
}

/** ISO-BMFF: `ftyp` nos bytes 4..7, marca em 8..11 — HEIC, MP4 e .mov do iPhone são o mesmo contêiner. */
const FTYP = [0x66, 0x74, 0x79, 0x70];

const MARCAS_HEIC = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
  "heim",
  "heis",
  "hevm",
  "hevs",
];

const MARCAS_VIDEO = ["isom", "iso2", "iso4", "mp41", "mp42", "avc1", "qt  ", "M4V "];

function marcaIsoBmff(inicio: Uint8Array): string | null {
  if (!FTYP.every((b, i) => inicio[4 + i] === b)) return null;

  let marca = "";
  for (let i = 8; i < 12; i += 1) {
    const b = inicio[i];
    if (b === undefined) return null;
    marca += String.fromCharCode(b);
  }
  return marca;
}

/** Detecta pelos bytes, nunca pelo `File.type` — no iOS vem vazio ou mentiroso. */
export function isHeic(inicio: Uint8Array): boolean {
  const marca = marcaIsoBmff(inicio);
  return marca !== null && MARCAS_HEIC.includes(marca);
}

export function isVideoBytes(inicio: Uint8Array): boolean {
  const marca = marcaIsoBmff(inicio);
  return marca !== null && MARCAS_VIDEO.includes(marca);
}

export type ErroMidia =
  | { code: "midia.tipo_recusado"; details: { recebido: string } }
  | { code: "midia.formato_nao_suportado"; details: { detectado: string } }
  | { code: "midia.grande_demais"; details: { bytes: number; limite: number } }
  | { code: "midia.conteudo_nao_confere"; details: { declarado: string; detectado: string | null } };

export function validarDeclaracao(mime: string, bytes: number): ErroMidia | null {
  if (isVideoMime(mime)) {
    if (bytes <= 0 || bytes > MAX_BYTES_VIDEO) {
      return { code: "midia.grande_demais", details: { bytes, limite: MAX_BYTES_VIDEO } };
    }
    return null;
  }

  if (!tipoAceito(mime)) {
    return { code: "midia.tipo_recusado", details: { recebido: mime } };
  }
  if (bytes <= 0 || bytes > MAX_BYTES) {
    return { code: "midia.grande_demais", details: { bytes, limite: MAX_BYTES } };
  }
  return null;
}

export function validarConteudo(mimeDeclarado: string, inicio: Uint8Array): ErroMidia | null {
  if (isVideoMime(mimeDeclarado)) {
    if (!isVideoBytes(inicio)) {
      return {
        code: "midia.conteudo_nao_confere",
        details: { declarado: mimeDeclarado, detectado: null },
      };
    }
    return null;
  }

  const detectado = detectarTipo(inicio);
  if (detectado === null || detectado !== mimeDeclarado) {
    return {
      code: "midia.conteudo_nao_confere",
      details: { declarado: mimeDeclarado, detectado },
    };
  }
  return null;
}

export function validarObjetoRecebido(
  mimeDeclarado: string,
  bytes: number,
  inicio: Uint8Array,
): ErroMidia | null {
  return validarDeclaracao(mimeDeclarado, bytes) ?? validarConteudo(mimeDeclarado, inicio);
}

export function dimensoesDentroDoPlano(
  largura: number,
  altura: number,
  plano: PlanoDoEvento,
): { ok: true } | { ok: false; limite: number; ladoMaior: number } {
  const limite = LADO_MAIOR[planoParaRedimensionamento(plano)];
  const ladoMaior = Math.max(largura, altura);
  if (ladoMaior > limite) return { ok: false, limite, ladoMaior };
  return { ok: true };
}
