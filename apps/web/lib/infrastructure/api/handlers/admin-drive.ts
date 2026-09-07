import {
  ADMIN_SESSION_REQUIRED,
  COUPLE_HOST_ROLES,
  errorResponse,
  jsonOk,
  requireConfig,
  requireDriveConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { config } from "@/lib/config";
import { driveConfig } from "@/lib/drive-config";
import { getDriveClient, getDriveVault } from "@/lib/drive";
import type { DriveClient } from "@/lib/drive-client";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import {
  requestDriveStepUp,
  initiateDriveConnection,
  completeDriveConnection,
  getDriveConnectionStatus,
  disconnectDrive,
} from "@/lib/application/use-cases/admin";
import {
  driveConnectSchema,
  driveCallbackSchema,
} from "@/lib/infrastructure/api/validators";

async function requireOwnedEvent(req: Request, eventId: string) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  if (!UUID_RE.test(eventId)) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const owned = await requireHostEventRole(auth.host.accountId, eventId, COUPLE_HOST_ROLES);
  if (owned instanceof Response) return owned;

  return { host: auth.host, evento: owned.evento };
}

/** Pede o segundo fator antes da primeira conexão (spec §1.3) — mesmo padrão do ZIP (spec 009), ação distinta. */
export async function postDriveReauth(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const limite = consume(`admin_drive_reauth:${auth.host.accountId}`, 5, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const resultado = await requestDriveStepUp(
      {
        eventId,
        accountId: auth.host.accountId,
        hostEmail: auth.host.email,
        sessionSecret: config().sessionSecret,
        requestOrigin: new URL(req.url).origin,
        isDev: process.env.APP_ENV === "dev",
      },
      getPool(),
    );

    return jsonOk(resultado.link ? { enviado: true, link: resultado.link } : { enviado: true });
  } catch (e) {
    return unexpectedError("admin.drive.reauth", e);
  }
}

/** Consome o step-up e redireciona para o consentimento do Google (spec §1.3, passos 3-4). */
export async function getDriveConnect(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const cfgErr = requireDriveConfig("admin.drive.connect");
  if (cfgErr) return cfgErr;

  const confirmacao = new URL(req.url).searchParams.get("confirmacao") ?? "";
  const validado = driveConnectSchema.safeParse({ confirmacao });
  if (!validado.success) {
    return errorResponse(422, "validation_error", "Confirme a conexão", { campos: ["confirmacao"] });
  }

  try {
    const { oauthClientId, oauthStateSecret } = driveConfig();
    const resultado = await initiateDriveConnection(
      {
        eventId,
        accountId: auth.host.accountId,
        sessionSecret: config().sessionSecret,
        oauthClientId,
        oauthStateSecret,
        requestOrigin: new URL(req.url).origin,
        ...validado.data,
      },
      getPool(),
    );

    if (!resultado.ok) {
      return errorResponse(409, resultado.code, resultado.message);
    }

    return Response.redirect(resultado.redirectUrl, 302);
  } catch (e) {
    return unexpectedError("admin.drive.connect", e);
  }
}

export type DriveCallbackDeps = { client: DriveClient };

/** Troca o code, cria a pasta, sela o refresh token, grava a conexão (spec §1.3, passo 5). */
export async function getDriveCallback(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
  deps?: DriveCallbackDeps,
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const cfgErr = requireDriveConfig("admin.drive.callback");
  if (cfgErr) return cfgErr;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const validado = driveCallbackSchema.safeParse({ code, state });
  if (!validado.success) {
    console.warn("drive_connect_fail", { eventId, motivo: "sem_code_ou_state" });
    return errorResponse(400, "drive.callback_invalido", "Conexão com o Drive falhou");
  }

  try {
    const { oauthStateSecret } = driveConfig();
    const client = deps?.client ?? getDriveClient();
    const resultado = await completeDriveConnection(
      {
        eventId,
        accountId: auth.host.accountId,
        eventSlug: auth.evento.slug,
        oauthStateSecret,
        requestOrigin: url.origin,
        ...validado.data,
      },
      getPool(),
      client,
      getDriveVault(),
    );

    if (!resultado.ok) {
      return errorResponse(resultado.statusCode, resultado.code, resultado.message);
    }

    return Response.redirect(resultado.redirectUrl, 302);
  } catch (e) {
    return unexpectedError("admin.drive.callback", e);
  }
}

/** Status da conexão para o admin — nunca expõe o refresh token, só e-mail (PII de exibição) e status. */
export async function getDriveStatus(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  try {
    const resultado = await getDriveConnectionStatus(
      {
        eventId,
        eventoTerminaEm: auth.evento.terminaEm,
      },
      getPool(),
    );

    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("admin.drive.status", e);
  }
}

export type DriveDisconnectDeps = { client: DriveClient };

/** Revoga no Google e marca revogado — histórico fica (spec §1.6). */
export async function postDriveDisconnect(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
  deps?: DriveDisconnectDeps,
) {
  const { eventId } = await params;
  const auth = await requireOwnedEvent(req, eventId);
  if (auth instanceof Response) return auth;

  const cfgErr = requireDriveConfig("admin.drive.disconnect");
  if (cfgErr) return cfgErr;

  try {
    const client = deps?.client ?? getDriveClient();
    const resultado = await disconnectDrive(
      { eventId },
      getPool(),
      client,
      getDriveVault(),
    );

    if (!resultado.ok) {
      return errorResponse(404, resultado.code, resultado.message);
    }

    return jsonOk({ desconectado: resultado.desconectado });
  } catch (e) {
    return unexpectedError("admin.drive.disconnect", e);
  }
}
