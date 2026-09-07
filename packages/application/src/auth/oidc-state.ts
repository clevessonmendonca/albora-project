import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

export type OidcSurface = "host" | "staff" | "guest";

export type OidcStatePayload = {
  surface: OidcSurface;
  nonce: string;
  returnTo: string;
  eventId?: string;
  guestSessionId?: string;
};

export type IssueOidcStateInput = {
  surface: OidcSurface;
  returnTo: string;
  eventId?: string;
  guestSessionId?: string;
};

export type IssuedOidcState = { state: string; nonce: string };

export const OIDC_STATE_TTL_MINUTES = 10;

export class InvalidOidcStateError extends Error {
  constructor(readonly reason: "signature" | "expired" | "consumed" | "unknown") {
    super(`state OIDC inválido: ${reason}`);
    this.name = "InvalidOidcStateError";
  }
}

function sign(secret: string, materialB64: string): string {
  return createHmac("sha256", secret).update(materialB64).digest("base64url");
}

/**
 * Emite o `state` (payload + HMAC) e grava a linha de uso único em
 * `oidc_states` — hash do nonce, nunca o nonce cru. O mesmo nonce vai para
 * o Google como parâmetro `nonce`: é o que casa o `state` com o `id_token`
 * no callback (T2 valida `nonce == este`).
 */
export async function issueOidcState(pool: Pool, secret: string, input: IssueOidcStateInput): Promise<IssuedOidcState> {
  const nonce = randomBytes(32).toString("base64url");
  const payload: OidcStatePayload = {
    surface: input.surface,
    nonce,
    returnTo: input.returnTo,
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.guestSessionId ? { guestSessionId: input.guestSessionId } : {}),
  };
  const materialB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const state = `${materialB64}.${sign(secret, materialB64)}`;

  const nonceHash = createHash("sha256").update(nonce).digest();
  const expiraEm = new Date(Date.now() + OIDC_STATE_TTL_MINUTES * 60 * 1000);
  await pool.query(
    `INSERT INTO oidc_states (nonce_hash, surface, return_to, event_id, guest_session_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [nonceHash, payload.surface, payload.returnTo, payload.eventId ?? null, payload.guestSessionId ?? null, expiraEm],
  );

  return { state, nonce };
}

/**
 * Valida a assinatura, decodifica o payload, e consome a linha via
 * UPDATE...RETURNING atômico — a MESMA garantia de `consumirMagicLink`:
 * dois callbacks simultâneos com o mesmo state nunca consomem ambos.
 */
export async function consumeOidcState(pool: Pool, secret: string, state: string): Promise<OidcStatePayload> {
  const [materialB64, assinaturaRecebida] = state.split(".");
  if (!materialB64 || !assinaturaRecebida) throw new InvalidOidcStateError("signature");

  const bufRecebida = Buffer.from(assinaturaRecebida, "base64url");
  const bufEsperada = Buffer.from(sign(secret, materialB64), "base64url");
  if (bufRecebida.length !== bufEsperada.length || !timingSafeEqual(bufRecebida, bufEsperada)) {
    throw new InvalidOidcStateError("signature");
  }

  let payload: OidcStatePayload;
  try {
    payload = JSON.parse(Buffer.from(materialB64, "base64url").toString("utf8")) as OidcStatePayload;
  } catch {
    throw new InvalidOidcStateError("signature");
  }

  const nonceHash = createHash("sha256").update(payload.nonce).digest();
  const { rows } = await pool.query<{ consumed_at: Date | null }>(
    `UPDATE oidc_states SET consumed_at = now()
      WHERE nonce_hash = $1 AND consumed_at IS NULL AND expires_at > now()
      RETURNING consumed_at`,
    [nonceHash],
  );

  if (rows.length === 0) {
    const { rows: atual } = await pool.query<{ consumed_at: Date | null; expirado: boolean }>(
      `SELECT consumed_at, (expires_at <= now()) AS expirado FROM oidc_states WHERE nonce_hash = $1`,
      [nonceHash],
    );
    const linha = atual[0];
    if (!linha) throw new InvalidOidcStateError("unknown");
    if (linha.consumed_at) throw new InvalidOidcStateError("consumed");
    if (linha.expirado) throw new InvalidOidcStateError("expired");
    throw new InvalidOidcStateError("unknown");
  }

  return payload;
}

const DEFAULT_RETURN_TO: Record<OidcSurface, string> = { host: "/admin", staff: "/console", guest: "/" };

/**
 * `returnTo` só é aceito se path interno: começa com `/`, não `//`
 * (protocol-relative), sem `:` (esquema) nem `\` (variação de
 * open-redirect que navegadores normalizam para host externo). Nunca
 * lança — um returnTo ruim não derruba o login, só cai no default.
 */
export function sanitizeReturnTo(returnTo: string | undefined | null, surface: OidcSurface): string {
  const fallback = DEFAULT_RETURN_TO[surface];
  if (!returnTo) return fallback;
  if (!returnTo.startsWith("/")) return fallback;
  if (returnTo.startsWith("//")) return fallback;
  if (returnTo.includes(":") || returnTo.includes("\\")) return fallback;
  return returnTo;
}
