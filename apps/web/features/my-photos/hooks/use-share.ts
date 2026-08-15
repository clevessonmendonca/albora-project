"use client";

import {
  autorizarColagem,
  autorizarCompartilhamento,
  compor,
  conteudoDaMoldura,
  isVideoMime,
  MAX_DA_COLAGEM,
  modeloRecomendado,
  VERSAO_DO_CONSENTIMENTO_EXTERNO,
  type ConsentimentoExterno,
  type VeredictoDoClassificador,
} from "@albora/core";
import { PACKS } from "@albora/packs";
import { useCallback, useState } from "react";
import { identityToFrame } from "@/lib/frame-identity";
import { paletteForFrame } from "@/lib/frame-palette";
import { mediaUrls } from "@/lib/media";
import { shareOrDownload } from "@/lib/share-or-download";
import { reportFunnel } from "@/features/guest/lib/report-funnel";
import { loadImage, drawCollage, drawFrame } from "@/lib/frame-renderer";
import {
  mapExternalConsent,
  shareMessage,
  needsExternalConsent,
  type ConsentimentoExternoBruto,
} from "@/features/my-photos/lib/share-gate";

type ContextoApi = {
  chaveFull: string;
  chaveThumb: string;
  mime: string;
  legenda: string | null;
  sessao: {
    nome: string;
    consentimentoExterno: ConsentimentoExternoBruto | null;
  };
  evento: {
    slug: string;
    packId: string;
    comecaEm: string;
    identityTokens: Record<string, unknown>;
    panico: boolean;
    modoEndurecido: boolean;
    compartilhamentoExternoLiberado: boolean;
  };
  midia: {
    removida: boolean;
    liberadaPeloAnfitriao: boolean;
    denuncias: number;
    classificador: VeredictoDoClassificador;
  };
};

export function useShare(eventoId: string, sessaoId: string) {
  const [compartilhandoId, setCompartilhandoId] = useState<string | null>(null);
  const [colagemIds, setColagemIds] = useState<string[] | null>(null);
  const [pedindoConsentimento, setPedindoConsentimento] = useState<string | null>(null);
  const [pedindoColagem, setPedindoColagem] = useState<string[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscarContexto = async (uploadId: string): Promise<ContextoApi> => {
    const r = await fetch(`/api/share?uploadId=${uploadId}`, {
      credentials: "same-origin",
    });
    if (!r.ok) throw new Error("contexto");
    return (await r.json()) as ContextoApi;
  };

  const executar = useCallback(
    async (uploadId: string, consentimentoExterno: ConsentimentoExterno | null) => {
      setCompartilhandoId(uploadId);
      setErro(null);

      try {
        const ctx = await buscarContexto(uploadId);
        const agora = new Date();

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
        if (!url) throw new Error("url");

        const img = await loadImage(url);
        const midia = {
          id: uploadId,
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
        if (!autorizacao.pode) {
          setErro(shareMessage(autorizacao.codigo));
          return;
        }

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

        if (!resultado.autorizada || !resultado.composicao) {
          setErro(shareMessage(resultado.codigo));
          return;
        }

        const blob = await drawFrame(img, resultado.composicao, paleta);
        const saida = await shareOrDownload(blob, `albora-${ctx.evento.slug}.jpg`);
        if (saida !== "cancelado") reportFunnel("share");
      } catch {
        setErro("Não deu para compartilhar agora. Tente de novo.");
      } finally {
        setCompartilhandoId(null);
        setPedindoConsentimento(null);
      }
    },
    [eventoId, sessaoId],
  );

  const executarColagem = useCallback(
    async (uploadIds: string[], consentimentoExterno: ConsentimentoExterno | null) => {
      setColagemIds(uploadIds);
      setErro(null);

      try {
        const contextos = await Promise.all(uploadIds.map((id) => buscarContexto(id)));
        const agora = new Date();
        const base = contextos[0]!;

        const sessao = {
          sessaoId,
          eventoId,
          nome: base.sessao.nome,
          consentimentoDeEntrada: { versao: "v1", em: agora },
          consentimentoExterno:
            consentimentoExterno ?? mapExternalConsent(base.sessao.consentimentoExterno),
        };

        const evento = {
          panico: base.evento.panico,
          modoEndurecido: base.evento.modoEndurecido,
          compartilhamentoExternoLiberado: base.evento.compartilhamentoExternoLiberado,
        };

        const midias = contextos.map((ctx, i) => ({
          id: uploadIds[i]!,
          eventoId,
          sessaoDeOrigem: sessaoId,
          largura: 0,
          altura: 0,
          legenda: ctx.legenda,
          estado: {
            removida: ctx.midia.removida,
            liberadaPeloAnfitriao: ctx.midia.liberadaPeloAnfitriao,
            denuncias: ctx.midia.denuncias,
            classificador: ctx.midia.classificador,
          },
        }));

        const autorizacao = autorizarColagem(midias, sessao, evento, agora);
        if (!autorizacao.pode) {
          setErro(shareMessage(autorizacao.codigo));
          return;
        }

        const chaves = contextos.map((c) =>
          isVideoMime(c.mime) ? c.chaveThumb : c.chaveFull,
        );
        const urls = await mediaUrls(chaves);
        const fotos = await Promise.all(
          contextos.map(async (ctx, i) => {
            const chave = chaves[i]!;
            const url = urls.get(chave)?.url;
            if (!url) throw new Error("url");
            const img = await loadImage(url);
            midias[i]!.largura = img.naturalWidth;
            midias[i]!.altura = img.naturalHeight;
            return { img, largura: img.naturalWidth, altura: img.naturalHeight };
          }),
        );

        const pack = PACKS[base.evento.packId];
        const identidade = identityToFrame(
          base.evento.slug,
          new Date(base.evento.comecaEm),
          base.evento.identityTokens,
          pack,
        );
        const paleta = paletteForFrame(base.evento.identityTokens, pack);

        const conteudo = conteudoDaMoldura(
          identidade,
          { ...midias[0]!, legenda: null },
          sessao,
          agora,
        );

        const blob = await drawCollage(fotos, conteudo, paleta);
        const saida = await shareOrDownload(blob, `albora-${base.evento.slug}-colagem.jpg`);
        if (saida !== "cancelado") reportFunnel("share");
      } catch {
        setErro("Não deu para compartilhar a colagem agora.");
      } finally {
        setColagemIds(null);
        setPedindoColagem(null);
      }
    },
    [eventoId, sessaoId],
  );

  const compartilhar = useCallback(
    async (uploadId: string) => {
      setErro(null);
      try {
        const ctx = await buscarContexto(uploadId);
        if (needsExternalConsent(mapExternalConsent(ctx.sessao.consentimentoExterno))) {
          setPedindoConsentimento(uploadId);
          return;
        }

        await executar(uploadId, mapExternalConsent(ctx.sessao.consentimentoExterno));
      } catch {
        setErro("Não deu para compartilhar agora.");
      }
    },
    [executar],
  );

  const compartilharColagem = useCallback(
    async (uploadIds: string[]) => {
      if (uploadIds.length < 2 || uploadIds.length > MAX_DA_COLAGEM) return;
      setErro(null);
      try {
        const ctx = await buscarContexto(uploadIds[0]!);
        if (needsExternalConsent(mapExternalConsent(ctx.sessao.consentimentoExterno))) {
          setPedindoColagem(uploadIds);
          return;
        }
        await executarColagem(uploadIds, mapExternalConsent(ctx.sessao.consentimentoExterno));
      } catch {
        setErro("Não deu para compartilhar a colagem.");
      }
    },
    [executarColagem],
  );

  const confirmarConsentimento = useCallback(
    async (uploadId: string, nomeNaMoldura: boolean) => {
      setErro(null);
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

        await executar(uploadId, consentimento);
      } catch {
        setErro("Não registrou o consentimento. Tente de novo.");
        setPedindoConsentimento(null);
      }
    },
    [executar],
  );

  const confirmarConsentimentoColagem = useCallback(
    async (uploadIds: string[], nomeNaMoldura: boolean) => {
      setErro(null);
      try {
        const r = await fetch("/api/share", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ nomeNaMoldura }),
        });
        if (!r.ok) throw new Error("consentimento");

        await executarColagem(uploadIds, {
          versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
          em: new Date(),
          revogadoEm: null,
          nomeNaMoldura,
        });
      } catch {
        setErro("Não registrou o consentimento. Tente de novo.");
        setPedindoColagem(null);
      }
    },
    [executarColagem],
  );

  return {
    compartilhar,
    compartilharColagem,
    confirmarConsentimento,
    confirmarConsentimentoColagem,
    compartilhandoId,
    colagemIds,
    pedindoConsentimento,
    pedindoColagem,
    cancelarConsentimento: () => {
      setPedindoConsentimento(null);
      setPedindoColagem(null);
    },
    erro,
    limparErro: () => setErro(null),
  };
}
