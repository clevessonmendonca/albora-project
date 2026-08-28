import type { HostEventRole } from "@albora/db";

/** Roteamento de exibição apenas — nunca decide permissão; `canManageCoupleOnly` é o único gate de ação. */
export function showsFollowMode(role: HostEventRole, allowFollowMode: boolean): boolean {
  return allowFollowMode && role === "couple";
}
