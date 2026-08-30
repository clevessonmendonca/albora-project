import { getPool } from "@/lib/db";

export type ProbeResult = { ok: true } | { ok: false; code: string };

export async function probeDatabase(): Promise<ProbeResult> {
  try {
    await getPool().query("SELECT 1");
    return { ok: true };
  } catch {
    return { ok: false, code: "database.indisponivel" };
  }
}

export function livenessBody() {
  return {
    status: "alive" as const,
    service: "albora",
    timestamp: new Date().toISOString(),
  };
}
