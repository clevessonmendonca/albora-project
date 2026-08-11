import { config, ErroConfig, ErroOrigemDeMidia } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { assinarGet } from "@/lib/r2";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";
import { recusado, validarLote, VALIDADE_GET_SEGUNDOS } from "./lote";

export const dynamic = "force-dynamic";

type Corpo = { chaves?: unknown };

/**
 * Emite URLs de leitura para um lote de chaves — e mais nada.
 *
 * O servidor **nunca serve mídia**: o navegador busca os bytes direto no
 * object storage, do mesmo jeito que o upload escreve direto nele. Proxy pelo
 * app poria o servidor no caminho dos bytes, e no sábado às 22h ele vira o
 * gargalo que ninguém consegue tirar.
 *
 * Em lote porque uma página de feed são 24 fotos, e 24 requisições no meio de
 * uma rolagem é a própria travada.
 */
export async function POST(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("midia.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    if (e instanceof ErroOrigemDeMidia) {
      console.error("midia.origem_invalida", { motivo: e.motivo });
      return erro(503, e.code, "Serviço indisponível");
    }
    throw e;
  }

  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  // Janela própria, e não a compartilhada com feed e presign: rolar o feed
  // gasta as duas ao mesmo tempo, e um contador só faria a leitura da mídia
  // morrer por causa do tráfego que a provoca.
  const limite = consumir(`midia:${identidadeParaLimite(req, sessao)}`, 120, 60, Date.now());
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

  const lote = validarLote(corpo.chaves, sessao.eventoId);

  if (recusado(lote)) {
    if (lote.status === 403) {
      console.warn("midia.chave_recusada", {
        eventoId: sessao.eventoId,
        sessaoId: sessao.sessaoId,
      });
    }
    return erro(lote.status, lote.code, lote.message, lote.details);
  }

  try {
    // Uma expiração só para o lote: o cliente renova a página inteira de uma
    // vez, e validades escalonadas fariam a renovação picar item a item.
    const expiraEm = Date.now() + VALIDADE_GET_SEGUNDOS * 1000;

    const urls = await Promise.all(
      lote.chaves.map(async (chave) => ({
        chave,
        url: await assinarGet(chave, VALIDADE_GET_SEGUNDOS),
        expiraEm,
      })),
    );

    console.log("midia.urls_emitidas", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      quantidade: urls.length,
    });

    return ok({ urls });
  } catch (e) {
    return erroInesperado("midia.urls", e);
  }
}
