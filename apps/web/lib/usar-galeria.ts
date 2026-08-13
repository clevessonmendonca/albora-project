"use client";

import {
  drenar,
  montarGaleria,
  resumirGaleria,
  ehMimeVideo,
  type ItemDaGaleria,
  type ResumoDaGaleria,
} from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { filaWeb } from "./fila";
import { expirou, urlsDeMidia, type UrlDeMidia } from "./midia";
import { transporteWeb } from "./transporte";

type EnviadaServidor = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  criadaEm: string;
};

export type EstadoGaleria = {
  itens: ItemDaGaleria[];
  resumo: ResumoDaGaleria;
  urls: Map<string, UrlDeMidia>;
  mimes: Map<string, string>;
  carregando: boolean;
  drenando: boolean;
  falha: boolean;
};

const VAZIO: ResumoDaGaleria = { total: 0, enviadas: 0, subindo: 0, falhou: 0 };

function chavesParaAssinar(enviadas: readonly EnviadaServidor[]): string[] {
  const chaves: string[] = [];
  for (const m of enviadas) {
    chaves.push(m.chaveThumb);
    if (ehMimeVideo(m.mime)) chaves.push(m.chaveFull);
  }
  return [...new Set(chaves)];
}

export function usarGaleria(eventoId: string) {
  const [estado, setEstado] = useState<EstadoGaleria>({
    itens: [],
    resumo: VAZIO,
    urls: new Map(),
    mimes: new Map(),
    carregando: true,
    drenando: false,
    falha: false,
  });
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setEstado((e) => ({ ...e, carregando: true, falha: false }));

    try {
      const [res, fila] = await Promise.all([
        fetch("/api/minhas", { credentials: "same-origin" }),
        filaWeb.listar(),
      ]);

      if (!res.ok) throw new Error("minhas");

      const corpo = (await res.json()) as { enviadas: EnviadaServidor[] };
      const mimes = new Map(corpo.enviadas.map((m) => [m.id, m.mime]));
      const enviadas = corpo.enviadas.map((m) => ({
        id: m.id,
        chave: m.chaveFull,
        criadaEm: new Date(m.criadaEm),
      }));

      const itens = montarGaleria(enviadas, fila, eventoId);
      const resumo = resumirGaleria(itens);

      const chaves = chavesParaAssinar(corpo.enviadas);
      const urls = chaves.length > 0 ? await urlsDeMidia(chaves) : new Map<string, UrlDeMidia>();

      setEstado({ itens, resumo, urls, mimes, carregando: false, drenando: false, falha: false });
    } catch {
      setEstado((e) => ({ ...e, carregando: false, falha: true }));
    }
  }, [eventoId]);

  const tentarDeNovo = useCallback(async () => {
    if (!navigator.onLine) return;
    setEstado((e) => ({ ...e, drenando: true }));
    await drenar(filaWeb, transporteWeb, { online: () => navigator.onLine });
    await carregar();
  }, [carregar]);

  useEffect(() => {
    void carregar();
    const voltou = () => void carregar();
    window.addEventListener("online", voltou);
    return () => window.removeEventListener("online", voltou);
  }, [carregar]);

  const ehVideo = useCallback(
    (item: ItemDaGaleria): boolean => {
      const mime = estado.mimes.get(item.id);
      if (mime) return ehMimeVideo(mime);
      return false;
    },
    [estado.mimes],
  );

  const urlDe = useCallback(
    (item: ItemDaGaleria): string | null => {
      if (!item.chave) return null;
      const chaveThumb = item.chave.endsWith("/full")
        ? `${item.chave.slice(0, -"/full".length)}/thumb`
        : item.chave;

      const ler = (chave: string) => {
        const url = estado.urls.get(chave);
        if (!url || expirou(url, Date.now())) return url?.url ?? null;
        return url.url;
      };

      const miniatura = ler(chaveThumb);
      if (miniatura || !ehVideo(item)) return miniatura;
      return ler(item.chave);
    },
    [estado.urls, ehVideo],
  );

  const urlCheia = useCallback(
    (item: ItemDaGaleria): string | null => {
      if (!item.chave || !ehVideo(item)) return null;
      const url = estado.urls.get(item.chave);
      if (!url || expirou(url, Date.now())) return url?.url ?? null;
      return url.url;
    },
    [estado.urls, ehVideo],
  );

  const remover = useCallback(
    async (item: ItemDaGaleria) => {
      setRemovendoId(item.id);
      try {
        if (item.estado === "enviada") {
          const r = await fetch("/api/uploads", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ uploadId: item.id }),
          });
          if (!r.ok) return false;
        } else {
          await filaWeb.remover(item.id);
        }
        await carregar();
        return true;
      } catch {
        return false;
      } finally {
        setRemovendoId(null);
      }
    },
    [carregar],
  );

  return {
    ...estado,
    recarregar: carregar,
    tentarDeNovo,
    urlDe,
    urlCheia,
    ehVideo,
    remover,
    removendoId,
  };
}
