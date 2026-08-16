import type { GuestbookAudio } from "@albora/core";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

export type AudioNaTela = { duracaoSegundos: number; url: string };

/**
 * Assina a leitura do áudio. Se a assinatura falhar, devolve null — o texto
 * continua, a câmera segue. O recado é enriquecimento, nunca caminho crítico.
 */
export async function signGuestbookAudio(
  audio: GuestbookAudio | null,
): Promise<AudioNaTela | null> {
  if (!audio) return null;
  try {
    return {
      duracaoSegundos: audio.duracaoSegundos,
      url: await assinarGet(audio.chave, GET_TTL_SECONDS),
    };
  } catch {
    return null;
  }
}
