"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServedAlbum } from "@/lib/album";
import { RENEWAL_BUFFER_MS } from "@/lib/media";

export type FalhaAlbum = "rede" | "sessao";

export type EstadoAlbum = {
  album: ServedAlbum | null;
  carregando: boolean;
  jaCarregou: boolean;
  falha: FalhaAlbum | null;
};

export function estadoInicial(): EstadoAlbum {
  return { album: null, carregando: true, jaCarregou: false, falha: null };
}

export type RespostaAlbum =
  | { ok: true; album: ServedAlbum }
  | { ok: false; falha: FalhaAlbum };

export async function buscarAlbum(): Promise<RespostaAlbum> {
  let res: Response;
  try {
    res = await fetch("/api/album", { credentials: "same-origin" });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, falha: "sessao" };
  if (!res.ok) return { ok: false, falha: "rede" };

  try {
    const corpo = (await res.json()) as { album?: ServedAlbum };
    if (!corpo.album || typeof corpo.album.expiraEm !== "number") {
      return { ok: false, falha: "rede" };
    }
    return { ok: true, album: corpo.album };
  } catch {
    return { ok: false, falha: "rede" };
  }
}

export function comAlbum(estado: EstadoAlbum, album: ServedAlbum): EstadoAlbum {
  return { album, carregando: false, jaCarregou: true, falha: null };
}

export function comFalha(estado: EstadoAlbum, falha: FalhaAlbum): EstadoAlbum {
  return { ...estado, carregando: false, jaCarregou: true, falha };
}

export function useAlbum() {
  const [estado, setEstado] = useState<EstadoAlbum>(estadoInicial);

  const carregar = useCallback(async () => {
    setEstado((e) => ({ ...e, carregando: true, falha: null }));
    const r = await buscarAlbum();
    setEstado((e) => (r.ok ? comAlbum(e, r.album) : comFalha(e, r.falha)));
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const expiraEm = estado.album?.expiraEm;
    if (!expiraEm) return;

    const espera = Math.max(0, expiraEm - RENEWAL_BUFFER_MS - Date.now());
    const relogio = setTimeout(() => void carregar(), espera);
    return () => clearTimeout(relogio);
  }, [estado.album?.expiraEm, carregar]);

  return { estado, recarregar: carregar };
}
