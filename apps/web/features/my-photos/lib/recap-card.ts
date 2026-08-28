export type RecapPessoal = { fotos: number; curtidas: number };

/** `GET /api/guests/me/recap`: enriquecimento puro — qualquer falha devolve `null` e quem chama não mostra o card; a tela nunca depende disto para abrir. */
export async function buscarRecapPessoal(): Promise<RecapPessoal | null> {
  try {
    const r = await fetch("/api/guests/me/recap", { credentials: "same-origin" });
    if (!r.ok) return null;

    const data = (await r.json()) as Partial<RecapPessoal>;
    if (typeof data.fotos !== "number" || typeof data.curtidas !== "number") return null;

    return { fotos: data.fotos, curtidas: data.curtidas };
  } catch {
    return null;
  }
}
