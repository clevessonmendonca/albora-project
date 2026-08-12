import { autorizarPareamento, ErroAutorizacaoDePareamento } from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * A versão do consentimento de quem liga o telão. Datada e versionada por quem
 * autoriza: é ele que decide expor as fotos publicadas numa tela do salão.
 */
const VERSAO_CONSENTIMENTO_TELAO = "1";

const CODIGO = /^[A-HJ-NP-Z2-9]{6}$/;

type Corpo = { codigo?: unknown };

/**
 * Alguém que já está no evento autoriza o telão (spec 010).
 *
 * 🔴 O evento vem da **sessão de quem autoriza**, nunca do corpo nem da TV.
 * Convidado ou anfitrião serve — o crachá que sai daqui só lê o que já é
 * público, e ninguém sobe foto por ele. Sem sessão, 401: não dá para ligar o
 * telão de um evento em que você não entrou.
 */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Entre no evento antes de ligar o telão");

  const limite = consumir(`autorizar:${identidadeParaLimite(req, sessao)}`, 20, 60, Date.now());
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

  const codigo = typeof corpo.codigo === "string" ? corpo.codigo.trim().toUpperCase() : "";
  if (!CODIGO.test(codigo)) {
    return erro(422, "validation_error", "Código inválido", { campos: ["codigo"] });
  }

  try {
    await autorizarPareamento(
      banco(),
      codigo,
      sessao.eventoId,
      VERSAO_CONSENTIMENTO_TELAO,
      new Date(),
    );

    console.log("parede.pareamento_autorizado", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
    });

    return ok({ autorizado: true });
  } catch (e) {
    if (e instanceof ErroAutorizacaoDePareamento) {
      // Código errado, expirado ou já usado: mesma resposta 409 para o cliente,
      // motivo distinto só no log. Não confirma qual dos três para quem tenta.
      console.warn("parede.autorizacao_recusada", {
        eventoId: sessao.eventoId,
        motivo: e.motivo,
      });
      return erro(409, "parede.pareamento_invalido", "Código inválido ou expirado");
    }
    return erroInesperado("parede.autorizar", e);
  }
}
