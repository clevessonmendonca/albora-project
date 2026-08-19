import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * O `state` do handshake OAuth do Drive (spec drive-export §1.3).
 *
 * Diferente do token de sessão do convidado (`token.ts`), este carrega o
 * payload dentro de si — `eventId`/`accountId`/`nonce` — porque o callback é
 * a única porta do fluxo sem cookie de host garantido (o Google pode devolver
 * numa aba nova, num navegador diferente do que abriu o consentimento). A
 * verificação é só HMAC, **sem tocar banco**: um `state` forjado custa
 * microssegundos, nunca uma consulta.
 *
 * Segredo dedicado (`DRIVE_OAUTH_STATE_SECRET`) — nunca o `SESSION_SECRET`
 * do convidado. Comprometer um não expõe o outro (blast radius separado).
 */

const TTL_PADRAO_MS = 10 * 60 * 1000;

export type EstadoOAuthDrive = {
  eventId: string;
  accountId: string;
  nonce: string;
  emitidoEm: number;
};

export function emitirEstadoOAuthDrive(
  segredo: string,
  payload: { eventId: string; accountId: string },
  agora: Date = new Date(),
): string {
  exigirSegredo(segredo);
  const corpo: EstadoOAuthDrive = {
    eventId: payload.eventId,
    accountId: payload.accountId,
    nonce: randomBytes(16).toString("base64url"),
    emitidoEm: agora.getTime(),
  };
  const corpoB64 = Buffer.from(JSON.stringify(corpo), "utf8").toString("base64url");
  const assinatura = assinar(segredo, corpoB64);
  return `${corpoB64}.${assinatura.toString("base64url")}`;
}

/**
 * `null` para: assinatura inválida, formato errado, JSON corrompido, ou TTL
 * vencido. De propósito não distingue qual — um state forjado e um state
 * expirado devem custar o mesmo, e nenhum dos dois toca o banco.
 */
export function abrirEstadoOAuthDrive(
  segredo: string,
  estado: string,
  agora: Date = new Date(),
  ttlMs = TTL_PADRAO_MS,
): EstadoOAuthDrive | null {
  exigirSegredo(segredo);

  const partes = estado.split(".");
  if (partes.length !== 2) return null;
  const [corpoB64, assinaturaB64] = partes as [string, string];

  let apresentada: Buffer;
  try {
    apresentada = Buffer.from(assinaturaB64, "base64url");
  } catch {
    return null;
  }

  const esperada = assinar(segredo, corpoB64);
  if (apresentada.length !== esperada.length || !timingSafeEqual(apresentada, esperada)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(corpoB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!ehPayloadValido(payload)) return null;
  if (agora.getTime() - payload.emitidoEm > ttlMs) return null;
  if (agora.getTime() < payload.emitidoEm) return null;

  return payload;
}

function ehPayloadValido(v: unknown): v is EstadoOAuthDrive {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.eventId === "string" &&
    p.eventId.length > 0 &&
    typeof p.accountId === "string" &&
    p.accountId.length > 0 &&
    typeof p.nonce === "string" &&
    typeof p.emitidoEm === "number"
  );
}

function assinar(segredo: string, corpoB64: string): Buffer {
  return createHmac("sha256", segredo).update(corpoB64).digest();
}

function exigirSegredo(segredo: string): void {
  if (!segredo || segredo.length < 32) {
    throw new ErroSegredoDoEstadoOAuthDrive();
  }
}

export class ErroSegredoDoEstadoOAuthDrive extends Error {
  readonly code = "config.drive_oauth_state_secret_invalido";
  constructor() {
    super("DRIVE_OAUTH_STATE_SECRET ausente ou curto demais (mínimo 32 caracteres)");
  }
}
