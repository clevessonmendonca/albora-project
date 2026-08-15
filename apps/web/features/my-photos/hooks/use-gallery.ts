"use client";

import {
  montarGaleria,
  resumirGaleria,
  isVideoMime,
  type ItemDaGaleria,
  type ModoInteracao,
  type ResumoDaGaleria,
} from "@albora/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import { drainAndReport } from "@/features/guest/lib/funnel-from-drain";
import { isExpired, mediaUrls, type MediaUrl } from "@/lib/media";
import { webQueue } from "@/lib/queue";
import { webTransport } from "@/lib/transport";

type EnviadaServidor = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  criadaEm: string;
  autor: string;
  legenda: string | null;
  lugar: string | null;
  reacoes?: number;
  minhaReacao?: string | null;
};

export type EstadoGaleria = {
  itens: ItemDaGaleria[];
  resumo: ResumoDaGaleria;
  urls: Map<string, MediaUrl>;
  mimes: Map<string, string>;
  interacao: ModoInteracao;
  carregando: boolean;
  drenando: boolean;
  falha: boolean;
};

const VAZIO: ResumoDaGaleria = { total: 0, enviadas: 0, subindo: 0, falhou: 0 };

function chavesParaAssinar(enviadas: readonly EnviadaServidor[]): string[] {
  const chaves: string[] = [];
  for (const m of enviadas) {
    chaves.push(m.chaveThumb, m.chaveFull);
  }
  return [...new Set(chaves)];
}

function paraItemVisivel(m: EnviadaServidor): ItemVisivel {
  return {
    id: m.id,
    chaveThumb: m.chaveThumb,
    chaveFull: m.chaveFull,
    mime: m.mime,
    autor: m.autor,
    legenda: m.legenda,
    lugar: m.lugar,
    criadaEm: m.criadaEm,
    minha: true,
    ...(typeof m.reacoes === "number" ? { reacoes: m.reacoes } : {}),
    ...(m.minhaReacao !== undefined ? { minhaReacao: m.minhaReacao } : {}),
  };
}

export function useGallery(eventoId: string) {
  const [estado, setEstado] = useState<EstadoGaleria>({
    itens: [],
    resumo: VAZIO,
    urls: new Map(),
    mimes: new Map(),
    interacao: "espelho",
    carregando: true,
    drenando: false,
    falha: false,
  });
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [enviadasDetalhe, setEnviadasDetalhe] = useState<EnviadaServidor[]>([]);

  const carregar = useCallback(async () => {
    setEstado((e) => ({ ...e, carregando: true, falha: false }));

    try {
      const [res, fila] = await Promise.all([
        fetch("/api/my-photos", { credentials: "same-origin" }),
        webQueue.list(),
      ]);

      if (!res.ok) throw new Error("minhas");

      const corpo = (await res.json()) as {
        interacao?: ModoInteracao;
        enviadas: EnviadaServidor[];
      };
      const interacao = corpo.interacao === "completo" ? "completo" : "espelho";
      const mimes = new Map(corpo.enviadas.map((m) => [m.id, m.mime]));
      setEnviadasDetalhe(corpo.enviadas);
      const enviadas = corpo.enviadas.map((m) => ({
        id: m.id,
        chave: m.chaveFull,
        criadaEm: new Date(m.criadaEm),
      }));

      const itens = montarGaleria(enviadas, fila, eventoId);
      const resumo = resumirGaleria(itens);

      const chaves = chavesParaAssinar(corpo.enviadas);
      const urls = chaves.length > 0 ? await mediaUrls(chaves) : new Map<string, MediaUrl>();

      setEstado({
        itens,
        resumo,
        urls,
        mimes,
        interacao,
        carregando: false,
        drenando: false,
        falha: false,
      });
    } catch {
      setEstado((e) => ({ ...e, carregando: false, falha: true }));
    }
  }, [eventoId]);

  const tentarDeNovo = useCallback(async () => {
    if (!navigator.onLine) return;
    setEstado((e) => ({ ...e, drenando: true }));
    await drainAndReport(webQueue, webTransport, { online: () => navigator.onLine });
    await carregar();
  }, [carregar]);

  useEffect(() => {
    void carregar();
    const voltou = () => void carregar();
    window.addEventListener("online", voltou);
    return () => window.removeEventListener("online", voltou);
  }, [carregar]);

  const isVideo = useCallback(
    (item: ItemDaGaleria): boolean => {
      const mime = estado.mimes.get(item.id);
      if (mime) return isVideoMime(mime);
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
        if (!url || isExpired(url, Date.now())) return url?.url ?? null;
        return url.url;
      };

      const miniatura = ler(chaveThumb);
      if (miniatura || !isVideo(item)) return miniatura;
      return ler(item.chave);
    },
    [estado.urls, isVideo],
  );

  const urlCheia = useCallback(
    (item: ItemDaGaleria): string | null => {
      if (!item.chave || !isVideo(item)) return null;
      const url = estado.urls.get(item.chave);
      if (!url || isExpired(url, Date.now())) return url?.url ?? null;
      return url.url;
    },
    [estado.urls, isVideo],
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
          await webQueue.remove(item.id);
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

  const atualizarReacoes = useCallback((uploadId: string, resultado: { reacoes: number; minha: string | null }) => {
    setEnviadasDetalhe((lista) =>
      lista.map((m) =>
        m.id === uploadId ? { ...m, reacoes: resultado.reacoes, minhaReacao: resultado.minha } : m,
      ),
    );
  }, []);

  const itensVisiveis = useMemo(
    () => enviadasDetalhe.map(paraItemVisivel),
    [enviadasDetalhe],
  );

  return {
    ...estado,
    itensVisiveis,
    recarregar: carregar,
    tentarDeNovo,
    urlDe,
    urlCheia,
    isVideo,
    remover,
    removendoId,
    atualizarReacoes,
  };
}
