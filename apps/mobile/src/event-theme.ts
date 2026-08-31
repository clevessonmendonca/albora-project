import { PACKS } from "@albora/packs";
import {
  ALBORA_BRAND,
  resolveGuestThemeVariables,
  resolveTokens,
  toVariables,
  type Background,
  type TokenLayer,
} from "@albora/tokens";
import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type GuestEventTheme = {
  packId: string;
  identityTokens: Record<string, unknown>;
  vendorBrandTokens: Record<string, unknown> | null;
  filtroRecomendado: string | null;
  fuso: string;
};

export function guestEventUrl(): string {
  return `${apiOrigin()}/api/guest/event`;
}

export function parseGuestEventTheme(body: unknown): GuestEventTheme | null {
  if (typeof body !== "object" || body === null) return null;
  const row = body as {
    packId?: unknown;
    identityTokens?: unknown;
    vendorBrandTokens?: unknown;
    filtroRecomendado?: unknown;
    fuso?: unknown;
  };
  if (typeof row.packId !== "string" || row.packId.length === 0) return null;
  if (typeof row.identityTokens !== "object" || row.identityTokens === null) return null;
  if (row.vendorBrandTokens !== null && typeof row.vendorBrandTokens !== "object") return null;
  if (row.filtroRecomendado !== null && typeof row.filtroRecomendado !== "string") return null;
  if (typeof row.fuso !== "string" || row.fuso.length === 0) return null;
  return {
    packId: row.packId,
    identityTokens: row.identityTokens as Record<string, unknown>,
    vendorBrandTokens: row.vendorBrandTokens as Record<string, unknown> | null,
    filtroRecomendado: row.filtroRecomendado,
    fuso: row.fuso,
  };
}

function resolutionInput(theme: GuestEventTheme, background?: Background) {
  const pack = PACKS[theme.packId];
  return {
    identityTokens: theme.identityTokens,
    vendorBrandTokens: theme.vendorBrandTokens,
    ...(pack ? { packTokens: pack.tokens } : {}),
    ...(background !== undefined ? { background } : {}),
  };
}

/** Vars do tema — mesma cadeia da web (`eventVars` / `resolveGuestThemeVariables`). */
export function themeVariablesFromEvent(
  theme: GuestEventTheme,
  background?: Background,
): Record<string, string> {
  return resolveGuestThemeVariables(resolutionInput(theme, background));
}

export function themeBackgroundFromEvent(theme: GuestEventTheme): Background {
  const pack = PACKS[theme.packId];
  const vendorLayer =
    theme.vendorBrandTokens && Object.keys(theme.vendorBrandTokens).length > 0
      ? (theme.vendorBrandTokens as TokenLayer)
      : undefined;
  const hasIdentity = Object.keys(theme.identityTokens).length > 0;
  const resolved = resolveTokens({
    marca: ALBORA_BRAND,
    ...(vendorLayer ? { vendor: vendorLayer } : {}),
    ...(pack ? { pack: pack.tokens } : {}),
    ...(hasIdentity ? { evento: theme.identityTokens as TokenLayer } : {}),
  });
  return resolved.background;
}

export function brandFallbackVariables(): Record<string, string> {
  return toVariables(ALBORA_BRAND);
}

export async function fetchGuestEventTheme(session: GuestSession): Promise<GuestEventTheme | null> {
  const response = await fetch(guestEventUrl(), {
    headers: { cookie: cookieHeader(session.token) },
  });
  if (!response.ok) return null;
  const body: unknown = await response.json().catch(() => null);
  return parseGuestEventTheme(body);
}
