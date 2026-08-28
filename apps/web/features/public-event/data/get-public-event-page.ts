import {
  withEvent,
  lerMetricasAoVivo,
  listarMidiaDaParede,
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

/** Onde o CTA "monte o seu" aponta — o mesmo destino do botão grátis da landing. */
export const CTA_MONTAR_O_SEU = "/admin/new?plano=free";

/** Página pública: agregado moderado (`listarMidiaDaParede`), sem PII (`paraVitrinePublica` descarta `autor`); `desconhecido`/`slug_rotacionado` → null. */
export async function getPublicEventPage(slug: string): Promise<PublicEventPageData | null> {
  const resolucao = await resolverSlug(getPool(), slug, new Date());

  if (resolucao.estado === "desconhecido" || resolucao.estado === "slug_rotacionado") {
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
    ctaHref: CTA_MONTAR_O_SEU,
  };
}
