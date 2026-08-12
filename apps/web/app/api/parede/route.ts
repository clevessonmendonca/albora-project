import { comEvento, listarMidiaDaParede } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig, ErroOrigemDeMidia } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { paredeDaRequisicao } from "@/lib/parede";
import { assinarGet } from "@/lib/r2";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

/** A validade das URLs de leitura, igual à do feed: a TV renova a página. */
const VALIDADE_GET_SEGUNDOS = 900;

/**
 * O que a parede lê — e nada mais.
 *
 * 1. **Crachá, não sessão.** A rota resolve pela `wall_tokens`; um crachá só
 *    lê, e é o que faz ser seguro deixá-lo numa TV pendurada no salão.
 * 2. **O evento vem do crachá, nunca da URL.** Não há parâmetro de evento aqui:
 *    o crachá já carrega o seu, e a RLS confere de novo dentro de `comEvento`.
 * 3. **O servidor nunca toca nos bytes.** Ele assina a URL de leitura e o
 *    navegador da TV busca a foto direto no storage, como no resto do produto.
 * 4. **A moderação é a mesma do feed.** `listarMidiaDaParede` lê `published`, a
 *    única fonte de verdade sobre o que é público.
 */
export async function GET(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("parede.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    if (e instanceof ErroOrigemDeMidia) {
      console.error("parede.origem_invalida", { motivo: e.motivo });
      return erro(503, e.code, "Serviço indisponível");
    }
    throw e;
  }

  const parede = await paredeDaRequisicao(req);
  if (!parede) return erro(401, "parede.invalida", "Crachá do telão inválido ou expirado");

  // Limite por evento, não por pessoa: a parede é uma tela só, e quem a
  // consulta é a TV. Uma janela folgada porque ela repete o poll a noite toda.
  const limite = consumir(`parede:${parede.eventoId}`, 240, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  try {
    const midias = await comEvento(banco(), parede.eventoId, (c) =>
      listarMidiaDaParede(c, parede.eventoId),
    );

    // Uma expiração só para o lote: a TV renova a página inteira, e validades
    // escalonadas fariam a renovação picar foto a foto.
    const expiraEm = Date.now() + VALIDADE_GET_SEGUNDOS * 1000;

    const itens = await Promise.all(
      midias.map(async (m) => ({
        id: m.id,
        autor: m.autor,
        criadaEm: m.criadaEm.toISOString(),
        reacoes: m.reacoes,
        thumb: await assinarGet(m.chaveThumb, VALIDADE_GET_SEGUNDOS),
        full: await assinarGet(m.chaveFull, VALIDADE_GET_SEGUNDOS),
      })),
    );

    console.log("parede.pagina", { eventoId: parede.eventoId, itens: itens.length });

    return ok({ itens, expiraEm });
  } catch (e) {
    return erroInesperado("parede", e);
  }
}
