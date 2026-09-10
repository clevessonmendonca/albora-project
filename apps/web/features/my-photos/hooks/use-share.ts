"use client";

import {
  autorizarColagem,
  autorizarCompartilhamento,
  compor,
  conteudoDaMoldura,
  isVideoMime,
  MAX_DA_COLAGEM,
  modelosDeMolduraPermitidos,
  modeloRecomendado,
  VERSAO_DO_CONSENTIMENTO_EXTERNO,
  type ConsentimentoExterno,
  type ModeloDeMoldura,
  type VeredictoDoClassificador,
} from "@albora/core";
import { PACKS } from "@albora/packs";
import { useCallback, useRef, useState } from "react";
import { identityToFrame } from "@/lib/frame-identity";
import { paletteForFrame, type FramePalette } from "@/lib/frame-palette";
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

/** Exportado para `use-recap.ts` reusar a mesma resposta de `/api/share` — duplicar divergiria no primeiro ajuste feito de um lado só. */
export type ContextoApi = {
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

export async function buscarContextoDeCompartilhamento(uploadId: string): Promise<ContextoApi> {
  const r = await fetch(`/api/share?uploadId=${uploadId}`, {
    credentials: "same-origin",
  });
  if (!r.ok) throw new Error("contexto");
  return (await r.json()) as ContextoApi;
}

/** Insumos já carregados para compor a moldura — cacheados enquanto o convidado escolhe o modelo, para a prévia não refazer fetch/decode a cada troca. */
type ComposicaoPreparada = {
  uploadId: string;
  slug: string;
  agora: Date;
  img: HTMLImageElement;
  midia: Parameters<typeof autorizarCompartilhamento>[0];
  sessao: Parameters<typeof autorizarCompartilhamento>[1];
  evento: Parameters<typeof autorizarCompartilhamento>[2];
  identidade: Parameters<typeof compor>[0]["identidade"];
  paleta: FramePalette;
};

export type EscolhaDeMoldura = {
  uploadId: string;
  modelos: ModeloDeMoldura[];
  recomendado: ModeloDeMoldura;
};

export function useShare(eventoId: string, sessaoId: string) {
  const [compartilhandoId, setCompartilhandoId] = useState<string | null>(null);
  const [colagemIds, setColagemIds] = useState<string[] | null>(null);
  const [pedindoConsentimento, setPedindoConsentimento] = useState<string | null>(null);
  const [pedindoColagem, setPedindoColagem] = useState<string[] | null>(null);
  const [escolhendoMoldura, setEscolhendoMoldura] = useState<EscolhaDeMoldura | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const preparadoRef = useRef<ComposicaoPreparada | null>(null);

  /** Busca, autoriza e carrega tudo que a composição precisa. `null` = já reportou o erro. */
  const prepararComposicao = useCallback(
    async (
      uploadId: string,
      consentimentoExterno: ConsentimentoExterno | null,
    ): Promise<ComposicaoPreparada | null> => {
      const ctx = await buscarContextoDeCompartilhamento(uploadId);
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
        return null;
      }

      const pack = PACKS[ctx.evento.packId];
      const identidade = identityToFrame(
        ctx.evento.slug,
        new Date(ctx.evento.comecaEm),
        ctx.evento.identityTokens,
        pack,
      );
      const paleta = paletteForFrame(ctx.evento.identityTokens, pack);

      return { uploadId, slug: ctx.evento.slug, agora, img, midia, sessao, evento, identidade, paleta };
    },
    [eventoId, sessaoId],
  );

  /** Compõe e desenha a moldura escolhida. A prévia e o arquivo compartilhado saem daqui — o mesmo blob, nunca dois. */
  const renderizarMoldura = useCallback(
    async (prep: ComposicaoPreparada, modelo: ModeloDeMoldura): Promise<Blob> => {
      const resultado = compor({
        midia: prep.midia,
        sessao: prep.sessao,
        evento: prep.evento,
        identidade: prep.identidade,
        modelo,
        formato: "story",
        agora: prep.agora,
      });
      if (!resultado.autorizada || !resultado.composicao) {
        throw new Error(resultado.codigo);
      }
      return drawFrame(prep.img, resultado.composicao, prep.paleta);
    },
    [],
  );

  const abrirEscolha = useCallback(
    async (uploadId: string, consentimentoExterno: ConsentimentoExterno | null) => {
      const prep = await prepararComposicao(uploadId, consentimentoExterno);
      setPedindoConsentimento(null);
      if (!prep) return;
      preparadoRef.current = prep;
      setEscolhendoMoldura({
        uploadId,
        modelos: modelosDeMolduraPermitidos(prep.midia),
        recomendado: modeloRecomendado(prep.midia),
      });
    },
    [prepararComposicao],
  );

  /** Renderiza a prévia da moldura selecionada a partir dos insumos já preparados. */
  const previewMoldura = useCallback(
    async (modelo: ModeloDeMoldura): Promise<Blob> => {
      const prep = preparadoRef.current;
      if (!prep) throw new Error("sem preparo");
      return renderizarMoldura(prep, modelo);
    },
    [renderizarMoldura],
  );

  /** Compartilha o blob já renderizado na prévia (mesma imagem que o convidado viu). */
  const confirmarMoldura = useCallback(async (blob: Blob) => {
    const prep = preparadoRef.current;
    const saida = await shareOrDownload(blob, `albora-${prep?.slug ?? "festa"}.jpg`);
    if (saida !== "cancelled") reportFunnel("share");
    setEscolhendoMoldura(null);
    preparadoRef.current = null;
  }, []);

  const fecharMoldura = useCallback(() => {
    setEscolhendoMoldura(null);
    preparadoRef.current = null;
  }, []);

  const executarColagem = useCallback(
    async (uploadIds: string[], consentimentoExterno: ConsentimentoExterno | null) => {
      setColagemIds(uploadIds);
      setErro(null);

      try {
        const contextos = await Promise.all(uploadIds.map((id) => buscarContextoDeCompartilhamento(id)));
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
        if (saida !== "cancelled") reportFunnel("share");
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
      setCompartilhandoId(uploadId);
      try {
        const ctx = await buscarContextoDeCompartilhamento(uploadId);
        const consent = mapExternalConsent(ctx.sessao.consentimentoExterno);
        if (needsExternalConsent(consent)) {
          setPedindoConsentimento(uploadId);
          return;
        }
        await abrirEscolha(uploadId, consent);
      } catch {
        setErro("Não deu para compartilhar agora.");
      } finally {
        setCompartilhandoId(null);
      }
    },
    [abrirEscolha],
  );

  const compartilharColagem = useCallback(
    async (uploadIds: string[]) => {
      if (uploadIds.length < 2 || uploadIds.length > MAX_DA_COLAGEM) return;
      setErro(null);
      try {
        const ctx = await buscarContextoDeCompartilhamento(uploadIds[0]!);
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
      setCompartilhandoId(uploadId);
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

        await abrirEscolha(uploadId, consentimento);
      } catch {
        setErro("Não registrou o consentimento. Tente de novo.");
        setPedindoConsentimento(null);
      } finally {
        setCompartilhandoId(null);
      }
    },
    [abrirEscolha],
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
    escolhendoMoldura,
    previewMoldura,
    confirmarMoldura,
    fecharMoldura,
    cancelarConsentimento: () => {
      setPedindoConsentimento(null);
      setPedindoColagem(null);
    },
    erro,
    limparErro: () => setErro(null),
  };
}
