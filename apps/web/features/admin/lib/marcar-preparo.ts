import type { MarcoDePreparo } from "@albora/db";

/**
 * Registra um marco de preparo do evento. Fire-and-forget de propósito: o painel
 * nunca pode travar uma ação do casal porque a marcação falhou — o pior caso é o
 * item continuar aparecendo como pendente.
 */
export function marcarPreparo(eventId: string, marco: MarcoDePreparo): void {
  enviar(eventId, { marco });
}

/** Progresso do tour. `true` = terminou ou pulou; número = próximo passo. */
export function marcarPassoDoTour(eventId: string, valor: number | true): void {
  enviar(eventId, { tour: valor });
}

function enviar(eventId: string, corpo: Record<string, unknown>): void {
  void fetch(`/api/admin/events/${eventId}/setup-marks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  }).catch(() => {});
}
