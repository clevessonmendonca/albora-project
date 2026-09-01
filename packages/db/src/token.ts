import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Referência a estado no servidor — permite revogar um evento inteiro sem derrubar outros. Opaco, nunca JWT. */

const BYTES_ALEATORIOS = 32;
const TAMANHO_ASSINATURA = 32;

export type TokenEmitido = {
  /** Vai para o cookie. Nunca para a URL, nunca para log. */
  token: string;
  /** Vai para o banco. O token em si não é guardado em lugar nenhum. */
  hash: Buffer;
};

export function emitirToken(segredo: string): TokenEmitido {
  exigirSegredo(segredo);

  const material = randomBytes(BYTES_ALEATORIOS);
  const assinatura = assinar(segredo, material);
  const token = `${b64(material)}.${b64(assinatura)}`;

  return { token, hash: hashDoToken(token) };
}

/** Sem tocar no banco — token forjado custa microssegundos, não uma consulta. */
export function assinaturaValida(segredo: string, token: string): boolean {
  exigirSegredo(segredo);

  const partes = token.split(".");
  if (partes.length !== 2) return false;

  const [materialB64, assinaturaB64] = partes as [string, string];
  let material: Buffer;
  let apresentada: Buffer;
  try {
    material = Buffer.from(materialB64, "base64url");
    apresentada = Buffer.from(assinaturaB64, "base64url");
  } catch {
    return false;
  }

  if (material.length !== BYTES_ALEATORIOS) return false;
  if (apresentada.length !== TAMANHO_ASSINATURA) return false;

  // Comparação em tempo constante: comparar com === vaza, pelo tempo, quantos bytes iniciais o atacante acertou.
  return timingSafeEqual(apresentada, assinar(segredo, material));
}

export function hashDoToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

function assinar(segredo: string, material: Buffer): Buffer {
  return createHmac("sha256", segredo).update(material).digest();
}

function b64(b: Buffer): string {
  return b.toString("base64url");
}

function exigirSegredo(segredo: string): void {
  // Falha alto em vez de assinar com string vazia. Segredo ausente produziria tokens que qualquer um consegue forjar, e nada no comportamento denunciaria.
  if (!segredo || segredo.length < 32) {
    throw new ErroSegredoDeSessao();
  }
}

export class ErroSegredoDeSessao extends Error {
  readonly code = "config.session_secret_invalido";
  constructor() {
    super("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres)");
  }
}
