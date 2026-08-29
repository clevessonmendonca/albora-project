import pg from "pg";

export type ProbeResult = { ok: true } | { ok: false; code: string };

export async function probeDatabase(): Promise<ProbeResult> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { ok: false, code: "database.url_ausente" };
  }

  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return { ok: true };
  } catch {
    return { ok: false, code: "database.indisponivel" };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export function livenessBody() {
  return {
    status: "alive" as const,
    service: "albora",
    timestamp: new Date().toISOString(),
  };
}
