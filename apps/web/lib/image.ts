/**
 * Whether **this** device decodes **this** format — asked of the decoder, not the user-agent.
 *
 * Safari opens HEIC natively and JPEG conversion is free in `processPhoto`; most
 * desktop Chrome and Android do not. User-agent strings lie both ways. The only
 * reliable answer is to try (N5.2).
 */

const supported = new Set<string>();

/**
 * Memoizes **success only** on purpose.
 *
 * A "yes" is device capability and does not change mid-event. A "no" may be the
 * file, not the device — caching failure would reject every following HEIC from
 * that guest after one truncated gallery pick.
 */
export async function deviceDecodes(bytes: Uint8Array, mime: string): Promise<boolean> {
  if (supported.has(mime)) return true;

  const decoded = await tryDecode(bytes, mime);
  if (decoded) supported.add(mime);

  return decoded;
}

async function tryDecode(bytes: Uint8Array, mime: string): Promise<boolean> {
  const create = globalThis.createImageBitmap;
  if (typeof create !== "function") return false;

  try {
    const bitmap = await create(new Blob([bytes as BufferSource], { type: mime }), 0, 0, 1, 1);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

export function forgetSupportedFormats(): void {
  supported.clear();
}

/**
 * First video frame as JPEG — becomes `/thumb` in storage — plus the real
 * display size, which the confirm persists so album/feed/wall do not assume
 * 1080×1920 portrait.
 *
 * Poster degrades to `null`: video still uploads. Size degrades the same way
 * when the decoder is silent; the UI then falls back.
 */

export type VideoPrep = {
  largura: number;
  altura: number;
  poster: Blob | null;
};

/**
 * Display size after the browser applies rotation. `videoWidth`/`videoHeight`
 * are already upright; sending the file's coded size would swap landscape
 * iPhone clips into portrait slots.
 */
export function videoDisplaySize(video: {
  videoWidth: number;
  videoHeight: number;
}): { largura: number; altura: number } | null {
  const largura = Math.round(video.videoWidth);
  const altura = Math.round(video.videoHeight);
  if (!Number.isFinite(largura) || !Number.isFinite(altura)) return null;
  if (largura < 1 || altura < 1) return null;
  return { largura, altura };
}

export async function prepareVideo(blob: Blob): Promise<VideoPrep | null> {
  if (typeof document === "undefined") return null;

  const url = URL.createObjectURL(blob);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video"));
      video.src = url;
    });

    const tamanho = videoDisplaySize(video);
    if (!tamanho) return null;

    return { ...tamanho, poster: await posterFromVideo(video) };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function posterFromVideo(video: HTMLVideoElement): Promise<Blob | null> {
  try {
    const instante =
      Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(0.25, video.duration * 0.05)
        : 0;
    video.currentTime = instante;

    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("seek"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    return await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72);
    });
  } catch {
    return null;
  }
}
