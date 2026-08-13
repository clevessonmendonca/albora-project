import {
  abrirInteracaoDoEvento,
  atualizarModeracaoDoEvento,
  buscarEventoDoHost,
  comEvento,
  lerMetricasAoVivo,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
} from "@albora/db";
import { decidirTese, type CodigoDaTese } from "@albora/core";
import { banco } from "@/lib/banco";
import { config, ErroConfig, ErroOrigemDeMidia } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { assinarGet } from "@/lib/r2";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

type Corpo = {
  panico?: unknown;
  haMenores?: unknown;
  modoEndurecido?: unknown;
  abrirInteracao?: unknown;
};

function comoBooleano(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

/** Painel ao vivo: participação, fotos e fila de revisão (spec 009). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      return erro(503, "config.missing", "Serviço indisponível");
    }
    if (e instanceof ErroOrigemDeMidia) {
      return erro(503, e.code, "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(_req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;

  const limite = consumir(`admin_painel:${host.accountId}`, 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  try {
    const evento = await buscarEventoDoHost(banco(), host.accountId, eventoId);
    if (!evento) return erro(404, "evento.nao_encontrado", "Evento não encontrado");

    const dados = await comEvento(banco(), eventoId, async (c) => {
      const metricas = await lerMetricasAoVivo(c, eventoId);
      const midias = await listarMidiaParaRevisao(c, eventoId);
      const comentarios = await listarComentariosParaRevisao(c, eventoId);
      return { metricas, filaRevisao: midias.length + comentarios.length };
    });

    const veredito = decidirTese({
      expectedGuests: evento.expectedGuests,
      sessoesComUpload: dados.metricas.sessoesComUpload,
    });

    const ultimas = await Promise.all(
      dados.metricas.ultimas.map(async (f) => ({
        id: f.id,
        criadaEm: f.criadaEm.toISOString(),
        thumb: await assinarGet(f.chaveThumb, VALIDADE_GET_SEGUNDOS),
      })),
    );

    return ok({
      expectedGuests: evento.expectedGuests,
      sessoesComUpload: dados.metricas.sessoesComUpload,
      totalFotos: dados.metricas.totalFotos,
      filaRevisao: dados.filaRevisao,
      participacao: veredito.taxa,
      veredito: veredito.codigo as CodigoDaTese,
      ultimas,
    });
  } catch (e) {
    return erroInesperado("admin.painel", e);
  }
}

/**
 * Toggles de moderacao do evento (roadmap A2, spec 011, ADR 0012).
 *
 * A conta vem da sessao de host; `comConta` impede alterar evento alheio.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("admin.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;

  const limite = consumir(`admin_moderacao:${host.accountId}`, 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const panico = comoBooleano(corpo.panico);
  const haMenores = comoBooleano(corpo.haMenores);
  const modoEndurecido = comoBooleano(corpo.modoEndurecido);
  const abrirInteracao = comoBooleano(corpo.abrirInteracao);

  if (
    panico === undefined &&
    haMenores === undefined &&
    modoEndurecido === undefined &&
    abrirInteracao === undefined
  ) {
    return erro(422, "validation_error", "Nada para atualizar", {
      campos: ["panico", "haMenores", "modoEndurecido", "abrirInteracao"],
    });
  }

  try {
    let evento = await atualizarModeracaoDoEvento(banco(), host.accountId, eventoId, {
      ...(panico !== undefined ? { panico } : {}),
      ...(haMenores !== undefined ? { haMenores } : {}),
      ...(modoEndurecido !== undefined ? { modoEndurecido } : {}),
    });

    if (abrirInteracao === true) {
      evento = await abrirInteracaoDoEvento(banco(), host.accountId, eventoId);
    }

    if (!evento) {
      return erro(404, "evento.nao_encontrado", "Evento não encontrado");
    }

    console.log("admin.moderacao_atualizada", {
      accountId: host.accountId,
      eventoId,
      panico: evento.moderacao.panico,
      haMenores: evento.moderacao.haMenores,
      modoEndurecido: evento.moderacao.modoEndurecido,
      interacaoAberta: abrirInteracao === true,
    });

    return ok({
      moderacao: evento.moderacao,
      interacaoAbreEm: evento.interacaoAbreEm?.toISOString() ?? null,
    });
  } catch (e) {
    return erroInesperado("admin.moderacao", e);
  }
}
