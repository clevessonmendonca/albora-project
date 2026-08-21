import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type MotivoDenuncia = "ofensivo" | "aparece_na_foto";

/**
 * Denuncia uma mídia ao anfitrião. Falha fechado: 401/403/offline retornam
 * false sem lançar exceção.
 */
export async function reportMedia(
  session: GuestSession,
  uploadId: string,
  kind: MotivoDenuncia = "ofensivo",
  motivo?: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const r = await fetchFn(`${apiOrigin()}/api/media/report`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(session.token),
      },
      body: JSON.stringify({
        uploadId,
        eventoId: session.eventoId,
        kind,
        ...(kind === "ofensivo" && motivo?.trim() ? { motivo: motivo.trim() } : {}),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
