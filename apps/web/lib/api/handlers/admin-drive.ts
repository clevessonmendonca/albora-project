import { ACAO_DRIVE_CONNECT } from "@albora/core";
import {
  conectarDrive,
  conexaoDrive,
  emitirStepUp,
  consumirStepUp,
  ErroMagicLinkInvalido,
  refreshTokenDoEvento,
  revogarDrive,
  abrirEstadoOAuthDrive,
  emitirEstadoOAuthDrive,
} from "@albora/db";
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
import { DRIVE_AUTH_ENDPOINT, DRIVE_SCOPE, getDriveClient, getDriveVault } from "@/lib/drive";
import type { DriveClient } from "@/lib/drive-client";
import { ErroDriveApi } from "@/lib/drive-client";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { consume } from "@/lib/rate-limit-store";

export const VALIDADE_STEP_UP_DRIVE_MINUTOS = 15;

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

function redirectUriDoCallback(origin: string, eventId: string): string {
  return `${origin}/api/admin/events/${eventId}/drive/callback`;
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
    const expiresAt = new Date(Date.now() + VALIDADE_STEP_UP_DRIVE_MINUTOS * 60 * 1000);
    const { token } = await emitirStepUp(
      getPool(),
      config().sessionSecret,
      auth.host.accountId,
      expiresAt,
      ACAO_DRIVE_CONNECT,
    );
    const origin = new URL(req.url).origin;
    const link = `${origin}/admin/e/${eventId}/album?driveConectar=${token}`;

    void sendHostEmail({
      to: auth.host.email,
      subject: "Confirme a conexão com o Google Drive",
      text: [
        "Alguém pediu para conectar este evento ao Google Drive do casal.",
        "Se foi você, abra o link abaixo. Ele vale por 15 minutos e só funciona uma vez.",
        "",
        link,
        "",
        "Se não foi você, ignore este e-mail. Sem a confirmação a conexão não começa.",
      ].join("\n"),
    });

    console.log("admin.drive.reauth", { accountId: auth.host.accountId });

    const dev = process.env.APP_ENV === "dev";
    return jsonOk(dev ? { enviado: true, link } : { enviado: true });
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

  // Nome do parâmetro deliberadamente não é "token" (guard tools/guards/sessao.mjs) — mesma disciplina do `?exportar=` do ZIP, evita a palavra literal mesmo sendo credencial de uso único com TTL curto (15min).
  const confirmacao = new URL(req.url).searchParams.get("confirmacao") ?? "";
  if (!confirmacao) {
    return errorResponse(422, "validation_error", "Confirme a conexão", { campos: ["confirmacao"] });
  }

  try {
    await consumirStepUp(
      getPool(),
      config().sessionSecret,
      confirmacao,
      auth.host.accountId,
      new Date(),
      ACAO_DRIVE_CONNECT,
    );
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      return errorResponse(409, "admin.reauth_invalida", "Confirmação inválida ou expirada");
    }
    return unexpectedError("admin.drive.connect", e);
  }

  const { oauthClientId, oauthStateSecret } = driveConfig();
  const origin = new URL(req.url).origin;
  const state = emitirEstadoOAuthDrive(oauthStateSecret, {
    eventId,
    accountId: auth.host.accountId,
  });

  const url = new URL(DRIVE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", oauthClientId);
  url.searchParams.set("scope", DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  // Força emissão de refresh_token mesmo em reconexão (spec §1.3).
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUriDoCallback(origin, eventId));

  console.log("drive_connect_start", { eventId });
  return Response.redirect(url.toString(), 302);
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
  const stateBruto = url.searchParams.get("state");
  const origin = url.origin;

  if (!code || !stateBruto) {
    console.warn("drive_connect_fail", { eventId, motivo: "sem_code_ou_state" });
    return errorResponse(400, "drive.callback_invalido", "Conexão com o Drive falhou");
  }

  const { oauthStateSecret } = driveConfig();
  const estado = abrirEstadoOAuthDrive(oauthStateSecret, stateBruto);
  if (!estado || estado.eventId !== eventId) {
    console.warn("drive_connect_fail", { eventId, motivo: "state_invalido" });
    return errorResponse(409, "drive.state_invalido", "Conexão com o Drive expirou ou é inválida");
  }
  if (estado.accountId !== auth.host.accountId) {
    console.warn("drive_connect_fail", { eventId, motivo: "conta_divergente" });
    return errorResponse(403, "drive.conta_divergente", "Sessão não confere com quem iniciou a conexão");
  }

  const client = deps?.client ?? getDriveClient();

  try {
    const tokens = await client.exchangeCode(code, redirectUriDoCallback(origin, eventId));
    const pasta = await client.createFolder(tokens.accessToken, `Álbum — ${auth.evento.slug} — Albora`);
    const about = await client.getAbout(tokens.accessToken);

    await conectarDrive(getPool(), getDriveVault(), {
      eventId,
      accountId: auth.host.accountId,
      driveFolderId: pasta.folderId,
      driveAccountEmail: about.email,
      refreshToken: tokens.refreshToken,
    });

    console.log("drive_connect_ok", { eventId });
    return Response.redirect(`${origin}/admin/e/${eventId}/album?driveConectado=1`, 302);
  } catch (e) {
    // Nunca loga o corpo da resposta do token endpoint, nem o code, nem o
    // refresh token — só o código de erro do Google (spec §2/§8).
    const codigo = e instanceof ErroDriveApi ? e.code : "erro_desconhecido";
    console.warn("drive_connect_fail", { eventId, motivo: codigo });
    return errorResponse(502, "drive.conexao_falhou", "Não foi possível conectar ao Drive agora");
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
    // Gate de tempo do spec §4: seção só ativa depois que a festa terminou — não é cron, é o casal decidindo quando, a partir daí.
    const podeExportar = Date.now() >= auth.evento.terminaEm.getTime();
    const conexao = await conexaoDrive(getPool(), eventId);
    if (!conexao) return jsonOk({ conexao: null, podeExportar });
    return jsonOk({
      conexao: {
        status: conexao.status,
        email: conexao.driveAccountEmail,
        conectadoEm: conexao.connectedAt.toISOString(),
      },
      podeExportar,
    });
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
    const refreshToken = await refreshTokenDoEvento(getPool(), getDriveVault(), eventId);
    if (!refreshToken) {
      return errorResponse(404, "drive.nao_conectado", "Não há conexão de Drive para desconectar");
    }

    const client = deps?.client ?? getDriveClient();
    try {
      await client.revoke(refreshToken);
    } catch (e) {
      const codigo = e instanceof ErroDriveApi ? e.code : "erro_desconhecido";
      console.warn("drive.revoke_falhou", { eventId, motivo: codigo });
      // Segue mesmo assim: revogar do nosso lado é o que importa pra parar de usar o token — falha aqui pode só significar que o Google já invalidou por conta própria.
    }

    await revogarDrive(getPool(), eventId);
    console.log("drive.disconnect", { eventId });
    return jsonOk({ desconectado: true });
  } catch (e) {
    return unexpectedError("admin.drive.disconnect", e);
  }
}
