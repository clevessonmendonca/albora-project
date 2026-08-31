import { probeDatabase } from "@/lib/infrastructure/health/probes";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await probeDatabase();
  const ready = database.ok;
  const status = ready ? 200 : 503;

  return Response.json(
    {
      status: ready ? "ready" : "not_ready",
      database: database.ok ? "ok" : database.code,
      timestamp: new Date().toISOString(),
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}
