/** Chave de storage derivada no servidor — cliente que manda a chave (no topo ou dentro de `audio`) é barrado aqui; verificação 5 da spec 019. */
export function clientSentStorageKey(corpo: Record<string, unknown>): boolean {
  if ("chave" in corpo || "audioKey" in corpo || "storage_key" in corpo || "storageKey" in corpo) {
    return true;
  }

  const audio = corpo.audio;
  return Boolean(audio && typeof audio === "object" && audio !== null && "chave" in audio);
}
