import {
  addEventMember,
  comEvento,
  emitirMagicLink,
  listEventMembers,
  type EventMemberRole,
  VALIDADE_MAGIC_LINK_MINUTOS,
} from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  COUPLE_HOST_ROLES,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PostBody = { email?: unknown; role?: unknown };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const check = await requireHostEventRole(auth.host.accountId, eventId, COUPLE_HOST_ROLES);
  if (check instanceof Response) return check;

  try {
    const members = await listEventMembers(getPool(), auth.host.accountId, eventId);
    return jsonOk({ members });
  } catch (e) {
    return unexpectedError("admin.members.list", e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const check = await requireHostEventRole(auth.host.accountId, eventId, COUPLE_HOST_ROLES);
  if (check instanceof Response) return check;

  const limite = consume(`admin_invite:${auth.host.accountId}`, 10, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<PostBody>(req);
  if (parsed instanceof Response) return parsed;

  const email = typeof parsed.data.email === "string" ? parsed.data.email.trim() : "";
  if (!EMAIL.test(email)) {
    return errorResponse(422, "validation_error", "E-mail inválido", { campos: ["email"] });
  }

  const role = parsed.data.role;
  if (role !== "couple" && role !== "planner") {
    return errorResponse(422, "validation_error", "Papel inválido", { campos: ["role"] });
  }

  try {
    const pool = getPool();
    const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
    const { token, accountId } = await emitirMagicLink(
      pool,
      config().sessionSecret,
      email,
      expiresAt,
    );

    await comEvento(pool, eventId, async (c) => {
      await addEventMember(c, {
        eventId,
        accountId,
        role: role as EventMemberRole,
      });
    });

    const origin = new URL(req.url).origin;
    const link = `${origin}/admin/sign-in?m=${token}&next=${encodeURIComponent(`/admin/e/${eventId}`)}`;

    void sendHostEmail({
      to: email,
      subject:
        role === "couple"
          ? "Você foi convidado para gerenciar um evento na Albora"
          : "Você foi adicionado como cerimonialista na Albora",
      text: [
        role === "couple"
          ? "Você foi convidado para gerenciar um evento."
          : "Você foi adicionado como cerimonialista de um evento.",
        "",
        "Para acessar o painel, abra este link (válido por poucos minutos):",
        "",
        link,
        "",
        "Se você não pediu isso, ignore este e-mail.",
      ].join("\n"),
    });

    console.log("admin.member_invited", { role });

    const members = await listEventMembers(pool, auth.host.accountId, eventId);
    return jsonOk({ members });
  } catch (e) {
    return unexpectedError("admin.members.invite", e);
  }
}
