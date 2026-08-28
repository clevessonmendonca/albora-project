import { withEvent } from "@albora/db";
import { jsonOk, errorResponse, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Contagem pública por slug (impresso nas mesas) — dado agregado, sem PII. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const pool = getPool();

    const { rows } = await pool.query<{ event_id: string }>(
      "SELECT event_id FROM event_slugs WHERE slug = $1 AND active = true",
      [slug],
    );

    const eventoId = rows[0]?.event_id;
    if (!eventoId) {
      return errorResponse(404, "evento.ausente", "Evento não encontrado");
    }

    const { fotos, convidados } = await withEvent(pool, eventoId, async (c) => {
      const { rows: r } = await c.query<{ fotos: number; convidados: number }>(
        `SELECT COUNT(*)::int AS fotos,
                COUNT(DISTINCT session_id)::int AS convidados
           FROM uploads
          WHERE event_id = $1 AND state = 'published'`,
        [eventoId],
      );
      return r[0] ?? { fotos: 0, convidados: 0 };
    });

    return jsonOk({ fotos, convidados });
  } catch (e) {
    return unexpectedError("e.stats", e);
  }
}
