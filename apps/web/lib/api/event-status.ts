export type StatusPedido = "active" | "ended";

export function statusPedido(v: unknown): StatusPedido | null {
  return v === "active" || v === "ended" ? v : null;
}
