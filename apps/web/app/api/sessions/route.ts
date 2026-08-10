import { criarSessao, ErroNomeInvalido } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { cabecalhoDeCookie, identidadeParaLimite } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const CONSENTIMENTO_VIGENTE = "v1";

type Corpo = { eventoId?: unknown; nome?: unknown; consentimento?: unknown };

/**
 * Terceiro toque do fluxo: QR → consentimento → nome → sessão.
 *
 * Não existe login aqui nem em lugar nenhum. A primeira foto nunca passa por
 * loja de aplicativos nem por tela de autenticação — é a regra que decide a
 * H1, e a H1 decide se o negócio existe.
 */
export async function POST(req: Request) {
  let cfg;
  try {
    cfg = config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("sessions.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  // No portão: antes de escrever no banco. Criar sessão é barato, mas 200
  // sessões por minuto do mesmo IP não é convidado, é script.
  const limite = consumir(identidadeParaLimite(req, null), 10, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Muitas tentativas", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const { eventoId, nome, consentimento } = corpo;

  if (typeof eventoId !== "string" || typeof nome !== "string") {
    return erro(422, "validation_error", "Dados incompletos", {
      campos: ["eventoId", "nome"],
    });
  }

  // O consentimento é versionado e datado, e vem **antes** de qualquer
  // captura. Recusar não é erro: é uma escolha legítima, e quem chama
  // apresenta a saída com dignidade em vez de insistir.
  if (consentimento !== CONSENTIMENTO_VIGENTE) {
    return erro(422, "consentimento.ausente", "Consentimento necessário", {
      versao_vigente: CONSENTIMENTO_VIGENTE,
    });
  }

  try {
    const { token, sessaoId } = await criarSessao(banco(), cfg.sessionSecret, {
      eventoId,
      nome,
      consentimentoVersao: CONSENTIMENTO_VIGENTE,
      duracaoHoras: cfg.duracaoSessaoHoras,
    });

    // O id da sessão vai no corpo; o token vai só no cookie. O cliente nunca
    // precisa ler o token, e o que ele não lê ele não cola numa URL.
    console.log("sessao.criada", { eventoId, sessaoId });

    return ok(
      { sessaoId },
      { status: 201, headers: { "set-cookie": cabecalhoDeCookie(token, cfg.duracaoSessaoHoras) } },
    );
  } catch (e) {
    if (e instanceof ErroNomeInvalido) {
      return erro(422, e.code, "Nome obrigatório", { max: 40 });
    }
    return erroInesperado("sessions.criar", e);
  }
}
