"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drainPendingReactions, enqueueReaction, type ReactionAction } from "@/lib/interaction-queue";

type Estado = {
  reacoes: number;
  minha: string | null;
  alternando: boolean;
};

export type ResultadoReacao = { reacoes: number; minha: string | null };

const TIPO_PADRAO = "estrela";

async function enviarReacao(acao: ReactionAction): Promise<boolean> {
  try {
    const r = await fetch("/api/reaction", {
      method: acao.operacao === "por" ? "PUT" : "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        uploadId: acao.uploadId,
        ...(acao.operacao === "por" ? { tipo: acao.tipo } : {}),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function otimista(estado: Estado, remover: boolean): Estado {
  if (remover) {
    return {
      ...estado,
      reacoes: Math.max(0, estado.reacoes - (estado.minha ? 1 : 0)),
      minha: null,
    };
  }
  if (estado.minha) return estado;
  return {
    ...estado,
    reacoes: estado.reacoes + 1,
    minha: TIPO_PADRAO,
  };
}

export function useReaction(
  uploadId: string,
  inicial: number | undefined,
  minhaInicial: string | null | undefined,
) {
  const [estado, setEstado] = useState<Estado>({
    reacoes: inicial ?? 0,
    minha: minhaInicial ?? null,
    alternando: false,
  });
  const drenando = useRef(false);

  const drenar = useCallback(async () => {
    if (drenando.current) return;
    drenando.current = true;
    try {
      await drainPendingReactions(enviarReacao);
    } finally {
      drenando.current = false;
    }
  }, []);

  useEffect(() => {
    void drenar();
    const online = () => void drenar();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [drenar]);

  const alternar = useCallback(async (): Promise<ResultadoReacao | undefined> => {
    let remover = false;
    setEstado((e) => {
      remover = e.minha !== null;
      return { ...otimista(e, remover), alternando: true };
    });

    const acao: ReactionAction = remover
      ? { operacao: "remover", uploadId }
      : { operacao: "por", uploadId, tipo: TIPO_PADRAO };

    try {
      const r = await fetch("/api/reaction", {
        method: remover ? "DELETE" : "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          uploadId,
          ...(remover ? {} : { tipo: TIPO_PADRAO }),
        }),
      });

      if (!r.ok) {
        await enqueueReaction(acao);
        setEstado((e) => ({ ...e, alternando: false }));
        return undefined;
      }

      const corpo = (await r.json()) as ResultadoReacao;
      setEstado({ reacoes: corpo.reacoes, minha: corpo.minha, alternando: false });
      return corpo;
    } catch {
      await enqueueReaction(acao);
      setEstado((e) => ({ ...e, alternando: false }));
      return undefined;
    }
  }, [uploadId]);

  return { ...estado, alternar };
}
