import { fotosPorMissao, fotosPorHora, withEvent } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import {
  ADMIN_SESSION_REQUIRED,
  jsonOk,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const [missoes, horas] = await withEvent(getPool(), eventId, (c) =>
      Promise.all([
        fotosPorMissao(c, eventId),
        fotosPorHora(c, eventId, owned.evento.fuso ?? "UTC"),
      ]),
    );

    const pack = owned.evento.packId ? (PACKS[owned.evento.packId] ?? null) : null;

    const missaoSer = missoes.map((m) => ({
      challengeId: m.challengeId,
      titulo:
        m.customTitle ??
        (pack && m.titleKey ? resolvePackText(pack, m.titleKey) : (m.titleKey ?? "")),
      emoji: m.emoji,
      fotos: m.fotos,
    }));

    return jsonOk({ missoes: missaoSer, horas });
  } catch (e) {
    return unexpectedError("admin.insights", e);
  }
}
