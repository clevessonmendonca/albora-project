"use client";

import {
  drenar,
  montarGaleria,
  resumirGaleria,
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
  criadaEm: string;
};

export type EstadoGaleria = {
  itens: ItemDaGaleria[];
  resumo: ResumoDaGaleria;
  urls: Map<string, UrlDeMidia>;
  carregando: boolean;
  drenando: boolean;
  falha: boolean;
};

const VAZIO: ResumoDaGaleria = { total: 0, enviadas: 0, subindo: 0, falhou: 0 };

export function usarGaleria(eventoId: string) {
  const [estado, setEstado] = useState<EstadoGaleria>({
    itens: [],
    resumo: VAZIO,
    urls: new Map(),
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
      const enviadas = corpo.enviadas.map((m) => ({
        id: m.id,
        chave: m.chaveFull,
        criadaEm: new Date(m.criadaEm),
      }));

      const itens = montarGaleria(enviadas, fila, eventoId);
      const resumo = resumirGaleria(itens);

      const chaves = corpo.enviadas.map((m) => m.chaveThumb);
      const urls = chaves.length > 0 ? await urlsDeMidia(chaves) : new Map<string, UrlDeMidia>();

      setEstado({ itens, resumo, urls, carregando: false, drenando: false, falha: false });
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

  const urlDe = useCallback(
    (item: ItemDaGaleria): string | null => {
      if (!item.chave) return null;
      const chaveThumb = item.chave.endsWith("/full")
        ? `${item.chave.slice(0, -"/full".length)}/thumb`
        : item.chave;
      const url = estado.urls.get(chaveThumb);
      if (!url || expirou(url, Date.now())) return url?.url ?? null;
      return url.url;
    },
    [estado.urls],
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

  return { ...estado, recarregar: carregar, tentarDeNovo, urlDe, remover, removendoId };
}
