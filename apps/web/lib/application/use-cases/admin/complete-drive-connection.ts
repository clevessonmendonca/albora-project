/**
 * Use Case: Complete Drive Connection
 *
 * Completa OAuth flow: troca code, cria pasta, salva refresh token.
 */
import type { DriveTokenVault } from "@albora/core";
import { abrirEstadoOAuthDrive, conectarDrive } from "@albora/db";
import type { Pool } from "pg";
import type { DriveClient } from "@/lib/drive-client";
import { ErroDriveApi } from "@/lib/drive-client";

export type CompleteDriveConnectionInput = {
  eventId: string;
  accountId: string;
  eventSlug: string;
  code: string;
  state: string;
  oauthStateSecret: string;
  requestOrigin: string;
};

export type CompleteDriveConnectionResult =
  | {
      ok: true;
      redirectUrl: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      statusCode: number;
    };

function redirectUriDoCallback(origin: string, eventId: string): string {
  return `${origin}/api/admin/events/${eventId}/drive/callback`;
}

export async function completeDriveConnection(
  input: CompleteDriveConnectionInput,
  pool: Pool,
  client: DriveClient,
  vault: DriveTokenVault,
): Promise<CompleteDriveConnectionResult> {
  const estado = abrirEstadoOAuthDrive(input.oauthStateSecret, input.state);
  
  if (!estado || estado.eventId !== input.eventId) {
    console.warn("drive_connect_fail", { eventId: input.eventId, motivo: "state_invalido" });
    return {
      ok: false,
      code: "drive.state_invalido",
      message: "Conexão com o Drive expirou ou é inválida",
      statusCode: 409,
    };
  }
  
  if (estado.accountId !== input.accountId) {
    console.warn("drive_connect_fail", { eventId: input.eventId, motivo: "conta_divergente" });
    return {
      ok: false,
      code: "drive.conta_divergente",
      message: "Sessão não confere com quem iniciou a conexão",
      statusCode: 403,
    };
  }

  try {
    const tokens = await client.exchangeCode(input.code, redirectUriDoCallback(input.requestOrigin, input.eventId));
    const pasta = await client.createFolder(tokens.accessToken, `Álbum — ${input.eventSlug} — Albora`);
    const about = await client.getAbout(tokens.accessToken);

    await conectarDrive(pool, vault, {
      eventId: input.eventId,
      accountId: input.accountId,
      driveFolderId: pasta.folderId,
      driveAccountEmail: about.email,
      refreshToken: tokens.refreshToken,
    });

    console.log("drive_connect_ok", { eventId: input.eventId });
    
    return {
      ok: true,
      redirectUrl: `${input.requestOrigin}/admin/e/${input.eventId}/album?driveConectado=1`,
    };
  } catch (e) {
    const codigo = e instanceof ErroDriveApi ? e.code : "erro_desconhecido";
    console.warn("drive_connect_fail", { eventId: input.eventId, motivo: codigo });
    return {
      ok: false,
      code: "drive.conexao_falhou",
      message: "Não foi possível conectar ao Drive agora",
      statusCode: 502,
    };
  }
}
