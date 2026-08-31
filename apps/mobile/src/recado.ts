import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type AudioRecado = {
  duracaoSegundos: number;
  url: string;
};

export type RespostaRecado =
  | { ok: true; mostrar: boolean; texto: string | null; audio: AudioRecado | null }
  | { ok: false; falha: "rede" | "sessao" };

type TelaRecadoBruta = {
  texto?: unknown;
  camera?: unknown;
  audio?: unknown;
};

function audioDaTela(raw: unknown): AudioRecado | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as { url?: unknown; duracaoSegundos?: unknown };
  if (typeof a.url !== "string" || a.url.trim() === "") return null;
  if (typeof a.duracaoSegundos !== "number" || a.duracaoSegundos <= 0) return null;
  return { url: a.url, duracaoSegundos: a.duracaoSegundos };
}

export async function buscarRecado(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<RespostaRecado> {
  const url = new URL(`${apiOrigin()}/api/recado`);
  url.searchParams.set("eventoId", session.eventoId);

  let res: Response;
  try {
    res = await fetchFn(url.toString(), {
      headers: { cookie: cookieHeader(session.token) },
    });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, falha: "sessao" };
  if (!res.ok) return { ok: false, falha: "rede" };

  try {
    const corpo = (await res.json()) as { mostrar?: boolean; tela?: TelaRecadoBruta };
    const tela = corpo.tela ?? { texto: null, camera: "livre" };
    const textoStr = typeof tela.texto === "string" ? tela.texto : null;
    const mostrar =
      Boolean(corpo.mostrar) && textoStr !== null && textoStr.trim().length > 0;
    return {
      ok: true,
      mostrar,
      texto: mostrar ? textoStr : null,
      audio: mostrar ? audioDaTela(tela.audio ?? null) : null,
    };
  } catch {
    return { ok: false, falha: "rede" };
  }
}

export async function marcarRecadoLido(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const url = new URL(`${apiOrigin()}/api/recado`);
  url.searchParams.set("eventoId", session.eventoId);
  try {
    const r = await fetchFn(url.toString(), {
      method: "POST",
      headers: {
        cookie: cookieHeader(session.token),
        "content-type": "application/json",
      },
      body: "{}",
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function recortarTexto(texto: string, teto = 160): { visivel: string; cortado: boolean } {
  if (texto.length <= teto) return { visivel: texto, cortado: false };
  return { visivel: `${texto.slice(0, teto - 1).trimEnd()}…`, cortado: true };
}
