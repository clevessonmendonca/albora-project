/**
 * Use Case: Mark Guestbook Read
 * 
 * Marca recado do casal como lido pelo convidado.
 */

import { decideDelivery } from "@albora/core";
import {
  guestbookReads,
  eventGuestbook,
  markGuestbookRead,
  withEvent,
} from "@albora/db";
import type { Pool } from "pg";

export type MarkGuestbookReadInput = {
  eventoId: string;
  sessaoId: string;
};

export type MarkGuestbookReadOutput = {
  lido: boolean;
  codigo: string;
};

/**
 * Marca recado como lido.
 * 
 * Spec: ID sai do evento da sessão, nunca do corpo.
 * 
 * @param input - eventoId e sessaoId
 * @param pool - Pool de conexões
 * @returns Se foi marcado como lido e código de status
 */
export async function markGuestbookReadUseCase(
  input: MarkGuestbookReadInput,
  pool: Pool,
): Promise<MarkGuestbookReadOutput> {
  const agora = new Date();

  const resultado = await withEvent(pool, input.eventoId, async (c) => {
    const recado = await eventGuestbook(c, input.eventoId);
    const leituras = await guestbookReads(c, input.eventoId, input.sessaoId);
    const entrega = decideDelivery(
      recado,
      { id: input.sessaoId, eventoId: input.eventoId },
      leituras,
      agora,
    );

    if (!entrega.mostrar || entrega.recado === null) {
      return { lido: entrega.codigo === "recado.ja_lido", codigo: entrega.codigo };
    }

    await markGuestbookRead(c, {
      eventoId: input.eventoId,
      sessaoId: input.sessaoId,
      recadoId: entrega.recado.id,
      lidoEm: agora,
    });

    return { lido: true, codigo: "recado.ja_lido" };
  });

  return resultado;
}
