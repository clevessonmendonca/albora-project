import { buscarEventoDoHost, comEvento, listarMidiaDoAlbum, ocultarMidiaDoHost } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig, ErroOrigemDeMidia } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { assinarGet } from "@/lib/r2";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

export async function GET(
  req: Request,
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

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;

  const limite = consumir(`admin_album:${host.accountId}`, 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  try {
    const evento = await buscarEventoDoHost(banco(), host.accountId, eventoId);
    if (!evento) return erro(404, "evento.nao_encontrado", "Evento não encontrado");

    const midias = await comEvento(banco(), eventoId, (c) => listarMidiaDoAlbum(c, eventoId, 120));

    const itens = await Promise.all(
      midias.map(async (m) => ({
        id: m.id,
        missaoId: m.missaoId,
        lugarId: m.lugarId,
        reacoes: m.reacoes,
        criadaEm: m.recebidaEm.toISOString(),
        thumb: await assinarGet(m.chaveThumb, VALIDADE_GET_SEGUNDOS),
      })),
    );

    return ok({ itens, total: itens.length });
  } catch (e) {
    return erroInesperado("admin.album", e);
  }
}

type Corpo = { midiaId?: unknown };

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const midiaId = typeof corpo.midiaId === "string" ? corpo.midiaId : "";
  if (!midiaId) {
    return erro(422, "validation_error", "midiaId obrigatório", { campos: ["midiaId"] });
  }

  try {
    const ocultou = await ocultarMidiaDoHost(banco(), host.accountId, eventoId, midiaId);
    if (!ocultou) return erro(404, "midia.nao_encontrada", "Foto não encontrada");
    return ok({ oculta: true });
  } catch (e) {
    return erroInesperado("admin.album", e);
  }
}
