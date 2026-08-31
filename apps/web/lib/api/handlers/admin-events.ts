import {
  criarEvento,
  emitirMagicLink,
  ErroContaDoCasalInvalida,
  ErroSemAcessoAoFornecedor,
  recordProductEvent,
  roleForAccountOnVendor,
  VALIDADE_MAGIC_LINK_MINUTOS,
} from "@albora/db";
import { FUSO_PADRAO, fusoIanaValido, instanteLocalNoFuso } from "@albora/core";
import { PACKS } from "@albora/packs";
import { parseMissionKeys } from "@/features/admin/lib/mission-keys";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { consume } from "@/lib/rate-limit-store";

type Body = {
  packId?: unknown;
  comecaEm?: unknown;
  terminaEm?: unknown;
  timezone?: unknown;
  expectedGuests?: unknown;
  identityTokens?: unknown;
  missoes?: unknown;
  telaoModelos?: unknown;
  title?: unknown;
  vendorId?: unknown;
  coupleEmail?: unknown;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asDate(v: unknown, fuso: string): Date | null {
  if (typeof v !== "string") return null;
  return instanteLocalNoFuso(v, fuso);
}

/** Cria evento (spec 009): conta da sessão de host, nunca do corpo; `packId` validado antes do banco (422, não 500 de FK); `coupleEmail` ≠ conta logada (guard + defesa em `criarEvento`); magic link entregue por e-mail, nunca no corpo. */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para criar um evento",
  });
  if (auth instanceof Response) return auth;

  const limit = consume(`admin_eventos:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;
  const body = parsed.data;

  const packId = typeof body.packId === "string" ? body.packId : "";
  if (!(packId in PACKS)) {
    return errorResponse(422, "validation_error", "Pack inválido", { campos: ["packId"] });
  }

  let timezone = FUSO_PADRAO;
  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string" || !fusoIanaValido(body.timezone)) {
      return errorResponse(422, "validation_error", "Fuso horário inválido", {
        campos: ["timezone"],
      });
    }
    timezone = body.timezone;
  }

  const comecaEm = asDate(body.comecaEm, timezone);
  const terminaEm = asDate(body.terminaEm, timezone);
  if (!comecaEm || !terminaEm || terminaEm <= comecaEm) {
    return errorResponse(422, "validation_error", "Datas inválidas", {
      campos: ["comecaEm", "terminaEm"],
    });
  }

  let expectedGuests = 150;
  if (body.expectedGuests !== undefined) {
    if (typeof body.expectedGuests !== "number" || !Number.isFinite(body.expectedGuests)) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
    expectedGuests = Math.trunc(body.expectedGuests);
    if (expectedGuests <= 0) {
      return errorResponse(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
  }

  let identityTokens: Record<string, unknown> = {};
  if (body.identityTokens !== undefined) {
    if (
      typeof body.identityTokens !== "object" ||
      body.identityTokens === null ||
      Array.isArray(body.identityTokens)
    ) {
      return errorResponse(422, "validation_error", "Identidade inválida", {
        campos: ["identityTokens"],
      });
    }
    identityTokens = body.identityTokens as Record<string, unknown>;
  }

  if (Array.isArray(body.telaoModelos) && body.telaoModelos.every((m) => typeof m === "string")) {
    identityTokens = { ...identityTokens, telaoModelos: body.telaoModelos };
  }

  let missoes: string[] | undefined;
  if (body.missoes !== undefined) {
    const pack = PACKS[packId]!;
    const parsedKeys = parseMissionKeys(pack, body.missoes);
    if (!parsedKeys) {
      return errorResponse(422, "validation_error", "Missões inválidas", { campos: ["missoes"] });
    }
    missoes = parsedKeys;
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim().slice(0, 120)
      : null;

  let vendorId: string | undefined;
  let coupleEmail = "";
  if (body.vendorId !== undefined) {
    if (typeof body.vendorId !== "string" || !UUID_RE.test(body.vendorId)) {
      return errorResponse(422, "validation_error", "Fornecedor inválido", { campos: ["vendorId"] });
    }
    vendorId = body.vendorId;

    coupleEmail = typeof body.coupleEmail === "string" ? body.coupleEmail.trim() : "";
    if (!EMAIL.test(coupleEmail)) {
      return errorResponse(422, "validation_error", "E-mail do casal inválido", {
        campos: ["coupleEmail"],
      });
    }

    // Porta na borda, além da que `criarEvento` reconfere em `vendor_members` — só admin/staff do fornecedor cria evento sob ele; checa ANTES de emitir magic link, recusa não deve criar conta.
    const vendorRole = await roleForAccountOnVendor(getPool(), auth.host.accountId, vendorId);
    if (vendorRole !== "admin" && vendorRole !== "staff") {
      return errorResponse(403, "vendor.no_access", "Conta sem acesso a este fornecedor");
    }
  }

  try {
    // Discriminado junto: só existe se `vendorId` existe, e sempre com `coupleAccountId` — nunca `vendorId` sem dono resolvido chegando a `criarEvento`.
    let vendorExtras: { vendorId: string; coupleAccountId: string } | undefined;
    let magicLinkToken: string | undefined;
    if (vendorId !== undefined) {
      const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
      const magicLink = await emitirMagicLink(getPool(), config().sessionSecret, coupleEmail, expiresAt);

      // Casal precisa ser conta DIFERENTE de quem está autenticado — se o membro do fornecedor usar o próprio e-mail, ele nasceria owner por coincidência; `criarEvento` já recusa isso em profundidade, mas aqui rejeita ANTES de criar o evento (magic link já emitido é idempotente/inofensivo).
      if (magicLink.accountId === auth.host.accountId) {
        return errorResponse(
          422,
          "validation_error",
          "O e-mail do casal não pode ser o seu — você entra como cerimonialista, o casal é o dono.",
          { campos: ["coupleEmail"] },
        );
      }

      vendorExtras = { vendorId, coupleAccountId: magicLink.accountId };
      magicLinkToken = magicLink.token;
      if (magicLink.isNewAccount) {
        void recordProductEvent(getPool(), "account_created");
      }
    }

    const input = {
      accountId: auth.host.accountId,
      packId,
      comecaEm,
      terminaEm,
      expectedGuests,
      identityTokens,
      fuso: timezone,
      title,
      ...(missoes !== undefined ? { missoes } : {}),
      ...(vendorExtras ?? {}),
    };
    const { eventoId, slug } = await criarEvento(getPool(), input);

    void recordProductEvent(getPool(), "event_created");

    if (vendorId !== undefined && magicLinkToken !== undefined) {
      const origin = new URL(req.url).origin;
      const link = `${origin}/admin/sign-in?m=${magicLinkToken}&next=${encodeURIComponent(`/admin/e/${eventoId}`)}`;

      void sendHostEmail({
        to: coupleEmail,
        subject: "Seu evento na Albora está pronto",
        text: [
          "Um fornecedor criou o painel do seu evento na Albora.",
          "",
          "Para gerenciar (ZIP das fotos, dados de convidados, controles do telão), abra este link (válido por poucos minutos):",
          "",
          link,
          "",
          "Se você não esperava isso, ignore este e-mail.",
        ].join("\n"),
      });
    }

    console.log("admin.evento_criado", {
      accountId: auth.host.accountId,
      eventoId,
      sobFornecedor: vendorId !== undefined,
    });

    return jsonOk({ eventoId, slug });
  } catch (e) {
    if (e instanceof ErroSemAcessoAoFornecedor) {
      return errorResponse(403, "vendor.no_access", "Conta sem acesso a este fornecedor");
    }
    if (e instanceof ErroContaDoCasalInvalida) {
      return errorResponse(422, "validation_error", "E-mail do casal inválido", {
        campos: ["coupleEmail"],
      });
    }
    return unexpectedError("admin.eventos", e);
  }
}
