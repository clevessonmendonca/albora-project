"use client";

import {
  isHeic,
  isVideoBytes,
  planoParaRedimensionamento,
  processarFoto,
  type QueueDetails,
  type FiltroAplicado,
  type PlanoDoEvento,
  type DrainSummary,
  type TextoComposto,
} from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { drainAndReport } from "@/features/guest/lib/funnel-from-drain";
import { reportFunnel } from "@/features/guest/lib/report-funnel";
import { webDrawer } from "@/lib/drawer";
import { deviceDecodes, prepareVideo } from "@/lib/image";
import { QueueQuotaExceededError, webQueue, queueSummary } from "@/lib/queue";
import { webTransport } from "@/lib/transport";

/** Laço de upload num lugar só — toda foto passa pela fila, mesmo com sinal bom; sem caminho rápido que diverge quando o sinal cai. */

/** Cota vem do servidor — convidado nunca vê paywall, só aviso antes de gravar (spec 006/N5.3). */
export type CotaVideo = {
  limite: number | null;
  enviados: number;
};

export function mensagemCotaVideo(cota: CotaVideo): string | null {
  if (cota.limite === null) return null;
  if (cota.enviados >= cota.limite) {
    return "Você já usou seu vídeo nesta festa. Fotos continuam ilimitadas.";
  }
  if (cota.limite === 1) {
    return "Plano grátis: 1 vídeo por convidado. Fotos continuam ilimitadas.";
  }
  return `Plano grátis: até ${cota.limite} vídeos por convidado.`;
}

/** Ação ao voltar ao foco (visibilitychange/pageshow) — exportado para testes unitários. */
export type AcaoFoco = "drenar" | "atualizar" | "ignorar";

export function resolverAcaoFoco(visivel: boolean, online: boolean): AcaoFoco {
  if (!visivel) return "ignorar";
  return online ? "drenar" : "atualizar";
}

const AVISO_HEIC =
  "Este aparelho não abre fotos HEIC. No iPhone: Ajustes → Câmera → Formatos → “Mais compatível”.";

export type EstadoEnvio = {
  pendentes: number;
  bytesPendentes: number;
  processando: boolean;
  ultimoErro: string | null;
  online: boolean;
};

const INICIAL: EstadoEnvio = {
  pendentes: 0,
  bytesPendentes: 0,
  processando: false,
  ultimoErro: null,
  online: true,
};

export type PedidoEnvio = {
  arquivo: File;
  filtro?: FiltroAplicado | undefined;
  /** Texto do composer, queimado na foto final junto com o LUT. */
  texto?: TextoComposto | undefined;
  desafioId?: string | null | undefined;
  promptKey?: string | null | undefined;
  /** Marca a foto como story do composer (spec 020, sub-etapa a). */
  story?: boolean | undefined;
  /** A faixa votada anexada pelo sticker de música (spec 020, sub-etapa b). */
  musicTrackId?: string | null | undefined;
};

export function useUpload(
  eventoId: string,
  opcoes: { plano: PlanoDoEvento; cotaVideo: CotaVideo },
) {
  const [estado, setEstado] = useState<EstadoEnvio>(INICIAL);
  const [videosLocais, setVideosLocais] = useState(0);
  const planoRedimensionamento = planoParaRedimensionamento(opcoes.plano);
  const drainingRef = useRef(false);

  const atualizarResumo = useCallback(async () => {
    const { itens, bytes } = await queueSummary();
    setEstado((e) => ({ ...e, pendentes: itens, bytesPendentes: bytes }));
  }, []);

  const drenarAgora = useCallback(async (): Promise<DrainSummary | null> => {
    if (!navigator.onLine) return null;
    if (drainingRef.current) return null;

    drainingRef.current = true;
    try {
      const resumo = await drainAndReport(webQueue, webTransport, {
        online: () => navigator.onLine,
      });
      await atualizarResumo();

      const falha = resumo.resultados.find((r) => r.estado !== "enviado");
      setEstado((e) => ({ ...e, ultimoErro: falha && "motivo" in falha ? falha.motivo : null }));

      return resumo;
    } finally {
      drainingRef.current = false;
    }
  }, [atualizarResumo]);

  /** Processa e enfileira; devolve quando está na fila (não quando subiu); `id` é usado pela tela de detalhes para anotar. */
  const enfileirarFoto = useCallback(
    async ({ arquivo, filtro, texto, desafioId, promptKey, story, musicTrackId }: PedidoEnvio) => {
      setEstado((e) => ({ ...e, processando: true, ultimoErro: null }));

      const recusar = (mensagem: string) => {
        setEstado((e) => ({ ...e, ultimoErro: mensagem }));
        return { ok: false as const, erro: mensagem };
      };

      try {
        // Assinatura antes de tudo — `type` do arquivo vem vazio/mentiroso no iOS, e ler o arquivo inteiro pra descobrir que é vídeo de 300MB é o travamento que a recusa deveria evitar.
        const inicio = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());

        if (isVideoBytes(inicio)) {
          const limite = opcoes.cotaVideo.limite;
          const usados = opcoes.cotaVideo.enviados + videosLocais;
          if (limite !== null && usados >= limite) {
            return recusar(mensagemCotaVideo({ ...opcoes.cotaVideo, enviados: usados })!);
          }

          const mime =
            arquivo.type === "video/quicktime" || arquivo.name.endsWith(".mov")
              ? "video/quicktime"
              : "video/mp4";
          const corpo = new Uint8Array(await arquivo.arrayBuffer());
          const id = crypto.randomUUID();
          const blob = new Blob([corpo], { type: mime });
          const prep = await prepareVideo(blob);

          await webQueue.enqueue({
            id,
            eventoId,
            corpo: { tipo: "blob", blob },
            mime,
            ...(prep?.poster ? { thumb: { tipo: "blob", blob: prep.poster } } : {}),
            criadoEm: Date.now(),
            tentativas: 0,
            desafioId: desafioId ?? null,
            promptKey: promptKey ?? null,
            ...(story ? { story: true } : {}),
            ...metaDaCaptura(null, arquivo.lastModified, prep?.largura, prep?.altura),
          });

          reportFunnel("capture");

          setVideosLocais((n) => n + 1);
          await atualizarResumo();
          void drenarAgora();
          return { ok: true as const, id, tinhaGeolocalizacao: false };
        }

        const bytes = new Uint8Array(await arquivo.arrayBuffer());

        // HEIC que o aparelho decodifica sai JPEG do `processarFoto` sem etapa extra — o que não decodifica não tem conversão possível aqui, e subir o original contaminaria o acervo com o que o telão não exibe.
        const heic = isHeic(inicio);
        if (heic && !(await deviceDecodes(bytes, "image/heic"))) {
          return recusar(AVISO_HEIC);
        }

        // O mesmo MIME da sonda: decodificar com outro invalidaria a prova, e no iOS o `type` do arquivo vem vazio.
        const foto = await processarFoto(bytes, heic ? "image/heic" : arquivo.type, webDrawer, {
          plan: planoRedimensionamento,
          device: {
            memoryGb: (navigator as { deviceMemory?: number }).deviceMemory,
            cores: navigator.hardwareConcurrency,
          },
          ...(filtro ? { filtro } : {}),
          ...(texto ? { texto } : {}),
        });

        const id = crypto.randomUUID();

        await webQueue.enqueue({
          id,
          eventoId,
          corpo: { tipo: "blob", blob: foto.full },
          thumb: { tipo: "blob", blob: foto.thumb },
          mime: "image/jpeg",
          criadoEm: Date.now(),
          tentativas: 0,
          desafioId: desafioId ?? null,
          promptKey: promptKey ?? null,
          ...(story ? { story: true } : {}),
          ...(musicTrackId ? { musicTrackId } : {}),
          ...metaDaCaptura(foto.capturadaEm, arquivo.lastModified, foto.largura, foto.altura),
        });

        reportFunnel("capture");

        await atualizarResumo();
        void drenarAgora();

        return { ok: true as const, id, tinhaGeolocalizacao: foto.tinhaGeolocalizacao };
      } catch (e) {
        // Cota estourada não é erro genérico: a nuance N6.6 manda avisar e subir na hora em vez de enfileirar.
        const mensagem =
          e instanceof QueueQuotaExceededError
            ? "Sem espaço no aparelho para guardar a foto. Conecte-se ao WiFi para as pendentes subirem."
            : "Não consegui preparar essa foto. Tente de novo.";

        setEstado((e2) => ({ ...e2, ultimoErro: mensagem }));
        return { ok: false as const, erro: mensagem };
      } finally {
        setEstado((e) => ({ ...e, processando: false }));
      }
    },
    [eventoId, atualizarResumo, drenarAgora, opcoes, planoRedimensionamento, videosLocais],
  );

  /** Legenda/lugar escritos enquanto sobe — tenta a fila primeiro, depois o banco; falha silenciosa (foto já está salva). */
  const anotar = useCallback(async (id: string, detalhes: QueueDetails): Promise<void> => {
    try {
      if (await webQueue.annotate(id, detalhes)) return;

      await fetch("/api/uploads/detalhes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ uploadId: id, ...detalhes }),
      });
    } catch {
      // Silêncio de propósito: o convidado escreveu uma legenda opcional numa foto que já está salva.
    }
  }, []);

  useEffect(() => {
    setEstado((e) => ({ ...e, online: navigator.onLine }));
    void atualizarResumo();

    // Religou a rede: drena sem o convidado tocar em nada — é a promessa que a fila existe para cumprir.
    const voltou = () => {
      setEstado((e) => ({ ...e, online: true }));
      void drenarAgora();
    };
    const caiu = () => setEstado((e) => ({ ...e, online: false }));

    window.addEventListener("online", voltou);
    window.addEventListener("offline", caiu);

    // Tentativa periódica pro caso de `online` não disparar — acontece quando o WiFi conecta mas não tem saída, padrão de salão com portal cativo.
    const relogio = setInterval(() => void drenarAgora(), 30_000);

    // Convidado volta à aba/PWA após sair (bfcache, troca de app, notificação) — drena se online, atualiza contagens se não.
    const aoVoltar = () => {
      const acao = resolverAcaoFoco(document.visibilityState === "visible", navigator.onLine);
      if (acao === "drenar") void drenarAgora();
      else if (acao === "atualizar") void atualizarResumo();
    };
    const aoVisibilityChange = () => aoVoltar();
    // `pageshow` com `persisted` sinaliza restauração de bfcache; carga normal já está coberta pelo mount acima.
    const aoPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) aoVoltar();
    };

    document.addEventListener("visibilitychange", aoVisibilityChange);
    window.addEventListener("pageshow", aoPageShow);

    return () => {
      window.removeEventListener("online", voltou);
      window.removeEventListener("offline", caiu);
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVisibilityChange);
      window.removeEventListener("pageshow", aoPageShow);
    };
  }, [atualizarResumo, drenarAgora]);

  return { estado, enfileirarFoto, anotar, drenarAgora };
}

function metaDaCaptura(
  paredeExif: Date | null,
  lastModified: number,
  largura?: number,
  altura?: number,
): { capturadaEm?: number; capturadaEmParede?: boolean; largura?: number; altura?: number } {
  const dims =
    typeof largura === "number" && typeof altura === "number" ? { largura, altura } : {};

  if (paredeExif) {
    return { capturadaEm: paredeExif.getTime(), capturadaEmParede: true, ...dims };
  }

  if (Number.isFinite(lastModified) && lastModified > 0) {
    return { capturadaEm: lastModified, ...dims };
  }

  return dims;
}
