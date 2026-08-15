"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModoInteracao } from "@albora/core";
import { mensagemDaSugestao } from "@/features/music/lib/sugestao-na-tela";
import type { MusicaVisivel } from "@/features/music/types/musica-visivel";
import type { SugestaoVisivel } from "@/features/music/types/sugestao-visivel";

export type FalhaMusica = "rede" | "sessao";

export type EstadoMusica = {
  musica: MusicaVisivel | null;
  sugestoes: SugestaoVisivel[];
  interacao: ModoInteracao;
  carregando: boolean;
  jaCarregou: boolean;
  falha: FalhaMusica | null;
  enviando: boolean;
  erroSugestao: string | null;
  tetoAtingido: boolean;
};

export function estadoInicial(): EstadoMusica {
  return {
    musica: null,
    sugestoes: [],
    interacao: "espelho",
    carregando: true,
    jaCarregou: false,
    falha: null,
    enviando: false,
    erroSugestao: null,
    tetoAtingido: false,
  };
}

export type PaginaMusica = {
  musica: MusicaVisivel | null;
  sugestoes: SugestaoVisivel[];
  interacao: ModoInteracao;
};

export type RespostaGet =
  | { ok: true; pagina: PaginaMusica }
  | { ok: false; falha: FalhaMusica };

export type RespostaPost =
  | { ok: true; sugestoes: SugestaoVisivel[] }
  | { ok: false; falha: FalhaMusica }
  | { ok: false; code: string; details?: Record<string, unknown> };

function lerSugestoes(valor: unknown): SugestaoVisivel[] {
  if (!Array.isArray(valor)) return [];
  const saida: SugestaoVisivel[] = [];
  for (const item of valor) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.provedor === "string" &&
      typeof item.tipo === "string" &&
      typeof item.url === "string" &&
      typeof item.votos === "number"
    ) {
      saida.push({
        provedor: item.provedor,
        tipo: item.tipo,
        url: item.url,
        votos: item.votos,
      });
    }
  }
  return saida;
}

function lerMusica(valor: unknown): MusicaVisivel | null {
  if (!valor || typeof valor !== "object") return null;
  const m = valor as Record<string, unknown>;
  if (typeof m.provedor !== "string" || typeof m.rotulo !== "string" || typeof m.url !== "string") {
    return null;
  }
  return {
    provedor: m.provedor,
    rotulo: m.rotulo,
    url: m.url,
    capaUrl: typeof m.capaUrl === "string" ? m.capaUrl : null,
  };
}

export async function buscarMusica(): Promise<RespostaGet> {
  let res: Response;
  try {
    res = await fetch("/api/music", { credentials: "same-origin" });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, falha: "sessao" };
  if (!res.ok) return { ok: false, falha: "rede" };

  try {
    const corpo = (await res.json()) as Record<string, unknown>;
    return {
      ok: true,
      pagina: {
        musica: lerMusica(corpo.musica),
        sugestoes: lerSugestoes(corpo.sugestoes),
        interacao: corpo.interacao === "completo" ? "completo" : "espelho",
      },
    };
  } catch {
    return { ok: false, falha: "rede" };
  }
}

export async function enviarSugestao(url: string): Promise<RespostaPost> {
  let res: Response;
  try {
    res = await fetch("/api/music", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401) return { ok: false, falha: "sessao" };

  let corpo: Record<string, unknown>;
  try {
    corpo = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.ok) {
    return { ok: true, sugestoes: lerSugestoes(corpo.sugestoes) };
  }

  const code = typeof corpo.code === "string" ? corpo.code : "erro.interno";
  if (code === "musica.evento_divergente") return { ok: false, falha: "sessao" };

  const details =
    corpo.details && typeof corpo.details === "object"
      ? (corpo.details as Record<string, unknown>)
      : undefined;
  return details ? { ok: false, code, details } : { ok: false, code };
}

export function comPagina(estado: EstadoMusica, pagina: PaginaMusica): EstadoMusica {
  return {
    ...estado,
    musica: pagina.musica,
    sugestoes: pagina.sugestoes,
    interacao: pagina.interacao,
    carregando: false,
    jaCarregou: true,
    falha: null,
  };
}

export function comFalha(estado: EstadoMusica, falha: FalhaMusica): EstadoMusica {
  return { ...estado, carregando: false, jaCarregou: true, enviando: false, falha };
}

export function comEnvio(estado: EstadoMusica): EstadoMusica {
  return { ...estado, enviando: true, erroSugestao: null };
}

export function comSugestaoAceita(
  estado: EstadoMusica,
  sugestoes: SugestaoVisivel[],
): EstadoMusica {
  return {
    ...estado,
    enviando: false,
    erroSugestao: null,
    sugestoes,
  };
}

export function comSugestaoRecusada(
  estado: EstadoMusica,
  code: string,
  details?: Record<string, unknown>,
): EstadoMusica {
  return {
    ...estado,
    enviando: false,
    erroSugestao: mensagemDaSugestao(code, details),
    tetoAtingido: code === "musica.teto_de_sugestoes" ? true : estado.tetoAtingido,
    interacao: code === "musica.interacao_fechada" ? "espelho" : estado.interacao,
  };
}

export function comErroDeRedeNoEnvio(estado: EstadoMusica): EstadoMusica {
  return {
    ...estado,
    enviando: false,
    erroSugestao: mensagemDaSugestao("erro.interno"),
  };
}

export function useMusic() {
  const [estado, setEstado] = useState<EstadoMusica>(estadoInicial);

  const carregar = useCallback(async () => {
    setEstado((e) => ({ ...e, carregando: true, falha: null }));
    const r = await buscarMusica();
    setEstado((e) => (r.ok ? comPagina(e, r.pagina) : comFalha(e, r.falha)));
  }, []);

  const sugerir = useCallback(async (url: string): Promise<boolean> => {
    const colado = url.trim();
    if (colado === "") {
      setEstado((e) => comSugestaoRecusada(e, "validation_error"));
      return false;
    }

    setEstado(comEnvio);
    const r = await enviarSugestao(colado);
    if (r.ok) {
      setEstado((e) => comSugestaoAceita(e, r.sugestoes));
      return true;
    }
    if ("falha" in r) {
      setEstado((e) => (r.falha === "sessao" ? comFalha(e, "sessao") : comErroDeRedeNoEnvio(e)));
      return false;
    }
    setEstado((e) => comSugestaoRecusada(e, r.code, r.details));
    return false;
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { estado, sugerir };
}
