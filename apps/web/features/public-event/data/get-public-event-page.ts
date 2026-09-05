import {
  withEvent,
  lerMetricasAoVivo,
  listarMidiaDaParede,
  refDoEvento,
  resolverSlug,
  type EventoPublico,
} from "@albora/db";
import { getPool } from "@/lib/db";
import { signGet } from "@/lib/r2";
import { paraVitrinePublica } from "../lib/strip-pii";
import { resolvePublicEventIdentity } from "../lib/resolve-identity";

export type EstadoPaginaPublica = "aberto" | "nao_comecou" | "encerrado";

export type FotoDaVitrine = {
  id: string;
  url: string;
  largura?: number;
  altura?: number;
};

export type PublicEventPageData = {
  slug: string;
  estado: EstadoPaginaPublica;
  /** Só pra resolver as CSS vars da identidade no chão claro — nunca passa pro componente de tela. */
  evento: EventoPublico;
  nomeDoEvento: string;
  dataDoEvento: string;
  mensagemVazia: string;
  totalFotos: number;
  totalPessoas: number;
  vitrine: FotoDaVitrine[];
  ctaHref: string;
};

const TAMANHO_DA_VITRINE = 9;
const TTL_DA_THUMB_SEGUNDOS = 300;

/** Todo CTA viral cai na landing (não direto no admin): quem chegou por um convidado vê o produto antes do sign-in, e o middleware grava o ref. */
export const CTA_LANDING = "/";

function ctaComRef(refToken: string | null): string {
  return refToken ? `${CTA_LANDING}?ref=${encodeURIComponent(refToken)}` : CTA_LANDING;
}

/** Página pública: agregado moderado (`listarMidiaDaParede`), sem PII (`paraVitrinePublica` descarta `autor`); `desconhecido`/`slug_rotacionado` → null. */
export async function getPublicEventPage(slug: string): Promise<PublicEventPageData | null> {
  const resolucao = await resolverSlug(getPool(), slug, new Date());

  if (
    resolucao.estado === "desconhecido" ||
    resolucao.estado === "slug_rotacionado" ||
    resolucao.estado === "rascunho"
  ) {
    // Rascunho: anfitrião não publicou (task 6, gap I1) — a vitrine pública
    // não existe até lá, igual a slug desconhecido.
    return null;
  }

  const { evento } = resolucao;
  const estado: EstadoPaginaPublica = resolucao.estado;
  const identidade = resolvePublicEventIdentity(slug, evento);

  const { metricas, midia } = await withEvent(getPool(), evento.eventoId, async (c) => {
    const metricas = await lerMetricasAoVivo(c, evento.eventoId);
    const midia = await listarMidiaDaParede(c, evento.eventoId, TAMANHO_DA_VITRINE);
    return { metricas, midia };
  });

  const refToken = await withEvent(getPool(), evento.eventoId, (c) =>
    refDoEvento(c, evento.eventoId),
  ).catch(() => null);

  const semAutor = paraVitrinePublica(midia);
  const vitrine: FotoDaVitrine[] = await Promise.all(
    semAutor.map(async (foto) => ({
      id: foto.id,
      url: await signGet(foto.chaveThumb, TTL_DA_THUMB_SEGUNDOS),
      ...(foto.largura !== undefined && foto.altura !== undefined
        ? { largura: foto.largura, altura: foto.altura }
        : {}),
    })),
  );

  return {
    slug,
    estado,
    evento,
    ...identidade,
    totalFotos: metricas.totalFotos,
    totalPessoas: metricas.sessoesComUpload,
    vitrine,
    ctaHref: ctaComRef(refToken),
  };
}
