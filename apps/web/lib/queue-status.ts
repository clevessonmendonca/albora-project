import type { QueueItem } from "@albora/core";
import { MAX_ATTEMPTS } from "@albora/core";

export type LinhaFilaStatus = Pick<QueueItem, "tentativas">;

/** Rótulos da fila — espelha o catálogo mobile (`queue-status`). */
export function rotuloEstadoFila(
  item: LinhaFilaStatus,
  opts: { enviandoAgora?: boolean; online?: boolean },
): { estado: string; falhou: boolean } {
  if (item.tentativas >= MAX_ATTEMPTS) {
    return { estado: "Guardamos no celular. Vamos tentar de novo.", falhou: true };
  }
  if (opts.enviandoAgora) {
    return { estado: "Enviando…", falhou: false };
  }
  if (opts.online === false) {
    return {
      estado: item.tentativas > 0 ? "Na fila · sem sinal" : "Na fila · offline",
      falhou: false,
    };
  }
  if (item.tentativas > 0) {
    return { estado: "Subindo…", falhou: false };
  }
  return { estado: "Na fila", falhou: false };
}
