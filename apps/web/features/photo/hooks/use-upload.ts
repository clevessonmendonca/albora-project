"use client";

import {
  drenar,
  isHeic,
  isVideoBytes,
  planoParaRedimensionamento,
  processarFoto,
  type DetalhesItem,
  type FiltroAplicado,
  type PlanoDoEvento,
  type ResumoDrenagem,
} from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { webDrawer } from "@/lib/drawer";
import { deviceDecodes, videoPoster } from "@/lib/image";
import { QueueQuotaExceededError, webQueue, queueSummary } from "@/lib/queue";
import { webTransport } from "@/lib/transport";

/**
 * O laço de upload do convidado, num lugar só.
 *
 * Ele nunca sobe direto: **toda foto passa pela fila**, mesmo com sinal bom.
 * Um caminho rápido que pula a fila é um caminho que se comporta diferente
 * quando o sinal cai — e o sinal cai. Uma fonte da verdade, um caminho.
 */

/**
 * Plano e cota vêm do servidor — o convidado nunca vê paywall, só aviso antes
 * de gravar (spec 006, N5.3).
 */
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
  desafioId?: string | null | undefined;
};

export function useUpload(
  eventoId: string,
  opcoes: { plano: PlanoDoEvento; cotaVideo: CotaVideo },
) {
  const [estado, setEstado] = useState<EstadoEnvio>(INICIAL);
  const [videosLocais, setVideosLocais] = useState(0);
  const planoRedimensionamento = planoParaRedimensionamento(opcoes.plano);

  const atualizarResumo = useCallback(async () => {
    const { itens, bytes } = await queueSummary();
    setEstado((e) => ({ ...e, pendentes: itens, bytesPendentes: bytes }));
  }, []);

  const drenarAgora = useCallback(async (): Promise<ResumoDrenagem | null> => {
    if (!navigator.onLine) return null;

    const resumo = await drenar(webQueue, webTransport, { online: () => navigator.onLine });
    await atualizarResumo();

    const falha = resumo.resultados.find((r) => r.estado !== "enviado");
    setEstado((e) => ({ ...e, ultimoErro: falha && "motivo" in falha ? falha.motivo : null }));

    return resumo;
  }, [atualizarResumo]);

  /**
   * Processa e enfileira. Devolve quando o item está **na fila**, não quando
   * subiu: o convidado precisa poder tirar a próxima foto imediatamente, e a
   * subida acontece atrás dele.
   *
   * O `id` devolvido é o que a tela de detalhes usa para anotar depois.
   */
  const enfileirarFoto = useCallback(
    async ({ arquivo, filtro, desafioId }: PedidoEnvio) => {
      setEstado((e) => ({ ...e, processando: true, ultimoErro: null }));

      const recusar = (mensagem: string) => {
        setEstado((e) => ({ ...e, ultimoErro: mensagem }));
        return { ok: false as const, erro: mensagem };
      };

      try {
        // Assinatura antes de tudo: o `type` do arquivo vem vazio ou mentiroso
        // no iOS, e ler o arquivo inteiro para descobrir que é um vídeo de 300
        // MB é o próprio travamento que a recusa deveria evitar.
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
          const poster = await videoPoster(blob);

          await webQueue.enfileirar({
            id,
            eventoId,
            corpo: { tipo: "blob", blob },
            mime,
            ...(poster ? { thumb: { tipo: "blob", blob: poster } } : {}),
            criadoEm: Date.now(),
            tentativas: 0,
            desafioId: desafioId ?? null,
          });

          setVideosLocais((n) => n + 1);
          await atualizarResumo();
          void drenarAgora();
          return { ok: true as const, id, tinhaGeolocalizacao: false };
        }

        const bytes = new Uint8Array(await arquivo.arrayBuffer());

        // HEIC que o aparelho decodifica sai JPEG do `processarFoto` sem etapa
        // extra. O que ele não decodifica não tem conversão possível aqui — e
        // subir o original contaminaria o acervo com o que o telão não exibe.
        const heic = isHeic(inicio);
        if (heic && !(await deviceDecodes(bytes, "image/heic"))) {
          return recusar(AVISO_HEIC);
        }

        // O mesmo MIME da sonda: provar a decodificação com um tipo e decodificar
        // com outro invalidaria a prova, e no iOS o `type` do arquivo vem vazio.
        const foto = await processarFoto(bytes, heic ? "image/heic" : arquivo.type, webDrawer, {
          plan: planoRedimensionamento,
          device: {
            memoryGb: (navigator as { deviceMemory?: number }).deviceMemory,
            cores: navigator.hardwareConcurrency,
          },
          ...(filtro ? { filtro } : {}),
        });

        const id = crypto.randomUUID();

        await webQueue.enfileirar({
          id,
          eventoId,
          corpo: { tipo: "blob", blob: foto.full },
          thumb: { tipo: "blob", blob: foto.thumb },
          mime: "image/jpeg",
          criadoEm: Date.now(),
          tentativas: 0,
          desafioId: desafioId ?? null,
        });

        await atualizarResumo();
        void drenarAgora();

        return { ok: true as const, id, tinhaGeolocalizacao: foto.tinhaGeolocalizacao };
      } catch (e) {
        // Cota estourada não é erro genérico: a nuance N6.6 manda avisar e
        // subir na hora em vez de enfileirar.
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

  /**
   * Legenda e lugar, escritos enquanto a foto sobe.
   *
   * Duas portas para o mesmo dado, porque o item pode estar dos dois lados da
   * linha: ainda na fila, e aí quem guarda é a fila; ou já confirmado, e aí
   * quem guarda é o banco. Nunca falha de forma visível — a foto já está no
   * álbum, e é ela que importa.
   */
  const anotar = useCallback(async (id: string, detalhes: DetalhesItem): Promise<void> => {
    try {
      if (await webQueue.anotar(id, detalhes)) return;

      await fetch("/api/uploads/detalhes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ uploadId: id, ...detalhes }),
      });
    } catch {
      // Silêncio de propósito: o convidado escreveu uma legenda opcional numa
      // foto que já está salva. Um erro aqui só o assustaria à toa.
    }
  }, []);

  useEffect(() => {
    setEstado((e) => ({ ...e, online: navigator.onLine }));
    void atualizarResumo();

    // Religou a rede: drena sem o convidado tocar em nada. É a promessa que
    // a fila existe para cumprir.
    const voltou = () => {
      setEstado((e) => ({ ...e, online: true }));
      void drenarAgora();
    };
    const caiu = () => setEstado((e) => ({ ...e, online: false }));

    window.addEventListener("online", voltou);
    window.addEventListener("offline", caiu);

    // Tentativa periódica para o caso de o evento `online` não disparar —
    // acontece quando o WiFi conecta mas não tem saída, que é o padrão de
    // salão de festas com portal cativo.
    const relogio = setInterval(() => void drenarAgora(), 30_000);

    return () => {
      window.removeEventListener("online", voltou);
      window.removeEventListener("offline", caiu);
      clearInterval(relogio);
    };
  }, [atualizarResumo, drenarAgora]);

  return { estado, enfileirarFoto, anotar, drenarAgora };
}
