/**
 * Use Case: Disconnect Drive
 *
 * Revoga refresh token no Google e marca conexão como revogada.
 */
import type { DriveTokenVault } from "@albora/core";
import { refreshTokenDoEvento, revogarDrive } from "@albora/db";
import type { Pool } from "pg";
import type { DriveClient } from "@/lib/drive-client";
import { ErroDriveApi } from "@/lib/drive-client";

export type DisconnectDriveInput = {
  eventId: string;
};

export type DisconnectDriveResult =
  | {
      ok: true;
      desconectado: boolean;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function disconnectDrive(
  input: DisconnectDriveInput,
  pool: Pool,
  client: DriveClient,
  vault: DriveTokenVault,
): Promise<DisconnectDriveResult> {
  const refreshToken = await refreshTokenDoEvento(pool, vault, input.eventId);
  
  if (!refreshToken) {
    return {
      ok: false,
      code: "drive.nao_conectado",
      message: "Não há conexão de Drive para desconectar",
    };
  }

  try {
    await client.revoke(refreshToken);
  } catch (e) {
    const codigo = e instanceof ErroDriveApi ? e.code : "erro_desconhecido";
    console.warn("drive.revoke_falhou", { eventId: input.eventId, motivo: codigo });
  }

  await revogarDrive(pool, input.eventId);
  console.log("drive.disconnect", { eventId: input.eventId });
  
  return { ok: true, desconectado: true };
}
