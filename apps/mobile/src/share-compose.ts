import {
  compor,
  isVideoMime,
  modeloRecomendado,
  type Composicao,
  type ConsentimentoExterno,
  type VeredictoDoClassificador,
} from "@albora/core";
import { PACKS } from "@albora/packs";
import type { GuestSession } from "./session";
import { identityToFrame } from "./share-frame-identity";
import { paletteForFrame, type FramePalette } from "./share-frame-palette";
import { shareMessage } from "./share-messages";

export type ConsentimentoExternoBruto = {
  versao: string;
  em: string;
  revogadoEm: string | null;
  nomeNaMoldura: boolean;
};

/** Contexto completo de `GET /api/share` — espelha a web. */
export type ShareContext = {
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

export function mapExternalConsent(
  bruto: ConsentimentoExternoBruto | null,
): ConsentimentoExterno | null {
  if (!bruto) return null;
  return {
    versao: bruto.versao,
    em: new Date(bruto.em),
    revogadoEm: bruto.revogadoEm ? new Date(bruto.revogadoEm) : null,
    nomeNaMoldura: bruto.nomeNaMoldura,
  };
}

export function chaveParaMoldura(ctx: ShareContext): string {
  return isVideoMime(ctx.mime) ? ctx.chaveThumb : ctx.chaveFull;
}

export function parseShareContext(body: unknown): ShareContext | null {
  if (typeof body !== "object" || body === null) return null;
  const row = body as Record<string, unknown>;
  if (typeof row.chaveFull !== "string" || typeof row.mime !== "string") return null;

  const evento = row.evento as Record<string, unknown> | undefined;
  const sessao = row.sessao as Record<string, unknown> | undefined;
  const midia = row.midia as Record<string, unknown> | undefined;
  if (!evento || !sessao || !midia) return null;
  if (typeof evento.slug !== "string" || typeof evento.packId !== "string") return null;
  if (typeof evento.comecaEm !== "string") return null;
  if (typeof evento.panico !== "boolean") return null;
  if (typeof evento.compartilhamentoExternoLiberado !== "boolean") return null;
  if (typeof sessao.nome !== "string") return null;
  if (typeof midia.removida !== "boolean") return null;

  const identityTokens =
    typeof evento.identityTokens === "object" && evento.identityTokens !== null
      ? (evento.identityTokens as Record<string, unknown>)
      : {};

  const consentRaw = sessao.consentimentoExterno;
  let consentimentoExterno: ConsentimentoExternoBruto | null = null;
  if (typeof consentRaw === "object" && consentRaw !== null) {
    const c = consentRaw as Record<string, unknown>;
    if (typeof c.versao === "string" && typeof c.em === "string") {
      consentimentoExterno = {
        versao: c.versao,
        em: c.em,
        revogadoEm: typeof c.revogadoEm === "string" ? c.revogadoEm : null,
        nomeNaMoldura: c.nomeNaMoldura === true,
      };
    }
  }

  const classificador =
    midia.classificador === "suspeito" || midia.classificador === "sem-resposta"
      ? midia.classificador
      : "limpo";

  return {
    chaveFull: row.chaveFull,
    chaveThumb: typeof row.chaveThumb === "string" ? row.chaveThumb : row.chaveFull,
    mime: row.mime,
    legenda: typeof row.legenda === "string" ? row.legenda : null,
    sessao: { nome: sessao.nome, consentimentoExterno },
    evento: {
      slug: evento.slug,
      packId: evento.packId,
      comecaEm: evento.comecaEm,
      identityTokens,
      panico: evento.panico,
      modoEndurecido: evento.modoEndurecido === true,
      compartilhamentoExternoLiberado: evento.compartilhamentoExternoLiberado,
    },
    midia: {
      removida: midia.removida,
      liberadaPeloAnfitriao: midia.liberadaPeloAnfitriao === true,
      denuncias: typeof midia.denuncias === "number" ? midia.denuncias : 0,
      classificador,
    },
  };
}

export type ComposeOk = {
  ok: true;
  composicao: Composicao;
  paleta: FramePalette;
};

export type ComposeFail = {
  ok: false;
  codigo: string;
  mensagem: string;
};

/**
 * Monta a composição 9:16 com o mesmo `compor` da web.
 * Dimensões vêm da imagem baixada (full ou thumb de vídeo).
 */
export function composeShareFrame(opts: {
  ctx: ShareContext;
  session: GuestSession;
  largura: number;
  altura: number;
  agora?: Date;
}): ComposeOk | ComposeFail {
  const agora = opts.agora ?? new Date();
  const { ctx, session } = opts;

  const sessao = {
    sessaoId: session.sessaoId,
    eventoId: session.eventoId,
    nome: ctx.sessao.nome,
    consentimentoDeEntrada: { versao: "v1", em: agora },
    consentimentoExterno: mapExternalConsent(ctx.sessao.consentimentoExterno),
  };

  const evento = {
    panico: ctx.evento.panico,
    modoEndurecido: ctx.evento.modoEndurecido,
    compartilhamentoExternoLiberado: ctx.evento.compartilhamentoExternoLiberado,
  };

  const midia = {
    id: "share",
    eventoId: session.eventoId,
    sessaoDeOrigem: session.sessaoId,
    largura: opts.largura,
    altura: opts.altura,
    legenda: ctx.legenda,
    estado: {
      removida: ctx.midia.removida,
      liberadaPeloAnfitriao: ctx.midia.liberadaPeloAnfitriao,
      denuncias: ctx.midia.denuncias,
      classificador: ctx.midia.classificador,
    },
  };

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
    return {
      ok: false,
      codigo: resultado.codigo,
      mensagem: shareMessage(resultado.codigo),
    };
  }

  return { ok: true, composicao: resultado.composicao, paleta };
}
