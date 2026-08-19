export type RecapPessoal = { fotos: number; curtidas: number };

/**
 * Busca o recap pessoal do próprio convidado (spec item 5) em
 * `GET /api/guests/me/recap` — quantas fotos ele mandou e quantas reações
 * recebeu, nesta sessão.
 *
 * Enriquecimento puro: qualquer falha (rede, sessão, agregação no servidor,
 * corpo inesperado) devolve `null`, e quem chama simplesmente não mostra o
 * card. A tela de "Minhas fotos" nunca depende disto para abrir.
 */
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
