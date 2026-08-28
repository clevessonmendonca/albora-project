import { withEvent, buscarContextoCompartilhar, registrarConsentimentoExterno } from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const uploadId = new URL(req.url).searchParams.get("uploadId");
  if (!uploadId || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", { campo: "uploadId" });
  }

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  try {
    const ctx = await withEvent(getPool(), auth.session.eventoId, (c) =>
      buscarContextoCompartilhar(c, auth.session.sessaoId, uploadId),
    );

    if (!ctx) return errorResponse(404, "upload.nao_encontrado", "Foto não encontrada");

    return jsonOk({
      chaveFull: ctx.midia.chaveFull,
      chaveThumb: ctx.midia.chaveThumb,
      mime: ctx.midia.mime,
      legenda: ctx.midia.legenda,
      sessao: {
        nome: ctx.sessao.nome,
        consentimentoExterno: ctx.sessao.consentimentoExterno
          ? {
              versao: ctx.sessao.consentimentoExterno.versao,
              em: ctx.sessao.consentimentoExterno.em.toISOString(),
              revogadoEm: ctx.sessao.consentimentoExterno.revogadoEm?.toISOString() ?? null,
              nomeNaMoldura: ctx.sessao.consentimentoExterno.nomeNaMoldura,
            }
          : null,
      },
      evento: {
        slug: ctx.evento.slug,
        packId: ctx.evento.packId,
        comecaEm: ctx.evento.comecaEm.toISOString(),
        identityTokens: ctx.evento.identityTokens,
        panico: ctx.evento.panico,
        modoEndurecido: ctx.evento.modoEndurecido,
        compartilhamentoExternoLiberado: ctx.evento.compartilhamentoExternoLiberado,
      },
      midia: {
        removida: ctx.midia.removida,
        liberadaPeloAnfitriao: ctx.midia.liberadaPeloAnfitriao,
        denuncias: ctx.midia.denuncias,
        classificador:
          ctx.midia.classificador === "suspeito" || ctx.midia.classificador === "sem-resposta"
            ? ctx.midia.classificador
            : "limpo",
      },
    });
  } catch (e) {
    return unexpectedError("compartilhar.contexto", e);
  }
}

type Corpo = { nomeNaMoldura?: unknown };

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 20 });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const nomeNaMoldura = parsed.data.nomeNaMoldura === true;

  try {
    const gravou = await withEvent(getPool(), auth.session.eventoId, (c) =>
      registrarConsentimentoExterno(c, auth.session.sessaoId, nomeNaMoldura),
    );

    if (!gravou) return errorResponse(404, "sessao.nao_encontrada", "Sessão não encontrada");

    return jsonOk({ registrado: true, nomeNaMoldura });
  } catch (e) {
    return unexpectedError("compartilhar.consentimento", e);
  }
}
