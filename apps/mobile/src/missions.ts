import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type MissaoItem = {
  id: string;
  titulo: string;
  feito: boolean;
};

export type MissoesResult = {
  missoes: MissaoItem[];
};

type ServidorResposta = {
  missoes?: Array<{ id: string; titulo: string; feito: boolean }>;
};

export async function fetchMissoes(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<MissoesResult> {
  const url = new URL(`${apiOrigin()}/api/missions`);
  url.searchParams.set("eventoId", session.eventoId);

  const res = await fetchFn(url.toString(), {
    headers: { cookie: cookieHeader(session.token) },
  });

  if (!res.ok) throw new Error(`missions ${res.status}`);

  const data = (await res.json()) as ServidorResposta;

  return { missoes: data.missoes ?? [] };
}
