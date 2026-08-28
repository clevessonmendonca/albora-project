import type { Pool, PoolClient } from "pg";
import type { DriveTokenVault } from "@albora/core";
import { comEvento } from "./event";

export type DriveConnectionStatus = "conectado" | "expirado" | "revogado";

export type DriveConnection = {
  eventId: string;
  accountId: string;
  status: DriveConnectionStatus;
  driveFolderId: string;
  driveAccountEmail: string | null;
  connectedAt: Date;
  revokedAt: Date | null;
};

type Linha = {
  event_id: string;
  account_id: string;
  status: DriveConnectionStatus;
  drive_folder_id: string;
  drive_account_email: string | null;
  connected_at: Date;
  revoked_at: Date | null;
};

function deLinha(l: Linha): DriveConnection {
  return {
    eventId: l.event_id,
    accountId: l.account_id,
    status: l.status,
    driveFolderId: l.drive_folder_id,
    driveAccountEmail: l.drive_account_email,
    connectedAt: l.connected_at,
    revokedAt: l.revoked_at,
  };
}

/** vault.seal antes do INSERT — o refresh token nunca entra no banco em claro. */
export async function conectarDrive(
  pool: Pool,
  vault: DriveTokenVault,
  entrada: {
    eventId: string;
    accountId: string;
    driveFolderId: string;
    driveAccountEmail: string | null;
    refreshToken: string;
  },
): Promise<DriveConnection> {
  const selado = await vault.seal(entrada.refreshToken);

  return comEvento(pool, entrada.eventId, async (c) => {
    const { rows } = await c.query<Linha>(
      `INSERT INTO drive_connections
         (event_id, account_id, status, drive_folder_id, drive_account_email,
          refresh_ciphertext, refresh_iv, refresh_tag, key_version, connected_at, revoked_at)
       VALUES ($1, $2, 'conectado', $3, $4, $5, $6, $7, $8, now(), NULL)
       ON CONFLICT (event_id) DO UPDATE SET
         account_id = EXCLUDED.account_id,
         status = 'conectado',
         drive_folder_id = EXCLUDED.drive_folder_id,
         drive_account_email = EXCLUDED.drive_account_email,
         refresh_ciphertext = EXCLUDED.refresh_ciphertext,
         refresh_iv = EXCLUDED.refresh_iv,
         refresh_tag = EXCLUDED.refresh_tag,
         key_version = EXCLUDED.key_version,
         connected_at = now(),
         revoked_at = NULL
       RETURNING event_id, account_id, status, drive_folder_id, drive_account_email, connected_at, revoked_at`,
      [
        entrada.eventId,
        entrada.accountId,
        entrada.driveFolderId,
        entrada.driveAccountEmail,
        Buffer.from(selado.ciphertext, "base64"),
        Buffer.from(selado.iv, "base64"),
        Buffer.from(selado.tag, "base64"),
        selado.keyVersion,
      ],
    );
    return deLinha(rows[0]!);
  });
}

export async function conexaoDrive(pool: Pool, eventId: string): Promise<DriveConnection | null> {
  return comEvento(pool, eventId, async (c) => {
    const { rows } = await c.query<Linha>(
      `SELECT event_id, account_id, status, drive_folder_id, drive_account_email, connected_at, revoked_at
         FROM drive_connections WHERE event_id = $1`,
      [eventId],
    );
    const l = rows[0];
    return l ? deLinha(l) : null;
  });
}

/** Abre o refresh token para uso imediato (troca por access token) — nunca guardado, só recalculado por request. */
export async function refreshTokenDoEvento(
  pool: Pool,
  vault: DriveTokenVault,
  eventId: string,
): Promise<string | null> {
  return comEvento(pool, eventId, async (c) => {
    const { rows } = await c.query<{
      refresh_ciphertext: Buffer;
      refresh_iv: Buffer;
      refresh_tag: Buffer;
      key_version: number;
      status: DriveConnectionStatus;
    }>(
      `SELECT refresh_ciphertext, refresh_iv, refresh_tag, key_version, status
         FROM drive_connections WHERE event_id = $1`,
      [eventId],
    );
    const l = rows[0];
    if (!l || l.status !== "conectado") return null;

    return vault.open({
      ciphertext: l.refresh_ciphertext.toString("base64"),
      iv: l.refresh_iv.toString("base64"),
      tag: l.refresh_tag.toString("base64"),
      keyVersion: l.key_version,
    });
  });
}

/** Refresh falhou (`invalid_grant`) — detectado, nunca silencioso: o admin passa a mostrar "reconecte". */
export async function marcarDriveExpirado(pool: Pool, eventId: string): Promise<void> {
  await comEvento(pool, eventId, (c) =>
    c.query("UPDATE drive_connections SET status = 'expirado' WHERE event_id = $1", [eventId]),
  );
}

export async function revogarDrive(pool: Pool, eventId: string): Promise<void> {
  await comEvento(pool, eventId, (c) =>
    c.query(
      "UPDATE drive_connections SET status = 'revogado', revoked_at = now() WHERE event_id = $1",
      [eventId],
    ),
  );
}

/** Variante para caminhos que já estão dentro de uma transação de evento (ex.: purge do D365). */
export async function revogarDriveNaTransacao(cliente: PoolClient, eventId: string): Promise<void> {
  await cliente.query(
    "UPDATE drive_connections SET status = 'revogado', revoked_at = now() WHERE event_id = $1 AND status <> 'revogado'",
    [eventId],
  );
}
