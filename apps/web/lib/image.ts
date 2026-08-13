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
 * First video frame as JPEG — becomes `/thumb` in storage.
 *
 * Degrades to `null`: video still uploads and the UI uses the full asset.
 */
export async function videoPoster(blob: Blob): Promise<Blob | null> {
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

    if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;

    const instante = Number.isFinite(video.duration) && video.duration > 0
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
  } finally {
    URL.revokeObjectURL(url);
  }
}
