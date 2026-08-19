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

/**
 * O anfitrião cria um evento (spec 009).
 *
 * 🔴 A conta vem da **sessão de host**, nunca do corpo — é `comConta` dentro de
 * `criarEvento` que prende a linha a ela. O `packId` é conferido contra o
 * conjunto fechado do registro de packs antes de tocar no banco: pack inválido
 * é 422, não um 500 de violação de FK.
 *
 * `vendorId` (wizard do portal do fornecedor, spec-canal-fornecedor §2) exige
 * `coupleEmail` — o casal, nunca o fornecedor, é quem vira dono do evento
 * (`canManageCoupleOnly` é do casal, CLAUDE.md/spec §2). `roleForAccountOnVendor`
 * confere admin/staff no fornecedor ANTES de qualquer trabalho — `criarEvento`
 * reconfere `vendor_members` na mesma transação, defesa em profundidade, nunca
 * a única porta. `emitirMagicLink` resolve-ou-cria a conta do casal pelo
 * e-mail; o token vira o `coupleAccountId` que `criarEvento` grava como dono
 * — o membro do fornecedor entra como `planner`. O magic link é **entregue por
 * e-mail** ao casal, nunca devolvido no corpo desta resposta: casal é host, e
 * host usa magic link por desenho (não é a regra do convidado, que nunca
 * recebe e-mail). `ErroSemAcessoAoFornecedor`/`ErroContaDoCasalInvalida` viram
 * 403/422, nunca um 500.
 *
 * 🔴 O casal precisa ser uma conta DIFERENTE de quem está autenticado — se o
 * membro do fornecedor usar o próprio e-mail como `coupleEmail`,
 * `emitirMagicLink` resolveria pra conta dele mesmo, e sem este guard ele
 * nasceria owner (com `canManageCoupleOnly`) por coincidência de e-mail.
 * Recusado aqui (422) e de novo em `criarEvento` (defesa em profundidade).
 */
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

    // Porta na borda, além da que `criarEvento` reconfere em `vendor_members`:
    // só admin/staff daquele fornecedor cria evento "sob" ele. Checa ANTES de
    // emitir magic link nenhum — recusa não deve criar conta de ninguém.
    const vendorRole = await roleForAccountOnVendor(getPool(), auth.host.accountId, vendorId);
    if (vendorRole !== "admin" && vendorRole !== "staff") {
      return errorResponse(403, "vendor.no_access", "Conta sem acesso a este fornecedor");
    }
  }

  try {
    // Discriminado junto: só existe se `vendorId` existe, e sempre com
    // `coupleAccountId` — nunca um `vendorId` sem dono resolvido chegando a
    // `criarEvento`.
    let vendorExtras: { vendorId: string; coupleAccountId: string } | undefined;
    let magicLinkToken: string | undefined;
    if (vendorId !== undefined) {
      const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
      const magicLink = await emitirMagicLink(getPool(), config().sessionSecret, coupleEmail, expiresAt);

      // O casal precisa ser uma conta DIFERENTE de quem está autenticado —
      // se o membro do fornecedor usar o próprio e-mail, `emitirMagicLink`
      // resolveria pra conta dele mesmo, e ele nasceria owner (com
      // `canManageCoupleOnly`) por coincidência de e-mail. `criarEvento` já
      // recusa isso como defesa em profundidade, mas aqui rejeita ANTES de
      // gastar o trabalho de criar o evento — a conta/magic link já emitidos
      // são inofensivos (idempotentes, nunca enviados).
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
