/** Dispara o download de um Blob já em memória, sem round-trip de rede. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ErrorBody = {
  message?: string;
  details?: { problemas?: string[] };
};

/** Busca um arquivo em uma rota da API admin, convertendo erro (JSON) em mensagem legível. */
export async function downloadFromApi(path: string): Promise<Blob> {
  const r = await fetch(path);
  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as ErrorBody | null;
    const msg = body?.details?.problemas?.join(" ") ?? body?.message ?? "Não gerou o arquivo.";
    throw new Error(msg);
  }
  return r.blob();
}
