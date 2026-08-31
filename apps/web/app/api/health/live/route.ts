import { livenessBody } from "@/lib/infrastructure/health/probes";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(livenessBody(), {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
