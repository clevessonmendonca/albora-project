"use client";

import {
  autorizarCompartilhamento,
  compor,
  isVideoMime,
  modeloRecomendado,
  VERSAO_DO_CONSENTIMENTO_EXTERNO,
  type ConsentimentoExterno,
} from "@albora/core";
import { PACKS } from "@albora/packs";
import { useCallback, useMemo, useRef, useState } from "react";
import { identityToFrame } from "@/lib/frame-identity";
import { paletteForFrame } from "@/lib/frame-palette";
import { drawFrame, loadImage } from "@/lib/frame-renderer";
import { mediaUrls } from "@/lib/media";
import { reportFunnel } from "@/features/guest/lib/report-funnel";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import { buscarContextoDeCompartilhamento } from "@/features/my-photos/hooks/use-share";
import { compartilharRecap } from "@/features/my-photos/lib/recap-share";
import { idsDoRecap } from "@/features/my-photos/lib/recap";
import { mapExternalConsent, needsExternalConsent } from "@/features/my-photos/lib/share-gate";

/**
 * O recap do convidado (spec de crescimento A2): um carrossel das melhores
 * fotos DELE, DESTE evento, já com a moldura da identidade — pronto para o
 * story em um toque.
 *
 * Reusa a mesma autorização, o mesmo consentimento externo e a mesma
 * composição do share de uma foto (`use-share.ts`), foto por foto: o recap
 * não é um caminho novo de moderação, é o mesmo caminho chamado N vezes.
 * Uma foto que falha (moderação, mídia indisponível, corte de moldura) sai
 * da lista sem derrubar as outras — a mesma disciplina de "um item ruim não
 * pode levar os outros nove" que já vale para a fila de upload.
 */

export type QuadroDoRecap = { id: string; url: string };

type EstadoRecap = {
  aberto: boolean;
  montando: boolean;
  compartilhando: boolean;
  quadros: QuadroDoRecap[];
  indiceAtivo: number;
  erro: string | null;
  pedindoConsentimento: boolean;
};

function estadoInicial(): EstadoRecap {
  return {
    aberto: false,
    montando: false,
    compartilhando: false,
    quadros: [],
    indiceAtivo: 0,
    erro: null,
    pedindoConsentimento: false,
  };
}

export function useRecap({
  eventoId,
  sessaoId,
  slug,
  itens,
}: {
  eventoId: string;
  sessaoId: string;
  slug: string;
  itens: readonly ItemVisivel[];
}) {
  const [estado, setEstado] = useState<EstadoRecap>(estadoInicial);
  const blobsRef = useRef<Blob[]>([]);

  const idsSelecionados = useMemo(() => idsDoRecap(itens, eventoId), [itens, eventoId]);
  const disponivel = idsSelecionados.length > 0;

  const revogarUrls = useCallback(() => {
    for (const quadro of estado.quadros) URL.revokeObjectURL(quadro.url);
  }, [estado.quadros]);

  const montar = useCallback(
    async (ids: readonly string[], consentimentoExterno: ConsentimentoExterno | null) => {
      setEstado((e) => ({ ...e, montando: true, erro: null, pedindoConsentimento: false }));

      const agora = new Date();
      const quadros: QuadroDoRecap[] = [];
      const blobs: Blob[] = [];

      for (const id of ids) {
        try {
          const ctx = await buscarContextoDeCompartilhamento(id);

          const sessao = {
            sessaoId,
            eventoId,
            nome: ctx.sessao.nome,
            consentimentoDeEntrada: { versao: "v1", em: agora },
            consentimentoExterno:
              consentimentoExterno ?? mapExternalConsent(ctx.sessao.consentimentoExterno),
          };

          const evento = {
            panico: ctx.evento.panico,
            modoEndurecido: ctx.evento.modoEndurecido,
            compartilhamentoExternoLiberado: ctx.evento.compartilhamentoExternoLiberado,
          };

          const chaveImagem = isVideoMime(ctx.mime) ? ctx.chaveThumb : ctx.chaveFull;
          const urls = await mediaUrls([chaveImagem]);
          const url = urls.get(chaveImagem)?.url;
          if (!url) continue;

          const img = await loadImage(url);
          const midia = {
            id,
            eventoId,
            sessaoDeOrigem: sessaoId,
            largura: img.naturalWidth,
            altura: img.naturalHeight,
            legenda: ctx.legenda,
            estado: {
              removida: ctx.midia.removida,
              liberadaPeloAnfitriao: ctx.midia.liberadaPeloAnfitriao,
              denuncias: ctx.midia.denuncias,
              classificador: ctx.midia.classificador,
            },
          };

          const autorizacao = autorizarCompartilhamento(midia, sessao, evento, agora);
          if (!autorizacao.pode) continue;

          const pack = PACKS[ctx.evento.packId];
          const identidade = identityToFrame(
            ctx.evento.slug,
            new Date(ctx.evento.comecaEm),
            ctx.evento.identityTokens,
            pack,
          );
          const paleta = paletteForFrame(ctx.evento.identityTokens, pack);

          const resultado = compor({
            midia,
            sessao,
            evento,
            identidade,
            modelo: modeloRecomendado(midia),
            agora,
          });
          if (!resultado.autorizada || !resultado.composicao) continue;

          const blob = await drawFrame(img, resultado.composicao, paleta);
          blobs.push(blob);
          quadros.push({ id, url: URL.createObjectURL(blob) });
        } catch {
          continue;
        }
      }

      if (quadros.length === 0) {
        setEstado((e) => ({
          ...e,
          montando: false,
          erro: "Não deu para montar o recap agora. Tenta de novo em pouco.",
        }));
        return;
      }

      blobsRef.current = blobs;
      setEstado({
        aberto: true,
        montando: false,
        compartilhando: false,
        quadros,
        indiceAtivo: 0,
        erro: null,
        pedindoConsentimento: false,
      });
    },
    [eventoId, sessaoId],
  );

  const abrir = useCallback(async () => {
    if (idsSelecionados.length === 0) return;
    setEstado((e) => ({ ...e, erro: null }));

    try {
      const ctx = await buscarContextoDeCompartilhamento(idsSelecionados[0]!);

      if (needsExternalConsent(mapExternalConsent(ctx.sessao.consentimentoExterno))) {
        setEstado((e) => ({ ...e, pedindoConsentimento: true }));
        return;
      }

      await montar(idsSelecionados, mapExternalConsent(ctx.sessao.consentimentoExterno));
    } catch {
      setEstado((e) => ({ ...e, erro: "Não deu para montar o recap agora." }));
    }
  }, [idsSelecionados, montar]);

  const confirmarConsentimento = useCallback(
    async (nomeNaMoldura: boolean) => {
      setEstado((e) => ({ ...e, erro: null }));
      try {
        const r = await fetch("/api/share", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ nomeNaMoldura }),
        });
        if (!r.ok) throw new Error("consentimento");

        const consentimento: ConsentimentoExterno = {
          versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
          em: new Date(),
          revogadoEm: null,
          nomeNaMoldura,
        };

        await montar(idsSelecionados, consentimento);
      } catch {
        setEstado((e) => ({
          ...e,
          pedindoConsentimento: false,
          erro: "Não registrou o consentimento. Tente de novo.",
        }));
      }
    },
    [idsSelecionados, montar],
  );

  const cancelarConsentimento = useCallback(() => {
    setEstado((e) => ({ ...e, pedindoConsentimento: false }));
  }, []);

  const irPara = useCallback((indice: number) => {
    setEstado((e) => {
      if (indice < 0 || indice >= e.quadros.length) return e;
      return { ...e, indiceAtivo: indice };
    });
  }, []);

  const fechar = useCallback(() => {
    revogarUrls();
    blobsRef.current = [];
    setEstado(estadoInicial());
  }, [revogarUrls]);

  const compartilhar = useCallback(async () => {
    if (blobsRef.current.length === 0) return;
    setEstado((e) => ({ ...e, compartilhando: true, erro: null }));
    try {
      const resultado = await compartilharRecap(blobsRef.current, `albora-${slug}-recap`);
      if (resultado !== "cancelled") reportFunnel("share");
    } catch {
      setEstado((e) => ({ ...e, erro: "Não deu para compartilhar o recap agora." }));
    } finally {
      setEstado((e) => ({ ...e, compartilhando: false }));
    }
  }, [slug]);

  return {
    disponivel,
    quantidade: idsSelecionados.length,
    aberto: estado.aberto,
    montando: estado.montando,
    compartilhando: estado.compartilhando,
    quadros: estado.quadros,
    indiceAtivo: estado.indiceAtivo,
    erro: estado.erro,
    pedindoConsentimento: estado.pedindoConsentimento,
    abrir,
    confirmarConsentimento,
    cancelarConsentimento,
    irPara,
    fechar,
    compartilhar,
  };
}
