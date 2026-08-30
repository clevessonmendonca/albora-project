import { z } from "zod";
import { jsonOk, parseJsonBody } from "@/lib/api";
import { consume } from "@/lib/infrastructure/background/rate-limit-store";

export const dynamic = "force-dynamic";

const WebVitalPayloadSchema = z.object({
  name: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
  value: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number(),
  id: z.string(),
  navigationType: z.enum(["navigate", "reload", "back-forward", "prerender"]),
  eventId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  timestamp: z.number(),
});

/** Coleta de Web Vitals — best effort, sem auth; sempre responde 200 para nunca quebrar o cliente. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limit = consume(`web-vitals:${ip}`, 120, 60, Date.now());
    if (!limit.allowed) return jsonOk({ ok: true });

    const parsed = await parseJsonBody<Record<string, unknown>>(req);
    if (parsed instanceof Response) return jsonOk({ ok: true });

    const payload = WebVitalPayloadSchema.safeParse(parsed.data);
    if (!payload.success) return jsonOk({ ok: true });

    // Sem PII: nome/valor/rating da métrica e ids opacos de evento/sessão.
    console.log("web_vitals.received", {
      name: payload.data.name,
      value: Math.round(payload.data.value),
      rating: payload.data.rating,
      eventId: payload.data.eventId,
      sessionId: payload.data.sessionId,
    });

    return jsonOk({ ok: true });
  } catch {
    return jsonOk({ ok: true });
  }
}
