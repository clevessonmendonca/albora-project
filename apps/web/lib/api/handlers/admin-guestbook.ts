import {
  type GuestbookError,
  validateGuestbookCreation,
  validateGuestbookDraft,
  type GuestbookEntry,
} from "@albora/core";
import {
  updateGuestbook,
  withEvent,
  GuestbookExistsError,
  insertGuestbook,
  eventGuestbook,
} from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { clientSentStorageKey } from "./guestbook-body";
import { signGuestbookAudio } from "./guestbook-audio-url";

export const dynamic = "force-dynamic";

type Corpo = {
  texto?: unknown;
  publicaEm?: unknown;
  chave?: unknown;
  audio?: unknown;
};

async function serializar(recado: GuestbookEntry | null) {
  if (!recado) return { recado: null };
  return {
    recado: {
      id: recado.id,
      texto: recado.texto,
      publicaEm: recado.publicaEm?.toISOString() ?? null,
      audio: await signGuestbookAudio(recado.audio),
    },
  };
}

function mapErro(erro: GuestbookError) {
  switch (erro.code) {
    case "recado.texto_obrigatorio":
      return errorResponse(422, erro.code, "O recado precisa de um texto");
    case "recado.texto_longo_demais":
      return errorResponse(422, erro.code, "Texto longo demais", erro.details);
    case "recado.audio_vazio":
    case "recado.audio_longo_demais":
      return errorResponse(422, erro.code, "Áudio inválido", "details" in erro ? erro.details : undefined);
    case "recado.ja_existe":
      return errorResponse(409, erro.code, "Este evento já tem um recado", erro.details);
  }
}

function parsePublicaEm(valor: unknown): Date | null | Response {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string") {
    return errorResponse(422, "validation_error", "Horário inválido", { campos: ["publicaEm"] });
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return errorResponse(422, "validation_error", "Horário inválido", { campos: ["publicaEm"] });
  }
  return data;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const recado = await withEvent(getPool(), eventId, (c) => eventGuestbook(c, eventId));
    return jsonOk(await serializar(recado));
  } catch (e) {
    return unexpectedError("admin.recado.get", e);
  }
}

/** Anfitrião escreve/edita o recado (spec 019): um por evento; chave de storage no JSON é recusada — cliente nunca a informa. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_recado:${auth.host.accountId}`, 30, 60, Date.now());
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

  if (clientSentStorageKey(corpo as Record<string, unknown>)) {
    return errorResponse(422, "recado.chave_do_cliente", "A chave de storage não vem do cliente");
  }

  if (typeof corpo.texto !== "string") {
    return errorResponse(422, "validation_error", "Texto inválido", { campos: ["texto"] });
  }

  const publicaEm = parsePublicaEm(corpo.publicaEm);
  if (publicaEm instanceof Response) return publicaEm;

  const rascunho = { texto: corpo.texto, audio: null, publicaEm };

  try {
    const salvo = await withEvent(getPool(), eventId, async (c) => {
      const existente = await eventGuestbook(c, eventId);

      if (existente === null) {
        const erro = validateGuestbookCreation([], eventId, rascunho);
        if (erro) return { ok: false as const, erro };
        const recado = await insertGuestbook(c, {
          eventoId: eventId,
          texto: rascunho.texto.trim(),
          publicaEm,
        });
        return { ok: true as const, recado };
      }

      const erro = validateGuestbookDraft(rascunho);
      if (erro) return { ok: false as const, erro };
      const recado = await updateGuestbook(c, {
        eventoId: eventId,
        texto: rascunho.texto.trim(),
        publicaEm,
      });
      return { ok: true as const, recado: recado ?? existente };
    });

    if (!salvo.ok) return mapErro(salvo.erro);

    console.log("admin.recado_salvo", { accountId: auth.host.accountId, eventId });
    return jsonOk(await serializar(salvo.recado));
  } catch (e) {
    if (e instanceof GuestbookExistsError) {
      return errorResponse(409, e.code, "Este evento já tem um recado", { eventoId: eventId });
    }
    return unexpectedError("admin.recado.put", e);
  }
}
