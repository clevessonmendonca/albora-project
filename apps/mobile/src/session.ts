import { GUEST_SESSION_COOKIE } from "@albora/core";

export const SESSION_STORE_KEY = "albora.sessao";

export type GuestSession = {
  token: string;
  slug: string;
  sessaoId: string;
  eventoId: string;
};

export function cookieHeader(token: string): string {
  return `${GUEST_SESSION_COOKIE}=${token}`;
}

export function parseRedeemResponse(body: unknown): GuestSession | null {
  if (typeof body !== "object" || body === null) return null;
  const row = body as {
    token?: unknown;
    slug?: unknown;
    sessaoId?: unknown;
    eventoId?: unknown;
  };
  if (typeof row.token !== "string" || row.token.length === 0) return null;
  if (typeof row.slug !== "string" || row.slug.length === 0) return null;
  if (typeof row.sessaoId !== "string" || row.sessaoId.length === 0) return null;
  if (typeof row.eventoId !== "string" || row.eventoId.length === 0) return null;
  return { token: row.token, slug: row.slug, sessaoId: row.sessaoId, eventoId: row.eventoId };
}

export function parseStoredSession(raw: string | null): GuestSession | null {
  if (raw === null || raw.length === 0) return null;
  try {
    return parseRedeemResponse(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function apiOrigin(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (raw === undefined || raw.trim() === "") {
    return "http://localhost:3000";
  }
  return raw.replace(/\/$/, "");
}

export function redeemUrl(): string {
  return `${apiOrigin()}/api/app/parear/resgatar`;
}
