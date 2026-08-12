import { abrirInteracaoDoEvento, atualizarModeracaoDoEvento } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

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
