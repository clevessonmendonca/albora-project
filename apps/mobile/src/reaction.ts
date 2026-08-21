import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type ResultadoReacao = { reacoes: number; minha: string | null };

const TIPO_PADRAO = "estrela";

/**
 * Alterna a reação estrela de uma foto. Falha fechado: 401/403/offline
 * retornam null sem lançar exceção.
 */
export async function toggleReaction(
  session: GuestSession,
  uploadId: string,
  minhaAtual: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<ResultadoReacao | null> {
  const remover = minhaAtual !== null;
  try {
    const r = await fetchFn(`${apiOrigin()}/api/reaction`, {
      method: remover ? "DELETE" : "PUT",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(session.token),
      },
      body: JSON.stringify({
        uploadId,
        eventoId: session.eventoId,
        ...(remover ? {} : { tipo: TIPO_PADRAO }),
      }),
    });
    if (!r.ok) return null;
    return (await r.json()) as ResultadoReacao;
  } catch {
    return null;
  }
}
