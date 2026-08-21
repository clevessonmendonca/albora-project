import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type ComentarioItem = {
  id: string;
  autor: string;
  texto: string;
  criadaEm: string;
  meu: boolean;
  sessaoAutor: string;
  respostas: ComentarioItem[];
};

export type ListaComentarios = { threads: ComentarioItem[] };

/**
 * Busca comentários de uma foto. Retorna lista vazia em 401/403/offline
 * — falha fechado, sem lançar.
 */
export async function listComments(
  session: GuestSession,
  uploadId: string,
  fetchFn: typeof fetch = fetch,
): Promise<ListaComentarios> {
  try {
    const url = new URL(`${apiOrigin()}/api/comments`);
    url.searchParams.set("upload_id", uploadId);
    url.searchParams.set("eventoId", session.eventoId);
    const r = await fetchFn(url.toString(), {
      headers: { cookie: cookieHeader(session.token) },
    });
    if (!r.ok) return { threads: [] };
    const data = (await r.json()) as { threads?: ComentarioItem[] };
    return { threads: data.threads ?? [] };
  } catch {
    return { threads: [] };
  }
}

/**
 * Publica um comentário. Retorna o id gerado ou null em falha.
 */
export async function postComment(
  session: GuestSession,
  uploadId: string,
  texto: string,
  respostaA?: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<{ id: string } | null> {
  try {
    const r = await fetchFn(`${apiOrigin()}/api/comments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(session.token),
      },
      body: JSON.stringify({
        uploadId,
        eventoId: session.eventoId,
        texto,
        id: crypto.randomUUID(),
        ...(respostaA ? { respostaA } : {}),
      }),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { id?: string };
    return typeof data.id === "string" ? { id: data.id } : null;
  } catch {
    return null;
  }
}

/**
 * Remove um comentário próprio. Falha fechado.
 */
export async function deleteComment(
  session: GuestSession,
  comentarioId: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const r = await fetchFn(`${apiOrigin()}/api/comments`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(session.token),
      },
      body: JSON.stringify({ comentarioId, eventoId: session.eventoId }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
