import { ehEventoDoFunil, type EventoDoFunil } from "@albora/core";

const DO_CLIENTE: ReadonlySet<EventoDoFunil> = new Set([
  "qr_scan",
  "capture",
  "upload_fail",
  "retry",
  "share",
  "install_prompt",
  "install_accept",
  "install_dismiss",
]);

/** Passos que o cliente reporta. Confirm, sessão e feed gravamos no servidor. */
export function funnelEventFromClient(value: unknown): EventoDoFunil | null {
  if (typeof value !== "string" || !ehEventoDoFunil(value) || !DO_CLIENTE.has(value)) {
    return null;
  }
  return value;
}
