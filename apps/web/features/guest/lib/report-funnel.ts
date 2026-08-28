import type { EventoDoFunil } from "@albora/core";

/** Fire-and-forget. `keepalive` sobrevive à navegação do QR. */
export function reportFunnel(name: EventoDoFunil): void {
  try {
    void fetch("/api/funnel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ name }),
    });
  } catch {
    // Sem sessão ou sem rede: o passo some do painel, o convidado segue.
  }
}
