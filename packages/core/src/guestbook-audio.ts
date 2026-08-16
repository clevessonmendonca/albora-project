import { TETO_AUDIO_SEGUNDOS } from "./guestbook";

/**
 * Tipos que o anfitrião pode gravar ou anexar. WAV fica de fora de
 * propósito: 60 s sem compressão passam do teto de bytes e viram upload
 * sem limite prático.
 */
export const TIPOS_AUDIO_RECADO = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"] as const;
export type TipoAudioRecado = (typeof TIPOS_AUDIO_RECADO)[number];

/** Teto de 60 s de voz comprimida, com folga para o MediaRecorder do Safari. */
export const TETO_BYTES_AUDIO_RECADO = 4 * 1024 * 1024;

export const ACEITE_AUDIO_VERSAO = "v1";

export type ErroAudioRecado =
  | { code: "recado.audio_tipo_recusado"; details: { recebido: string } }
  | { code: "recado.audio_grande_demais"; details: { bytes: number; limite: number } }
  | { code: "recado.audio_vazio" }
  | { code: "recado.audio_longo_demais"; details: { segundos: number; limite: number } }
  | { code: "recado.audio_conteudo_nao_confere"; details: { declarado: string } }
  | { code: "recado.audio_aceite_ausente" };

export function normalizarMimeAudio(mime: string): TipoAudioRecado | null {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "audio/x-m4a" || base === "audio/aac") return "audio/mp4";
  if ((TIPOS_AUDIO_RECADO as readonly string[]).includes(base)) return base as TipoAudioRecado;
  return null;
}

export function duracaoParaEnvio(segundos: number): number | null {
  if (!Number.isFinite(segundos) || segundos <= 0) return null;
  if (segundos > TETO_AUDIO_SEGUNDOS + 1) return null;
  return Math.min(TETO_AUDIO_SEGUNDOS, Math.max(1, Math.round(segundos)));
}

export function validarDeclaracaoAudio(
  mime: string,
  bytes: number,
  duracaoSegundos: number,
): ErroAudioRecado | null {
  if (normalizarMimeAudio(mime) === null) {
    return { code: "recado.audio_tipo_recusado", details: { recebido: mime } };
  }
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > TETO_BYTES_AUDIO_RECADO) {
    return {
      code: "recado.audio_grande_demais",
      details: { bytes, limite: TETO_BYTES_AUDIO_RECADO },
    };
  }
  if (!Number.isFinite(duracaoSegundos) || duracaoSegundos <= 0) {
    return { code: "recado.audio_vazio" };
  }
  if (duracaoSegundos > TETO_AUDIO_SEGUNDOS) {
    return {
      code: "recado.audio_longo_demais",
      details: { segundos: duracaoSegundos, limite: TETO_AUDIO_SEGUNDOS },
    };
  }
  return null;
}

export function validarAceiteAudio(aceite: unknown): ErroAudioRecado | null {
  if (aceite !== ACEITE_AUDIO_VERSAO) return { code: "recado.audio_aceite_ausente" };
  return null;
}

function ehEbml(inicio: Uint8Array): boolean {
  return inicio.length >= 4 && inicio[0] === 0x1a && inicio[1] === 0x45 && inicio[2] === 0xdf && inicio[3] === 0xa3;
}

function ehOgg(inicio: Uint8Array): boolean {
  return inicio.length >= 4 && inicio[0] === 0x4f && inicio[1] === 0x67 && inicio[2] === 0x67 && inicio[3] === 0x53;
}

function ehMpeg(inicio: Uint8Array): boolean {
  if (inicio.length >= 3 && inicio[0] === 0x49 && inicio[1] === 0x44 && inicio[2] === 0x33) return true;
  return inicio.length >= 2 && inicio[0] === 0xff && (inicio[1]! & 0xe0) === 0xe0;
}

function ehIsoBmff(inicio: Uint8Array): boolean {
  return (
    inicio.length >= 8 &&
    inicio[4] === 0x66 &&
    inicio[5] === 0x74 &&
    inicio[6] === 0x79 &&
    inicio[7] === 0x70
  );
}

function ehWav(inicio: Uint8Array): boolean {
  return (
    inicio.length >= 12 &&
    inicio[0] === 0x52 &&
    inicio[1] === 0x49 &&
    inicio[2] === 0x46 &&
    inicio[3] === 0x46 &&
    inicio[8] === 0x57 &&
    inicio[9] === 0x41 &&
    inicio[10] === 0x56 &&
    inicio[11] === 0x45
  );
}

/**
 * O Content-Type do cliente não vale nada: um "webm" que é HTML servido da
 * origem do app é XSS armazenado. WAV recusado mesmo declarado como outro
 * tipo — é o arquivo que estoura o teto sem compressão.
 */
export function validarConteudoAudio(mimeDeclarado: string, inicio: Uint8Array): ErroAudioRecado | null {
  if (ehWav(inicio)) {
    return { code: "recado.audio_conteudo_nao_confere", details: { declarado: mimeDeclarado } };
  }

  const mime = normalizarMimeAudio(mimeDeclarado);
  const casa =
    (mime === "audio/webm" && ehEbml(inicio)) ||
    (mime === "audio/ogg" && ehOgg(inicio)) ||
    (mime === "audio/mpeg" && ehMpeg(inicio)) ||
    (mime === "audio/mp4" && ehIsoBmff(inicio));

  if (!casa) {
    return { code: "recado.audio_conteudo_nao_confere", details: { declarado: mimeDeclarado } };
  }
  return null;
}
