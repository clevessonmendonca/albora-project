import { UUID_RE } from "@/lib/api/constants";

export type DriveExportTickMessage = {
  eventId: string;
  jobId: string;
  accountId: string;
};

export function parseDriveExportTickMessage(corpo: unknown): DriveExportTickMessage | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = corpo as Record<string, unknown>;
  if (
    typeof c.eventId !== "string" ||
    typeof c.jobId !== "string" ||
    typeof c.accountId !== "string" ||
    !UUID_RE.test(c.eventId) ||
    !UUID_RE.test(c.jobId) ||
    !UUID_RE.test(c.accountId)
  ) {
    return null;
  }
  return { eventId: c.eventId, jobId: c.jobId, accountId: c.accountId };
}
