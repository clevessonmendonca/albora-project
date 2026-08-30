/**
 * Use Case: Create Event
 *
 * Cria novo evento (com suporte a white-label vendor).
 */
import {
  criarEvento,
  emitirMagicLink,
  ErroContaDoCasalInvalida,
  ErroSemAcessoAoFornecedor,
  recordProductEvent,
  roleForAccountOnVendor,
  VALIDADE_MAGIC_LINK_MINUTOS,
} from "@albora/db";
import { instanteLocalNoFuso } from "@albora/core";
import { PACKS } from "@albora/packs";
import type { Pool } from "pg";
import { parseMissionKeys } from "@/features/admin/lib/mission-keys";
import { sendHostEmail } from "@/lib/email";

export type CreateEventInput = {
  accountId: string;
  sessionSecret: string;
  packId: string;
  comecaEm: string;
  terminaEm: string;
  timezone: string;
  expectedGuests: number;
  identityTokens: Record<string, unknown>;
  missoes?: string[] | undefined;
  telaoModelos?: string[] | undefined;
  title: string | null;
  vendorId?: string | undefined;
  coupleEmail?: string | undefined;
  requestOrigin: string;
};

export type CreateEventResult =
  | {
      ok: true;
      eventoId: string;
      slug: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

export async function createEvent(
  input: CreateEventInput,
  pool: Pool,
): Promise<CreateEventResult> {
  const comecaEm = instanteLocalNoFuso(input.comecaEm, input.timezone);
  const terminaEm = instanteLocalNoFuso(input.terminaEm, input.timezone);

  if (!comecaEm || !terminaEm || terminaEm <= comecaEm) {
    return {
      ok: false,
      code: "validation_error",
      message: "Datas inválidas",
      details: { campos: ["comecaEm", "terminaEm"] },
    };
  }

  let identityTokens = { ...input.identityTokens };
  if (input.telaoModelos && input.telaoModelos.length > 0) {
    identityTokens = { ...identityTokens, telaoModelos: input.telaoModelos };
  }

  let missoes: string[] | undefined;
  if (input.missoes !== undefined) {
    const pack = PACKS[input.packId]!;
    const parsedKeys = parseMissionKeys(pack, input.missoes);
    if (!parsedKeys) {
      return {
        ok: false,
        code: "validation_error",
        message: "Missões inválidas",
        details: { campos: ["missoes"] },
      };
    }
    missoes = parsedKeys;
  }

  let vendorExtras: { vendorId: string; coupleAccountId: string } | undefined;
  let magicLinkToken: string | undefined;
  let coupleEmailResolved = "";

  if (input.vendorId !== undefined) {
    if (!input.coupleEmail) {
      return {
        ok: false,
        code: "validation_error",
        message: "E-mail do casal obrigatório quando há fornecedor",
        details: { campos: ["coupleEmail"] },
      };
    }

    const vendorRole = await roleForAccountOnVendor(pool, input.accountId, input.vendorId);
    if (vendorRole !== "admin" && vendorRole !== "staff") {
      return {
        ok: false,
        code: "vendor.no_access",
        message: "Conta sem acesso a este fornecedor",
      };
    }

    const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
    const magicLink = await emitirMagicLink(pool, input.sessionSecret, input.coupleEmail, expiresAt);

    if (magicLink.accountId === input.accountId) {
      return {
        ok: false,
        code: "validation_error",
        message: "O e-mail do casal não pode ser o seu — você entra como cerimonialista, o casal é o dono.",
        details: { campos: ["coupleEmail"] },
      };
    }

    vendorExtras = { vendorId: input.vendorId, coupleAccountId: magicLink.accountId };
    magicLinkToken = magicLink.token;
    coupleEmailResolved = input.coupleEmail;

    if (magicLink.isNewAccount) {
      void recordProductEvent(pool, "account_created");
    }
  }

  try {
    const createInput = {
      accountId: input.accountId,
      packId: input.packId,
      comecaEm,
      terminaEm,
      expectedGuests: input.expectedGuests,
      identityTokens,
      fuso: input.timezone,
      title: input.title,
      ...(missoes !== undefined ? { missoes } : {}),
      ...(vendorExtras ?? {}),
    };
    const { eventoId, slug } = await criarEvento(pool, createInput);

    void recordProductEvent(pool, "event_created");

    if (input.vendorId !== undefined && magicLinkToken !== undefined) {
      const link = `${input.requestOrigin}/admin/sign-in?m=${magicLinkToken}&next=${encodeURIComponent(`/admin/e/${eventoId}`)}`;

      void sendHostEmail({
        to: coupleEmailResolved,
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
      accountId: input.accountId,
      eventoId,
      sobFornecedor: input.vendorId !== undefined,
    });

    return { ok: true, eventoId, slug };
  } catch (e) {
    if (e instanceof ErroSemAcessoAoFornecedor) {
      return {
        ok: false,
        code: "vendor.no_access",
        message: "Conta sem acesso a este fornecedor",
      };
    }
    if (e instanceof ErroContaDoCasalInvalida) {
      return {
        ok: false,
        code: "validation_error",
        message: "E-mail do casal inválido",
        details: { campos: ["coupleEmail"] },
      };
    }
    throw e;
  }
}
