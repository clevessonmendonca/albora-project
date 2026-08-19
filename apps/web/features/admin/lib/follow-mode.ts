import type { HostEventRole } from "@albora/db";

/**
 * Decide se a seção mostra o modo Acompanhar (foto-first, casal) em vez do
 * painel denso. É roteamento de EXIBIÇÃO — `canManageCoupleOnly` e
 * `roleForAccountOnEvent` continuam sendo o único gate de ação (spec
 * 2026-08-17-admin-landing-moderno-design.md §9); esta função nunca decide
 * permissão, só qual componente renderiza.
 */
export function showsFollowMode(role: HostEventRole, allowFollowMode: boolean): boolean {
  return allowFollowMode && role === "couple";
}
