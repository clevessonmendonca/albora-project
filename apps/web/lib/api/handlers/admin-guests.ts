import {
  withEvent,
  definirNomeDaSessaoDoHost,
  ErroNomeInvalido,
  lerFunilAgregado,
  lerMetricasAoVivo,
  listarSessoesDoHost,
} from "@albora/db";
import { decideThesis, type CodigoDaTese } from "@albora/core";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

type Corpo = {
  sessaoId?: unknown;
  acao?: unknown;
  nome?: unknown;
};

/** Funil agregado (spec 009 B-07) e nomes no telão (flows.md N3.3). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false, mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limit = consume(`admin_convidados:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEvent(auth.host.accountId, eventId);
    if (owned instanceof Response) return owned;
    const { evento } = owned;

    const data = await withEvent(getPool(), eventId, async (c) => {
      const [metricas, funil, sessoes] = await Promise.all([
        lerMetricasAoVivo(c, eventId),
        lerFunilAgregado(c, eventId),
        listarSessoesDoHost(c, eventId),
      ]);
      return { metricas, funil, sessoes };
    });

    const veredito = decideThesis({
      expectedGuests: evento.expectedGuests,
      sessoesComUpload: data.metricas.sessoesComUpload,
    });

    const ultimas = await Promise.all(
      data.metricas.ultimas.map(async (f) => ({
        id: f.id,
        criadaEm: f.criadaEm.toISOString(),
        thumb: await assinarGet(f.chaveThumb, GET_TTL_SECONDS),
      })),
    );

    return jsonOk({
      expectedGuests: evento.expectedGuests,
      totalSessoes: data.funil.totalSessoes,
      sessoesComUpload: data.metricas.sessoesComUpload,
      totalFotos: data.metricas.totalFotos,
      sharesTotais: data.metricas.sharesTotais,
      participacao: veredito.taxa,
      veredito: veredito.codigo as CodigoDaTese,
      degraus: data.funil.degraus,
      uploadsAntesDoFeed: data.funil.uploadsAntesDoFeed,
      uploadsDepoisDoFeed: data.funil.uploadsDepoisDoFeed,
      entradasPorVia: data.funil.entradasPorVia,
      ultimas,
      sessoes: data.sessoes.map((s) => ({
        id: s.id,
        nome: s.nome,
        fotos: s.fotos,
      })),
    });
  } catch (e) {
    return unexpectedError("admin.convidados", e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_nome:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const sessaoId = typeof corpo.sessaoId === "string" ? corpo.sessaoId : "";
  if (!sessaoId || !UUID_RE.test(sessaoId)) {
    return errorResponse(422, "validation_error", "Sessão inválida", { campos: ["sessaoId"] });
  }

  const acao = corpo.acao === "ocultar" || corpo.acao === "renomear" ? corpo.acao : null;
  if (!acao) {
    return errorResponse(422, "validation_error", "Ação inválida", { campos: ["acao"] });
  }

  try {
    const atualizada = await definirNomeDaSessaoDoHost(
      getPool(),
      auth.host.accountId,
      eventId,
      sessaoId,
      acao === "ocultar"
        ? { acao: "ocultar" }
        : { acao: "renomear", nome: typeof corpo.nome === "string" ? corpo.nome : "" },
    );
    if (!atualizada) {
      return errorResponse(404, "sessao.nao_encontrada", "Convidado não encontrado");
    }
    console.log("admin.nome_sessao", { eventoId: eventId, sessaoId, acao });
    return jsonOk({ id: atualizada.id, nome: atualizada.nome, fotos: atualizada.fotos });
  } catch (e) {
    if (e instanceof ErroNomeInvalido) {
      return errorResponse(422, "validation_error", "Nome inválido", { campos: ["nome"] });
    }
    return unexpectedError("admin.convidados.nome", e);
  }
}
