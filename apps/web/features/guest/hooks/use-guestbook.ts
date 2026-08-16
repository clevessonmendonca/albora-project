import { MAX_TEXT_CHARACTERS } from "@albora/core";

export type FalhaRecado = "rede" | "sessao";

export type AudioRecado = {
  duracaoSegundos: number;
  url: string;
};

export type TelaRecado = {
  texto: string | null;
  camera: "livre";
  audio: AudioRecado | null;
};

export type EstadoRecado = {
  carregando: boolean;
  jaCarregou: boolean;
  mostrar: boolean;
  texto: string | null;
  audio: AudioRecado | null;
  falha: FalhaRecado | null;
};

export function estadoInicial(): EstadoRecado {
  return {
    carregando: true,
    jaCarregou: false,
    mostrar: false,
    texto: null,
    audio: null,
    falha: null,
  };
}

export type RespostaRecado =
  | { ok: true; mostrar: boolean; texto: string | null; audio: AudioRecado | null }
  | { ok: false; falha: FalhaRecado };

function audioDaTela(raw: unknown): AudioRecado | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as { url?: unknown; duracaoSegundos?: unknown };
  if (typeof a.url !== "string" || a.url.trim() === "") return null;
  if (typeof a.duracaoSegundos !== "number" || a.duracaoSegundos <= 0) return null;
  return { url: a.url, duracaoSegundos: a.duracaoSegundos };
}

export async function buscarRecado(): Promise<RespostaRecado> {
  let res: Response;
  try {
    res = await fetch("/api/recado", { credentials: "same-origin" });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, falha: "sessao" };
  if (!res.ok) return { ok: false, falha: "rede" };

  try {
    const corpo = (await res.json()) as { mostrar?: boolean; tela?: TelaRecado };
    const tela = corpo.tela ?? { texto: null, camera: "livre" as const, audio: null };
    const mostrar = Boolean(corpo.mostrar) && tela.texto !== null && tela.texto.trim().length > 0;
    return {
      ok: true,
      mostrar,
      texto: mostrar ? tela.texto : null,
      audio: mostrar ? audioDaTela(tela.audio) : null,
    };
  } catch {
    return { ok: false, falha: "rede" };
  }
}

export async function marcarRecadoLido(): Promise<boolean> {
  try {
    const r = await fetch("/api/recado", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function comTela(
  estado: EstadoRecado,
  mostrar: boolean,
  texto: string | null,
  audio: AudioRecado | null = null,
): EstadoRecado {
  return { ...estado, carregando: false, jaCarregou: true, mostrar, texto, audio, falha: null };
}

export function comFalha(estado: EstadoRecado, falha: FalhaRecado): EstadoRecado {
  return { ...estado, carregando: false, jaCarregou: true, mostrar: false, audio: null, falha };
}

export function dispensar(estado: EstadoRecado): EstadoRecado {
  return { ...estado, mostrar: false, texto: null, audio: null };
}

export function recortarTexto(texto: string, teto = 160): { visivel: string; cortado: boolean } {
  const limite = Math.min(teto, MAX_TEXT_CHARACTERS);
  if (texto.length <= limite) return { visivel: texto, cortado: false };
  return { visivel: `${texto.slice(0, limite - 1).trimEnd()}…`, cortado: true };
}
