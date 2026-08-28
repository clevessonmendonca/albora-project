import { isProductEventName, recordProductEvent } from "@albora/db";
import { errorResponse, jsonOk, parseJsonBody } from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type Body = { name?: unknown; anonId?: unknown; packHint?: unknown };

/** Landing funnel — best effort, sem auth. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  if (!isProductEventName(parsed.data.name)) {
    return errorResponse(422, "validation_error", "Evento inválido", { campos: ["name"] });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = consume(`product:${ip}`, 60, 60, Date.now());
  if (!limit.allowed) {
    return jsonOk({ ok: true });
  }

  const anonId = typeof parsed.data.anonId === "string" ? parsed.data.anonId.slice(0, 64) : null;
  const packHint =
    typeof parsed.data.packHint === "string" ? parsed.data.packHint.slice(0, 40) : null;

  await recordProductEvent(getPool(), parsed.data.name, { anonId, packHint });
  return jsonOk({ ok: true });
}
