import { apiOrigin, cookieHeader, type GuestSession } from "./session";
import { signMediaUrls } from "./sign-urls";

export type StoryItem = {
  id: string;
  autor: string;
  chaveThumb: string;
  thumbUrl?: string;
};

/**
 * Busca as stories ativas do evento e resolve as URLs assinadas das miniaturas.
 *
 * Nunca lança. Stories são enriquecimento (CLAUDE.md, "degrada, nunca falha"):
 * qualquer falha de rede ou resposta fora de 2xx devolve lista vazia.
 */
export async function fetchStories(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<StoryItem[]> {
  try {
    const res = await fetchFn(`${apiOrigin()}/api/stories`, {
      headers: { cookie: cookieHeader(session.token) },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      itens?: Array<{ id: string; autor: string; chaveThumb: string }>;
    };
    const itens = Array.isArray(data.itens) ? data.itens : [];
    if (itens.length === 0) return [];

    const chaves = itens.map((i) => i.chaveThumb).filter(Boolean);
    const urls = await signMediaUrls(session, chaves, fetchFn);
    const byKey = new Map(urls.map((u) => [u.chave, u.url]));

    return itens.map((i): StoryItem => {
      const thumbUrl = byKey.get(i.chaveThumb);
      if (thumbUrl !== undefined) {
        return { id: i.id, autor: i.autor, chaveThumb: i.chaveThumb, thumbUrl };
      }
      return { id: i.id, autor: i.autor, chaveThumb: i.chaveThumb };
    });
  } catch {
    return [];
  }
}
