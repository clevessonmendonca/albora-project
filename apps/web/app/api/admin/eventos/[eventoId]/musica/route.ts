import { exibirMusica, lerLinkDeMusica } from "@albora/core";
import {
  buscarEventoDoHost,
  comEvento,
  definirMusicaDoCasal,
  musicaDoCasal,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

type Corpo = { url?: unknown };

function serializar(
  musica: Awaited<ReturnType<typeof musicaDoCasal>>,
): { provedor: string; rotulo: string; url: string } | null {
  if (!musica) return null;
  const exibicao = exibirMusica(musica.link, musica.metadado);
  return {
    provedor: musica.link.provedor,
    rotulo: exibicao.rotulo,
    url: exibicao.url,
  };
}

async function eventoDoHost(accountId: string, eventoId: string) {
  const evento = await buscarEventoDoHost(banco(), accountId, eventoId);
  if (!evento) return null;
  return evento;
}

export async function GET(
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
  if (!(await eventoDoHost(host.accountId, eventoId))) {
    return erro(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  try {
    const musica = await comEvento(banco(), eventoId, (c) => musicaDoCasal(c, eventoId));
    return ok({ musica: serializar(musica) });
  } catch (e) {
    return erroInesperado("admin.musica.get", e);
  }
}

/**
 * O casal cola o link da faixa (spec 018). Metadado rico fica fora do caminho
 * crítico — sem título, a UI cai para o link cru.
 */
export async function PUT(
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

  const limite = consumir(`admin_musica:${host.accountId}`, 30, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  if (!(await eventoDoHost(host.accountId, eventoId))) {
    return erro(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  if (typeof corpo.url !== "string" || corpo.url.trim() === "") {
    return erro(422, "validation_error", "Cole o link da faixa", { campos: ["url"] });
  }

  const lido = lerLinkDeMusica(corpo.url.trim());
  if (!lido.ok) {
    return erro(422, lido.erro.code, "Link não aceito", lido.erro.details);
  }

  try {
    await comEvento(banco(), eventoId, (c) =>
      definirMusicaDoCasal(c, {
        eventoId,
        link: lido.link,
        metadado: null,
      }),
    );

    const musica = await comEvento(banco(), eventoId, (c) => musicaDoCasal(c, eventoId));

    console.log("admin.musica_definida", {
      accountId: host.accountId,
      eventoId,
      provedor: lido.link.provedor,
    });

    return ok({ musica: serializar(musica) });
  } catch (e) {
    return erroInesperado("admin.musica.put", e);
  }
}
