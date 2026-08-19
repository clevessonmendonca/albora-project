import { shareOrDownload, shareWasAborted, type ShareOutcome } from "@/lib/share-or-download";

/**
 * O recap é um carrossel — Web Share API nível 2 aceita vários arquivos numa
 * chamada só, e é isso que deixa o convidado postar em UM toque em vez de N
 * folhas nativas em sequência (cada post é o anúncio orgânico da spec A2).
 *
 * Onde o aparelho não aceita múltiplos arquivos, cai para `shareOrDownload`
 * foto a foto — a mesma folha que o share de uma foto já usa, sem duplicar a
 * decisão de share-vs-download.
 */
export async function compartilharRecap(
  blobs: readonly Blob[],
  nomeBase: string,
): Promise<ShareOutcome> {
  if (blobs.length === 0) return "cancelled";

  const arquivos = blobs.map(
    (blob, indice) =>
      new File([blob], `${nomeBase}-${indice + 1}.jpg`, { type: blob.type || "image/jpeg" }),
  );

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: arquivos })) {
    try {
      await navigator.share({ files: arquivos });
      return "shared";
    } catch (error) {
      if (shareWasAborted(error)) return "cancelled";
      throw error;
    }
  }

  let compartilhouAlgum = false;
  let baixouAlgum = false;

  for (let indice = 0; indice < blobs.length; indice += 1) {
    const blob = blobs[indice]!;
    const resultado = await shareOrDownload(blob, `${nomeBase}-${indice + 1}.jpg`);
    if (resultado === "shared") compartilhouAlgum = true;
    else if (resultado === "downloaded") baixouAlgum = true;
  }

  if (compartilhouAlgum) return "shared";
  if (baixouAlgum) return "downloaded";
  return "cancelled";
}
