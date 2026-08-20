import {
  apagarReacao,
  withEvent,
  eventGate,
  eventPack,
  gravarReacao,
  listReactionsForMedia,
  midiaPublicadaDoEvento,
  reacaoDaSessao,
} from "@albora/db";
import { PACKS, isValidReaction } from "@albora/packs";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const TIPO_PADRAO = "estrela";

type Corpo = { uploadId?: unknown; tipo?: unknown };

async function validarSessao(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "reacao.evento_divergente");
  if (mismatch) return mismatch;

  return auth;
}

function parseUploadId(corpo: Corpo): string | null {
  return typeof corpo.uploadId === "string" && UUID_RE.test(corpo.uploadId) ? corpo.uploadId : null;
}

export async function GET(req: Request) {
  const auth = await validarSessao(req);
  if (auth instanceof Response) return auth;

  const uploadId = parseUploadId({ uploadId: new URL(req.url).searchParams.get("uploadId") });
  if (!uploadId) return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });

  try {
    const nomes = await withEvent(getPool(), auth.session.eventoId, (c) =>
      listReactionsForMedia(c, uploadId, auth.session.sessaoId),
    );
    return jsonOk({ nomes: nomes.map((item) => item.nome) });
  } catch (e) {
    return unexpectedError("reacao.get", e);
  }
}

export async function PUT(req: Request) {
  const auth = await validarSessao(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const uploadId = parseUploadId(parsed.data);
  if (!uploadId) return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });

  const tipo = typeof parsed.data.tipo === "string" ? parsed.data.tipo : TIPO_PADRAO;

  try {
    const resultado = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      // Reagir não espera o gate (ADR 0009, atualizado) — só o evento
      // precisa existir/ser visível sob RLS. Só comentário fica atrás do
      // horário que o casal escolheu (ver `/api/comments`).
      const gate = await eventGate(c, auth.session.eventoId);
      if (!gate) {
        return { ok: false as const, code: "reacao.evento_ausente" };
      }

      if (!(await midiaPublicadaDoEvento(c, auth.session.eventoId, uploadId))) {
        return { ok: false as const, code: "reacao.midia_ausente" };
      }

      const packId = await eventPack(c, auth.session.eventoId);
      const pack = packId ? PACKS[packId] : undefined;
      if (!pack || !isValidReaction(pack, tipo)) {
        return { ok: false as const, code: "reacao.tipo_invalido" };
      }

      const reacoes = await gravarReacao(c, auth.session.eventoId, uploadId, auth.session.sessaoId, tipo);
      return { ok: true as const, reacoes, minha: tipo };
    });

    if (!resultado.ok) {
      const status = resultado.code === "reacao.evento_ausente" ? 403 : 422;
      return errorResponse(status, resultado.code, "Reação recusada");
    }

    return jsonOk({ reacoes: resultado.reacoes, minha: resultado.minha });
  } catch (e) {
    return unexpectedError("reacao.put", e);
  }
}

export async function DELETE(req: Request) {
  const auth = await validarSessao(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const uploadId = parseUploadId(parsed.data);
  if (!uploadId) return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });

  try {
    const resultado = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const gate = await eventGate(c, auth.session.eventoId);
      if (!gate) {
        return { ok: false as const, code: "reacao.evento_ausente" };
      }

      const tinha = await reacaoDaSessao(c, uploadId, auth.session.sessaoId);
      if (!tinha) {
        const { rows } = await c.query<{ total: number }>(
          "SELECT count(*)::int AS total FROM reactions WHERE upload_id = $1",
          [uploadId],
        );
        return { ok: true as const, reacoes: rows[0]?.total ?? 0, minha: null };
      }

      const reacoes = await apagarReacao(c, uploadId, auth.session.sessaoId);
      return { ok: true as const, reacoes, minha: null };
    });

    if (!resultado.ok) return errorResponse(403, resultado.code, "Reação recusada");

    return jsonOk({ reacoes: resultado.reacoes, minha: resultado.minha });
  } catch (e) {
    return unexpectedError("reacao.delete", e);
  }
}
