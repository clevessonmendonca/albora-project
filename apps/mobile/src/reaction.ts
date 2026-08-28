import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type ResultadoReacao = { reacoes: number; minha: string | null };
export type ReatorVisivel = { nome: string; sessaoId: string };

const TIPO_PADRAO = "estrela";

/** Lista quem curtiu uma foto — retorna vazio em 401/403/offline, falha fechado. */
export async function listReactions(
  session: GuestSession,
  uploadId: string,
  fetchFn: typeof fetch = fetch,
): Promise<ReatorVisivel[]> {
  try {
    const url = new URL(`${apiOrigin()}/api/reaction`);
    url.searchParams.set("uploadId", uploadId);
    url.searchParams.set("eventoId", session.eventoId);
    const r = await fetchFn(url.toString(), {
      headers: { cookie: cookieHeader(session.token) },
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { reatores?: ReatorVisivel[] };
    return data.reatores ?? [];
  } catch {
    return [];
  }
}

/** Alterna a reação estrela de uma foto — 401/403/offline retornam null, falha fechado. */
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
