"use client";

import { drenar, processarFoto, type ResumoDrenagem } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { desenhistaWeb } from "./desenhista";
import { ErroCotaEsgotada, filaWeb, resumoDaFila } from "./fila";
import { transporteWeb } from "./transporte";

/**
 * O laço de upload do convidado, num lugar só.
 *
 * Ele nunca sobe direto: **toda foto passa pela fila**, mesmo com sinal bom.
 * Um caminho rápido que pula a fila é um caminho que se comporta diferente
 * quando o sinal cai — e o sinal cai. Uma fonte da verdade, um caminho.
 */

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

export function usarEnvio(eventoId: string) {
  const [estado, setEstado] = useState<EstadoEnvio>(INICIAL);

  const atualizarResumo = useCallback(async () => {
    const { itens, bytes } = await resumoDaFila();
    setEstado((e) => ({ ...e, pendentes: itens, bytesPendentes: bytes }));
  }, []);

  const drenarAgora = useCallback(async (): Promise<ResumoDrenagem | null> => {
    if (!navigator.onLine) return null;

    const resumo = await drenar(filaWeb, transporteWeb, { online: () => navigator.onLine });
    await atualizarResumo();

    const falha = resumo.resultados.find((r) => r.estado !== "enviado");
    setEstado((e) => ({ ...e, ultimoErro: falha && "motivo" in falha ? falha.motivo : null }));

    return resumo;
  }, [atualizarResumo]);

  /**
   * Processa e enfileira. Devolve quando o item está **na fila**, não quando
   * subiu: o convidado precisa poder tirar a próxima foto imediatamente, e a
   * subida acontece atrás dele.
   */
  const enfileirarFoto = useCallback(
    async (arquivo: File) => {
      setEstado((e) => ({ ...e, processando: true, ultimoErro: null }));

      try {
        const bytes = new Uint8Array(await arquivo.arrayBuffer());

        const foto = await processarFoto(bytes, arquivo.type, desenhistaWeb, {
          plano: "gratis",
          aparelho: {
            memoriaGb: (navigator as { deviceMemory?: number }).deviceMemory,
            nucleos: navigator.hardwareConcurrency,
          },
        });

        await filaWeb.enfileirar({
          id: crypto.randomUUID(),
          eventoId,
          corpo: { tipo: "blob", blob: foto.full },
          mime: "image/jpeg",
          criadoEm: Date.now(),
          tentativas: 0,
        });

        await atualizarResumo();
        void drenarAgora();

        return { ok: true as const, tinhaGeolocalizacao: foto.tinhaGeolocalizacao };
      } catch (e) {
        // Cota estourada não é erro genérico: a nuance N6.6 manda avisar e
        // subir na hora em vez de enfileirar.
        const mensagem =
          e instanceof ErroCotaEsgotada
            ? "Sem espaço no aparelho para guardar a foto. Conecte-se ao WiFi para as pendentes subirem."
            : "Não consegui preparar essa foto. Tente de novo.";

        setEstado((e2) => ({ ...e2, ultimoErro: mensagem }));
        return { ok: false as const, erro: mensagem };
      } finally {
        setEstado((e) => ({ ...e, processando: false }));
      }
    },
    [eventoId, atualizarResumo, drenarAgora],
  );

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

  return { estado, enfileirarFoto, drenarAgora };
}
