import { montarAlbumServido } from "@/lib/album";
import { config, ErroConfig, ErroOrigemDeMidia } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * O álbum da noite (spec 016) — leitura, montagem e URLs assinadas.
 *
 * Três decisões, e nenhuma negociável:
 *
 * 1. **O evento vem da sessão, nunca da URL.** O `evento` da querystring, se
 *    vier, é conferido contra ela — divergência é 403, e nunca "usa o da URL".
 *    A credencial é a sessão do convidado (`sessaoDaRequisicao`): o álbum é uma
 *    superfície do convidado, e o token em cookie já o escopa a este evento.
 * 2. **O servidor não toca nos bytes.** O corpo traz URLs assinadas; o
 *    navegador busca a mídia direto no object storage.
 * 3. **A montagem é derivada da mídia publicada** — a mesma coluna do feed. Sem
 *    tabela nova, sem persistir curadoria: seleção é ação de anfitrião, e o
 *    anfitrião ainda não tem porta.
 */
export async function GET(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("album.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    if (e instanceof ErroOrigemDeMidia) {
      console.error("album.origem_invalida", { motivo: e.motivo });
      return erro(503, e.code, "Serviço indisponível");
    }
    throw e;
  }

  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(`album:${identidadeParaLimite(req, sessao)}`, 30, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    console.warn("album.evento_divergente", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
    });
    return erro(403, "album.evento_divergente", "Esta sessão não pertence a este evento");
  }

  try {
    const album = await montarAlbumServido(sessao.eventoId);

    console.log("album.montado", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      paginas: album.totalDePaginas,
      fotos: album.contadores.fotos,
    });

    return ok({ album });
  } catch (e) {
    return erroInesperado("album", e);
  }
}
