import { apiOrigin, cookieHeader, type GuestSession } from "./session";

/** Pede URLs assinadas de curta duração para os objetos no storage. Usado tanto pelo feed quanto por Minhas. Falha silenciosa (retorna []): a imagem simplesmente não carrega, mas o app não quebra. */
export async function signMediaUrls(
  session: GuestSession,
  chaves: string[],
  fetchFn: typeof fetch = fetch,
): Promise<Array<{ chave: string; url: string }>> {
  if (chaves.length === 0) return [];
  const res = await fetchFn(`${apiOrigin()}/api/media/urls`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader(session.token),
    },
    body: JSON.stringify({ chaves }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { urls?: Array<{ chave: string; url: string }> };
  return data.urls ?? [];
}
