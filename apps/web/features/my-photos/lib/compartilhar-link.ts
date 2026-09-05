import { shareWasAborted } from "@/lib/share-or-download";

export type ResultadoLink = "shared" | "copied" | "cancelled";

/** Compartilha uma URL: share sheet nativo quando há; senão copia o link. Nunca lança por cancelamento. */
export async function compartilharLink(url: string): Promise<ResultadoLink> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ url });
      return "shared";
    } catch (error) {
      if (shareWasAborted(error)) return "cancelled";
      throw error;
    }
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(url);
    return "copied";
  }
  return "cancelled";
}
