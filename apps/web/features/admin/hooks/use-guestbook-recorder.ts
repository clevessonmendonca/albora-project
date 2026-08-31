"use client";

import { MAX_AUDIO_SECONDS } from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  audioDoArquivo,
  audioDoBlob,
  mimeDoGravador,
  podeGravar,
  soltarPreview,
  type PendingGuestbookAudio,
} from "@/features/admin/lib/guestbook-audio";

export function useGuestbookRecorder() {
  const [pending, setPending] = useState<PendingGuestbookAudio | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const aliveRef = useRef(true);
  const pendingRef = useRef<PendingGuestbookAudio | null>(null);

  const limparTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const soltarStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const substituir = useCallback((proximo: PendingGuestbookAudio | null) => {
    setPending((atual) => {
      soltarPreview(atual);
      pendingRef.current = proximo;
      return proximo;
    });
  }, []);

  const parar = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
  }, []);

  const gravar = useCallback(async () => {
    setErro(null);
    if (!podeGravar()) {
      setErro("Este navegador não grava áudio. Anexe um arquivo curto.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = mimeDoGravador();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setElapsed(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        limparTimer();
        soltarStream();
        if (!aliveRef.current) return;
        setRecording(false);
        const segundos = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime });
        const proximo = audioDoBlob(blob, recorder.mimeType || mime, segundos);
        if (!proximo) {
          setErro("A gravação ficou fora do limite de 60 segundos.");
          return;
        }
        substituir(proximo);
      };

      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(s);
        if (s >= MAX_AUDIO_SECONDS) parar();
      }, 200);
    } catch {
      soltarStream();
      setErro("Não deu para usar o microfone.");
    }
  }, [parar, substituir]);

  const anexar = useCallback(
    async (file: File) => {
      setErro(null);
      const duracao = await lerDuracao(file);
      if (duracao === null) {
        setErro("Não deu para ler esse arquivo.");
        return;
      }
      const proximo = audioDoArquivo(file, duracao);
      if (!proximo) {
        setErro("Use um áudio de até 60 segundos, em formato comum.");
        return;
      }
      substituir(proximo);
    },
    [substituir],
  );

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      limparTimer();
      soltarStream();
      if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
      soltarPreview(pendingRef.current);
      pendingRef.current = null;
    };
  }, []);

  return {
    pending,
    recording,
    elapsed,
    erro,
    gravar,
    parar,
    anexar,
    descartar: () => {
      substituir(null);
      setErro(null);
    },
  };
}

function lerDuracao(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}
