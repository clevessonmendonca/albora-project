import { randomUUID } from "node:crypto";
import {
  deriveGuestbookAudioKey,
  durationForUpload,
  isGuestbookAudioKey,
  normalizeGuestbookAudioMime,
  VALIDADE_PRESIGN_SEGUNDOS,
  validateGuestbookAudioConsent,
  validateGuestbookAudioContent,
  validateGuestbookAudioDeclaration,
} from "@albora/core";
import { eventGuestbook, updateGuestbookAudio, withEvent } from "@albora/db";
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
import { inspecionarObjeto, assinarPut } from "@/lib/r2";
import { signGuestbookAudio } from "./guestbook-audio-url";

export const dynamic = "force-dynamic";

type PresignBody = {
  mime?: unknown;
  bytes?: unknown;
  duracaoSegundos?: unknown;
};

type ConfirmBody = {
  chave?: unknown;
  mime?: unknown;
  duracaoSegundos?: unknown;
  aceite?: unknown;
};

function mapAudioError(
  erro: NonNullable<ReturnType<typeof validateGuestbookAudioDeclaration>>,
): Response {
  switch (erro.code) {
    case "recado.audio_tipo_recusado":
      return errorResponse(422, erro.code, "Formato de áudio recusado", erro.details);
    case "recado.audio_grande_demais":
      return errorResponse(422, erro.code, "Áudio grande demais", erro.details);
    case "recado.audio_vazio":
    case "recado.audio_longo_demais":
      return errorResponse(422, erro.code, "Áudio inválido", "details" in erro ? erro.details : undefined);
    case "recado.audio_conteudo_nao_confere":
      return errorResponse(422, erro.code, "Arquivo recusado", erro.details);
    case "recado.audio_aceite_ausente":
      return errorResponse(422, erro.code, "Confirme que a gravação é da sua voz");
  }
}

async function requireHostRecado(req: Request, eventId: string) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_recado_audio:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  return auth;
}

/** Presign do áudio: chave derivada aqui, nunca do cliente; token do convidado não passa por esta rota. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireHostRecado(req, eventId);
  if (auth instanceof Response) return auth;

  const parsed = await parseJsonBody<PresignBody>(req);
  if (parsed instanceof Response) return parsed;

  const mime = typeof parsed.data.mime === "string" ? parsed.data.mime : "";
  const bytes = typeof parsed.data.bytes === "number" ? parsed.data.bytes : NaN;
  const duracao = durationForUpload(
    typeof parsed.data.duracaoSegundos === "number" ? parsed.data.duracaoSegundos : NaN,
  );
  if (duracao === null) {
    return errorResponse(422, "recado.audio_vazio", "Áudio inválido");
  }

  const mimeNormalizado = normalizeGuestbookAudioMime(mime);
  const invalido = validateGuestbookAudioDeclaration(mimeNormalizado ?? mime, bytes, duracao);
  if (invalido) return mapAudioError(invalido);
  if (!mimeNormalizado) {
    return mapAudioError({ code: "recado.audio_tipo_recusado", details: { recebido: mime } });
  }

  const chave = deriveGuestbookAudioKey(eventId, randomUUID());

  try {
    const put = await assinarPut(chave, mimeNormalizado, VALIDADE_PRESIGN_SEGUNDOS);
    console.log("admin.recado_audio.presign", { accountId: auth.host.accountId, eventId });
    return jsonOk({
      chave,
      put,
      expiraEm: Date.now() + VALIDADE_PRESIGN_SEGUNDOS * 1000,
    });
  } catch (e) {
    return unexpectedError("admin.recado_audio.presign", e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireHostRecado(req, eventId);
  if (auth instanceof Response) return auth;

  try {
    const recado = await withEvent(getPool(), eventId, (c) =>
      updateGuestbookAudio(c, { eventoId: eventId, audio: null }),
    );
    if (!recado) {
      return errorResponse(404, "recado.inexistente", "Salve o texto do recado primeiro");
    }
    console.log("admin.recado_audio.apagado", { accountId: auth.host.accountId, eventId });
    return jsonOk({ recado: { id: recado.id, audio: null } });
  } catch (e) {
    return unexpectedError("admin.recado_audio.delete", e);
  }
}

export async function confirmPOST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireHostRecado(req, eventId);
  if (auth instanceof Response) return auth;

  const parsed = await parseJsonBody<ConfirmBody>(req);
  if (parsed instanceof Response) return parsed;

  const aceiteErro = validateGuestbookAudioConsent(parsed.data.aceite);
  if (aceiteErro) return mapAudioError(aceiteErro);

  const chave = typeof parsed.data.chave === "string" ? parsed.data.chave : "";
  if (!isGuestbookAudioKey(eventId, chave)) {
    return errorResponse(422, "recado.chave_do_cliente", "A chave de storage não vem do cliente");
  }

  const mime = typeof parsed.data.mime === "string" ? parsed.data.mime : "";
  const mimeNormalizado = normalizeGuestbookAudioMime(mime);
  if (!mimeNormalizado) {
    return mapAudioError({ code: "recado.audio_tipo_recusado", details: { recebido: mime } });
  }
  const duracao = durationForUpload(
    typeof parsed.data.duracaoSegundos === "number" ? parsed.data.duracaoSegundos : NaN,
  );
  if (duracao === null) {
    return errorResponse(422, "recado.audio_vazio", "Áudio inválido");
  }

  try {
    const objeto = await inspecionarObjeto(chave);
    if (!objeto) {
      return errorResponse(409, "recado.audio_ausente", "O arquivo ainda não chegou");
    }

    const tamanho = validateGuestbookAudioDeclaration(mimeNormalizado, objeto.bytes, duracao);
    if (tamanho) return mapAudioError(tamanho);

    const conteudo = validateGuestbookAudioContent(mimeNormalizado, objeto.inicio);
    if (conteudo) {
      console.warn("admin.recado_audio.conteudo_recusado", { eventId });
      return mapAudioError(conteudo);
    }

    const recado = await withEvent(getPool(), eventId, async (c) => {
      const existente = await eventGuestbook(c, eventId);
      if (!existente) return null;
      return updateGuestbookAudio(c, {
        eventoId: eventId,
        audio: { chave, duracaoSegundos: duracao },
      });
    });

    if (!recado) {
      return errorResponse(404, "recado.inexistente", "Salve o texto do recado primeiro");
    }

    console.log("admin.recado_audio.confirmado", { accountId: auth.host.accountId, eventId });
    return jsonOk({
      recado: {
        id: recado.id,
        audio: await signGuestbookAudio(recado.audio),
      },
    });
  } catch (e) {
    return unexpectedError("admin.recado_audio.confirm", e);
  }
}
