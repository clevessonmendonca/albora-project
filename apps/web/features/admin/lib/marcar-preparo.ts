import type { MarcoDePreparo } from "@albora/db";

/**
 * Registra um marco de preparo do evento. Fire-and-forget de propósito: o painel
 * nunca pode travar uma ação do casal porque a marcação falhou — o pior caso é o
 * item continuar aparecendo como pendente.
 */
export function marcarPreparo(eventId: string, marco: MarcoDePreparo): void {
  void fetch(`/api/admin/events/${eventId}/setup-marks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ marco }),
  }).catch(() => {});
}
