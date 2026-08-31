import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type RecapPessoal = { fotos: number; curtidas: number };

/** Busca o recap pessoal (`GET /api/guests/me/recap`). Qualquer falha → null; Minhas nunca depende disto para abrir. */
export async function buscarRecapPessoal(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<RecapPessoal | null> {
  try {
    const res = await fetchFn(`${apiOrigin()}/api/guests/me/recap`, {
      headers: { cookie: cookieHeader(session.token) },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<RecapPessoal>;
    if (typeof data.fotos !== "number" || typeof data.curtidas !== "number") return null;
    return { fotos: data.fotos, curtidas: data.curtidas };
  } catch {
    return null;
  }
}

/** Cópia do card — espelha a web (`RecapCard`). */
export function textoRecap(recap: RecapPessoal): string | null {
  if (recap.fotos <= 0) return null;
  const fotos = recap.fotos === 1 ? "1 foto" : `${recap.fotos} fotos`;
  const curtidas =
    recap.curtidas > 0
      ? ` · curtida ${recap.curtidas === 1 ? "1 vez" : `${recap.curtidas} vezes`}`
      : "";
  return `Você mandou ${fotos}${curtidas}`;
}
