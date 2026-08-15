export type ShareOutcome = "compartilhado" | "baixado" | "cancelado";

export function shareWasAborted(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

/** Folha nativa com o arquivo; se o aparelho não souber, baixa o composto. */
export async function shareOrDownload(blob: Blob, nomeArquivo: string): Promise<ShareOutcome> {
  const arquivo = new File([blob], nomeArquivo, { type: blob.type || "image/jpeg" });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo] });
      return "compartilhado";
    } catch (error) {
      if (shareWasAborted(error)) return "cancelado";
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
  return "baixado";
}
