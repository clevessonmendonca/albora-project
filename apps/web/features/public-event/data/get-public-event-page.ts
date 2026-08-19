import {
  comEvento,
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

/**
 * O que a página pública lê: agregado e já moderado do evento do slug —
 * nunca dado de convidado.
 *
 * Duas leituras, as mais estritas do pacote pra cada finalidade:
 * `lerMetricasAoVivo` para a contagem (`state = 'published'`) e
 * `listarMidiaDaParede` para a vitrine — a mesma leitura do telão, que
 * reavalia denúncia, veredito do classificador e pânico a cada chamada
 * (`wall-media.ts`). `paraVitrinePublica` descarta o `autor` (primeiro nome
 * de quem enviou) antes de qualquer assinatura de URL: uma página indexável
 * não tem PII de convidado, o telão tem porque é uma TV num salão fechado.
 *
 * `desconhecido` e `slug_rotacionado` devolvem `null` — o slug rotacionado
 * não resolve aqui por decisão: a placa mudou, e orientar quem escaneou a
 * antiga é papel de `/e/[slug]`, não desta vitrine. Os outros três estados
 * (`aberto`, `nao_comecou`, `encerrado`) sempre respondem: a página é a
 * vitrine permanente do evento, viva antes, durante e depois da festa.
 */
export async function getPublicEventPage(slug: string): Promise<PublicEventPageData | null> {
  const resolucao = await resolverSlug(getPool(), slug, new Date());

  if (resolucao.estado === "desconhecido" || resolucao.estado === "slug_rotacionado") {
    return null;
  }

  const { evento } = resolucao;
  const estado: EstadoPaginaPublica = resolucao.estado;
  const identidade = resolvePublicEventIdentity(slug, evento);

  const { metricas, midia } = await comEvento(getPool(), evento.eventoId, async (c) => {
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
