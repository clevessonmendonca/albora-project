import { durationForUpload, normalizeGuestbookAudioMime } from "@albora/core";

export type PendingGuestbookAudio = {
  blob: Blob;
  mime: string;
  duracaoSegundos: number;
  previewUrl: string;
};

export type SavedGuestbookAudio = {
  duracaoSegundos: number;
  url: string;
};

export function mimeDoGravador(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidatos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidatos.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function podeGravar(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    mimeDoGravador() !== ""
  );
}

export function audioDoArquivo(file: File, duracaoSegundos: number): PendingGuestbookAudio | null {
  const mime = normalizeGuestbookAudioMime(file.type);
  const duracao = durationForUpload(duracaoSegundos);
  if (!mime || duracao === null) return null;
  return {
    blob: file,
    mime,
    duracaoSegundos: duracao,
    previewUrl: URL.createObjectURL(file),
  };
}

export function audioDoBlob(blob: Blob, mimeBruto: string, duracaoSegundos: number): PendingGuestbookAudio | null {
  const mime = normalizeGuestbookAudioMime(mimeBruto) ?? normalizeGuestbookAudioMime(blob.type);
  const duracao = durationForUpload(duracaoSegundos);
  if (!mime || duracao === null) return null;
  return {
    blob,
    mime,
    duracaoSegundos: duracao,
    previewUrl: URL.createObjectURL(blob),
  };
}

export function soltarPreview(audio: PendingGuestbookAudio | null) {
  if (audio) URL.revokeObjectURL(audio.previewUrl);
}
