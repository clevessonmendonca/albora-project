/**
 * Use Case: Process Drive Export Jobs
 *
 * Processa jobs de exportação para Google Drive (spec §9).
 */
import type { Pool } from "pg";
import type { DriveExportTickMessage } from "@/lib/drive-export-queue";
import { parseDriveExportTickMessage } from "@/lib/drive-export-tick-message";
import { sweepDriveExportJobs, tickDriveExportJob } from "@/lib/drive-export-scheduler";

export type ProcessDriveExportInput =
  | {
      mode: "tick";
      message: DriveExportTickMessage;
    }
  | {
      mode: "sweep";
    };

export type ProcessDriveExportOutput =
  | {
      modo: "tick";
      resultado: Awaited<ReturnType<typeof tickDriveExportJob>>;
    }
  | {
      modo: "sweep";
      varredura: Awaited<ReturnType<typeof sweepDriveExportJobs>>;
    };

export async function processDriveExport(
  input: ProcessDriveExportInput,
  pool: Pool,
): Promise<ProcessDriveExportOutput> {
  if (input.mode === "tick") {
    const resultado = await tickDriveExportJob(pool, input.message);
    return { modo: "tick", resultado };
  }

  const varredura = await sweepDriveExportJobs(pool);
  return { modo: "sweep", ...varredura };
}

export function parseDriveExportMessage(
  data: Record<string, unknown>,
): DriveExportTickMessage | null {
  return parseDriveExportTickMessage(data);
}
