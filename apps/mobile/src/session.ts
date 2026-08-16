import { GUEST_SESSION_COOKIE } from "@albora/core";

export type GuestSession = {
  token: string;
  slug: string;
  sessaoId: string;
};

export function cookieHeader(token: string): string {
  return `${GUEST_SESSION_COOKIE}=${token}`;
}

export function parseRedeemResponse(body: unknown): GuestSession | null {
  if (typeof body !== "object" || body === null) return null;
  const row = body as { token?: unknown; slug?: unknown; sessaoId?: unknown };
  if (typeof row.token !== "string" || row.token.length === 0) return null;
  if (typeof row.slug !== "string" || row.slug.length === 0) return null;
  if (typeof row.sessaoId !== "string" || row.sessaoId.length === 0) return null;
  return { token: row.token, slug: row.slug, sessaoId: row.sessaoId };
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
