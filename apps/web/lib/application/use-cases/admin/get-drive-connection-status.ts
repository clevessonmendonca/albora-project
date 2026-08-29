/**
 * Use Case: Get Drive Connection Status
 *
 * Retorna status da conexão com Google Drive.
 */
import { conexaoDrive } from "@albora/db";
import type { Pool } from "pg";

export type GetDriveStatusInput = {
  eventId: string;
  eventoTerminaEm: Date;
};

export type GetDriveStatusOutput = {
  conexao: {
    status: string;
    email: string;
    conectadoEm: string;
  } | null;
  podeExportar: boolean;
};

export async function getDriveConnectionStatus(
  input: GetDriveStatusInput,
  pool: Pool,
): Promise<GetDriveStatusOutput> {
  const podeExportar = Date.now() >= input.eventoTerminaEm.getTime();
  const conexao = await conexaoDrive(pool, input.eventId);
  
  if (!conexao) {
    return { conexao: null, podeExportar };
  }
  
  return {
    conexao: {
      status: conexao.status,
      email: conexao.driveAccountEmail ?? "",
      conectadoEm: conexao.connectedAt.toISOString(),
    },
    podeExportar,
  };
}
