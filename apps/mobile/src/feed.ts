import * as SecureStore from "expo-secure-store";
import { apiOrigin, cookieHeader, parseStoredSession, SESSION_STORE_KEY, type GuestSession } from "./session";
import { signMediaUrls } from "./sign-urls";

export type ModoInteracao = "espelho" | "completo";

export type FeedItem = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  autor: string;
  thumbUrl?: string;
  reacoes: number;
  minhaReacao: string | null;
  sessaoAutor?: string;
  minha?: boolean;
};

export type FeedPage = {
  itens: FeedItem[];
  proximoCursor: string | null;
  interacao: ModoInteracao;
};

export async function loadSession(): Promise<GuestSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
  return parseStoredSession(raw);
}

export async function fetchFeedPage(session: GuestSession, cursor?: string | null): Promise<FeedPage> {
  const url = new URL(`${apiOrigin()}/api/feed`);
  url.searchParams.set("eventoId", session.eventoId);
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: { cookie: cookieHeader(session.token) },
  });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const data = (await res.json()) as {
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
    interacao?: string;
  };

  const itens = data.itens ?? [];
  const chaves = itens.map((i) => i.chaveThumb).filter(Boolean);
  const urls = await signMediaUrls(session, chaves);
  const byKey = new Map(urls.map((u) => [u.chave, u.url]));
  const interacao: ModoInteracao = data.interacao === "completo" ? "completo" : "espelho";

  return {
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
    interacao,
  };
}

