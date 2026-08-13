"use client";

import { MAX_CARACTERES } from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  drainPendingComments,
  enqueueComment,
  type CommentAction,
} from "@/lib/interaction-queue";

export type ComentarioVisivel = {
  id: string;
  autor: string;
  texto: string;
  criadaEm: string;
  meu: boolean;
  sessaoAutor: string;
  respostas: ComentarioVisivel[];
  pendente?: boolean;
};

type Estado = {
  threads: ComentarioVisivel[];
  carregando: boolean;
  publicando: boolean;
  aberto: boolean;
  erro: boolean;
};

async function enviarComentario(acao: CommentAction): Promise<boolean> {
  try {
    const r = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: acao.id,
        uploadId: acao.uploadId,
        texto: acao.texto,
        ...(acao.respostaA ? { respostaA: acao.respostaA } : {}),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function comentarioOtimista(id: string, texto: string): ComentarioVisivel {
  return {
    id,
    autor: "Você",
    texto,
    criadaEm: new Date().toISOString(),
    meu: true,
    sessaoAutor: "",
    respostas: [],
    pendente: true,
  };
}

function inserirOtimista(
  threads: ComentarioVisivel[],
  novo: ComentarioVisivel,
  respostaA: string | null,
): ComentarioVisivel[] {
  if (respostaA === null) return [...threads, novo];

  return threads.map((t) =>
    t.id === respostaA ? { ...t, respostas: [...t.respostas, novo] } : t,
  );
}

export function useComments(uploadId: string, habilitado: boolean) {
  const [estado, setEstado] = useState<Estado>({
    threads: [],
    carregando: false,
    publicando: false,
    aberto: false,
    erro: false,
  });
  const [texto, setTexto] = useState("");
  const [respostaA, setRespostaA] = useState<string | null>(null);
  const drenando = useRef(false);

  const carregar = useCallback(async () => {
    setEstado((e) => ({ ...e, carregando: true, erro: false }));
    try {
      const r = await fetch(`/api/comments?upload_id=${encodeURIComponent(uploadId)}`, {
        credentials: "same-origin",
      });
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as { threads: ComentarioVisivel[] };
      setEstado((e) => ({ ...e, threads: corpo.threads ?? [], carregando: false }));
    } catch {
      setEstado((e) => ({ ...e, carregando: false, erro: true }));
    }
  }, [uploadId]);

  const drenar = useCallback(async () => {
    if (drenando.current) return;
    drenando.current = true;
    try {
      await drainPendingComments(async (acao) => {
        const ok = await enviarComentario(acao);
        if (ok) await carregar();
        return ok;
      });
    } finally {
      drenando.current = false;
    }
  }, [carregar]);

  const abrir = useCallback(() => {
    setEstado((e) => ({ ...e, aberto: true }));
    void carregar();
  }, [carregar]);

  const fechar = useCallback(() => {
    setEstado((e) => ({ ...e, aberto: false }));
    setRespostaA(null);
  }, []);

  useEffect(() => {
    if (!habilitado || estado.carregando) return;
    if (estado.threads.length === 0 && !estado.erro) void carregar();
  }, [habilitado, estado.threads.length, estado.carregando, estado.erro, carregar]);

  useEffect(() => {
    void drenar();
    const online = () => void drenar();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [drenar]);

  const publicar = useCallback(async () => {
    const limpo = texto.trim();
    if (!limpo || limpo.length > MAX_CARACTERES) return;

    const id = crypto.randomUUID();
    const alvoResposta = respostaA;
    const otimista = comentarioOtimista(id, limpo);

    setEstado((e) => ({
      ...e,
      publicando: true,
      erro: false,
      threads: inserirOtimista(e.threads, otimista, alvoResposta),
    }));
    setTexto("");
    setRespostaA(null);

    const acao: CommentAction = {
      operacao: "publicar",
      id,
      uploadId,
      texto: limpo,
      respostaA: alvoResposta,
    };

    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          id,
          uploadId,
          texto: limpo,
          ...(alvoResposta ? { respostaA: alvoResposta } : {}),
        }),
      });

      if (!r.ok) {
        await enqueueComment(acao);
        setEstado((e) => ({ ...e, publicando: false }));
        return;
      }

      await carregar();
    } catch {
      await enqueueComment(acao);
      setEstado((e) => ({ ...e, erro: true }));
    } finally {
      setEstado((e) => ({ ...e, publicando: false }));
    }
  }, [texto, uploadId, respostaA, carregar]);

  const remover = useCallback(
    async (comentarioId: string) => {
      setEstado((e) => ({ ...e, publicando: true, erro: false }));
      try {
        const r = await fetch("/api/comments", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ comentarioId }),
        });
        if (!r.ok) throw new Error("falhou");
        await carregar();
      } catch {
        setEstado((e) => ({ ...e, erro: true }));
      } finally {
        setEstado((e) => ({ ...e, publicando: false }));
      }
    },
    [carregar],
  );

  const denunciar = useCallback(
    async (comentarioId: string) => {
      setEstado((e) => ({ ...e, publicando: true, erro: false }));
      try {
        const r = await fetch("/api/comments/report", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ comentarioId }),
        });
        if (!r.ok) throw new Error("falhou");
        await carregar();
        return true;
      } catch {
        setEstado((e) => ({ ...e, erro: true }));
        return false;
      } finally {
        setEstado((e) => ({ ...e, publicando: false }));
      }
    },
    [carregar],
  );

  const bloquear = useCallback(
    async (sessaoAutor: string) => {
      if (!sessaoAutor) return false;
      setEstado((e) => ({ ...e, publicando: true, erro: false }));
      try {
        const r = await fetch("/api/blocks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ sessaoId: sessaoAutor }),
        });
        if (!r.ok) throw new Error("falhou");
        await carregar();
        return true;
      } catch {
        setEstado((e) => ({ ...e, erro: true }));
        return false;
      } finally {
        setEstado((e) => ({ ...e, publicando: false }));
      }
    },
    [carregar],
  );

  const iniciarResposta = useCallback((comentarioId: string) => {
    setRespostaA(comentarioId);
    setEstado((e) => ({ ...e, aberto: true }));
  }, []);

  const cancelarResposta = useCallback(() => {
    setRespostaA(null);
  }, []);

  const total = estado.threads.reduce((s, t) => s + 1 + t.respostas.length, 0);

  return {
    ...estado,
    texto,
    setTexto,
    respostaA,
    total,
    abrir,
    fechar,
    publicar,
    remover,
    denunciar,
    bloquear,
    iniciarResposta,
    cancelarResposta,
    maxCaracteres: MAX_CARACTERES,
  };
}

export type CommentsController = ReturnType<typeof useComments>;
