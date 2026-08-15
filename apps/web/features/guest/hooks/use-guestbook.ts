import { MAX_TEXT_CHARACTERS } from "@albora/core";

export type FalhaRecado = "rede" | "sessao";

export type TelaRecado = {
  texto: string | null;
  camera: "livre";
};

export type EstadoRecado = {
  carregando: boolean;
  jaCarregou: boolean;
  mostrar: boolean;
  texto: string | null;
  falha: FalhaRecado | null;
};

export function estadoInicial(): EstadoRecado {
  return { carregando: true, jaCarregou: false, mostrar: false, texto: null, falha: null };
}

export type RespostaRecado =
  | { ok: true; mostrar: boolean; texto: string | null }
  | { ok: false; falha: FalhaRecado };

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
    const tela = corpo.tela ?? { texto: null, camera: "livre" as const };
    const mostrar = Boolean(corpo.mostrar) && tela.texto !== null && tela.texto.trim().length > 0;
    return { ok: true, mostrar, texto: mostrar ? tela.texto : null };
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

export function comTela(estado: EstadoRecado, mostrar: boolean, texto: string | null): EstadoRecado {
  return { ...estado, carregando: false, jaCarregou: true, mostrar, texto, falha: null };
}

export function comFalha(estado: EstadoRecado, falha: FalhaRecado): EstadoRecado {
  return { ...estado, carregando: false, jaCarregou: true, mostrar: false, falha };
}

export function dispensar(estado: EstadoRecado): EstadoRecado {
  return { ...estado, mostrar: false, texto: null };
}

export function recortarTexto(texto: string, teto = 160): { visivel: string; cortado: boolean } {
  const limite = Math.min(teto, MAX_TEXT_CHARACTERS);
  if (texto.length <= limite) return { visivel: texto, cortado: false };
  return { visivel: `${texto.slice(0, limite - 1).trimEnd()}…`, cortado: true };
}
