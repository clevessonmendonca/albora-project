/**
 * A chave de storage e derivada no servidor. Se o cliente a manda — no
 * topo do JSON ou dentro de `audio` — a escrita para aqui, igual ao
 * presign da midia do convidado. Verificacao 5 da spec 019.
 */
export function clientSentStorageKey(corpo: Record<string, unknown>): boolean {
  if ("chave" in corpo || "audioKey" in corpo || "storage_key" in corpo || "storageKey" in corpo) {
    return true;
  }

  const audio = corpo.audio;
  return Boolean(audio && typeof audio === "object" && audio !== null && "chave" in audio);
}
