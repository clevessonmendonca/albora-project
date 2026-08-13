/**
 * Validação de mídia. Compartilhada pelas duas superfícies e pelo servidor.
 *
 * O cliente usa para não enfileirar o que vai ser recusado; o servidor usa
 * porque **cliente não é fonte de verdade**. A mesma regra nos dois lados é o
 * que evita a divergência clássica: o app aceita, o servidor recusa, e o
 * convidado vê a foto sumir sem explicação.
 */

export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"] as const;
export type TipoAceito = (typeof TIPOS_ACEITOS)[number];

export const TIPOS_VIDEO = ["video/mp4", "video/quicktime"] as const;
export type TipoVideo = (typeof TIPOS_VIDEO)[number];

/**
 * O que o cliente pode **tentar decodificar** — não o que pode subir.
 *
 * HEIC entra e sai JPEG no aparelho (N5.2). Ele nunca entra em
 * `TIPOS_ACEITOS`: bastava isso para o servidor passar a assinar upload do
 * arquivo exato que a galeria e o telão não exibem.
 */
export const TIPOS_ENTRADA = [...TIPOS_ACEITOS, "image/heic", "image/heif"] as const;
export type TipoEntrada = (typeof TIPOS_ENTRADA)[number];

/** Teto por foto. Acima disso o cliente redimensiona antes de enfileirar. */
export const MAX_BYTES = 12 * 1024 * 1024;

/** Teto por vídeo (~30s em 1080p, §5.1 do doc de produto). */
export const MAX_BYTES_VIDEO = 50 * 1024 * 1024;

export const LADO_MAIOR = {
  gratis: 2500,
  pago: 3500,
} as const;

export function tipoAceito(mime: string): mime is TipoAceito {
  return (TIPOS_ACEITOS as readonly string[]).includes(mime);
}

export function ehMimeVideo(mime: string): mime is TipoVideo {
  return (TIPOS_VIDEO as readonly string[]).includes(mime);
}

/**
 * Assinaturas de arquivo. O `Content-Type` é declarado pelo cliente e não
 * vale nada: um "JPEG" que na verdade é HTML servido da origem do app é XSS
 * armazenado com alcance de festa inteira.
 *
 * Isto é a primeira camada; a segunda é o domínio próprio de mídia. As duas
 * juntas, nunca uma só.
 */
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

/**
 * Contêiner ISO-BMFF: `ftyp` nos bytes 4..7, e a marca do formato em 8..11.
 * HEIC, MP4 e o `.mov` do iPhone são todos o mesmo contêiner — o que os
 * separa é só a marca.
 */
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

/**
 * Detecta HEIC/HEIF pelos bytes, nunca pelo `File.type` — no iOS ele vem
 * vazio ou mentiroso, e é o convidado de iPhone que a N5.2 protege.
 */
export function ehHeic(inicio: Uint8Array): boolean {
  const marca = marcaIsoBmff(inicio);
  return marca !== null && MARCAS_HEIC.includes(marca);
}

/** Vídeo em contêiner ISO-BMFF, incluindo o `.mov` do iPhone (marca `qt  `). */
export function ehVideo(inicio: Uint8Array): boolean {
  const marca = marcaIsoBmff(inicio);
  return marca !== null && MARCAS_VIDEO.includes(marca);
}

export type ErroMidia =
  | { code: "midia.tipo_recusado"; details: { recebido: string } }
  | { code: "midia.formato_nao_suportado"; details: { detectado: string } }
  | { code: "midia.grande_demais"; details: { bytes: number; limite: number } }
  | { code: "midia.conteudo_nao_confere"; details: { declarado: string; detectado: string | null } };

/**
 * Valida o que o cliente declarou, **antes** de assinar a URL.
 * Rate limit e recusa acontecem no portão: um pedido condenado não deve
 * consumir assinatura, nem cota, nem espaço no bucket.
 */
export function validarDeclaracao(mime: string, bytes: number): ErroMidia | null {
  if (ehMimeVideo(mime)) {
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

/**
 * Valida o objeto que **de fato** chegou no storage. Roda no confirm, e é o
 * que transforma "o cliente disse que era JPEG" em "os primeiros bytes são
 * de um JPEG".
 */
export function validarConteudo(mimeDeclarado: string, inicio: Uint8Array): ErroMidia | null {
  if (ehMimeVideo(mimeDeclarado)) {
    if (!ehVideo(inicio)) {
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
