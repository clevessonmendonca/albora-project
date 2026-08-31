import { apiOrigin, cookieHeader, type GuestSession } from "./session";
import { signMediaUrls } from "./sign-urls";
import type { FeedItem } from "./feed";

export type GuestProfilePage = {
  nome: string;
  itens: FeedItem[];
  proximoCursor: string | null;
};

export async function fetchGuestProfile(
  session: GuestSession,
  autorId: string,
  cursor?: string | null,
): Promise<GuestProfilePage> {
  const url = new URL(`${apiOrigin()}/api/guests/${encodeURIComponent(autorId)}`);
  url.searchParams.set("eventoId", session.eventoId);
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: { cookie: cookieHeader(session.token) },
  });

  if (res.status === 404) throw Object.assign(new Error("not_found"), { code: "not_found" });
  if (!res.ok) throw new Error(`guests ${res.status}`);

  const data = (await res.json()) as {
    nome?: string;
    itens?: Array<{
      id: string;
      chaveThumb: string;
      chaveFull: string;
      mime: string;
      autor: string;
      reacoes?: number;
      minhaReacao?: string | null;
      sessaoAutor?: string;
      minha?: boolean;
    }>;
    proximoCursor?: string | null;
  };

  const nome = typeof data.nome === "string" ? data.nome : "";
  const itens = data.itens ?? [];
  const chaves = itens.map((i) => i.chaveThumb).filter(Boolean);
  const urls = chaves.length > 0 ? await signMediaUrls(session, chaves) : [];
  const byKey = new Map(urls.map((u) => [u.chave, u.url]));

  return {
    nome,
    itens: itens.map((i) => {
      const thumbUrl = byKey.get(i.chaveThumb);
      return {
        id: i.id,
        chaveThumb: i.chaveThumb,
        chaveFull: i.chaveFull,
        mime: i.mime,
        autor: i.autor,
        reacoes: i.reacoes ?? 0,
        minhaReacao: i.minhaReacao ?? null,
        ...(i.sessaoAutor !== undefined ? { sessaoAutor: i.sessaoAutor } : {}),
        ...(i.minha !== undefined ? { minha: i.minha } : {}),
        ...(thumbUrl !== undefined ? { thumbUrl } : {}),
      };
    }),
    proximoCursor: data.proximoCursor ?? null,
  };
}
