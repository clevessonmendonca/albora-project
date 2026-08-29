/**
 * Use Case: Get Guestbook
 * 
 * Carrega recado do casal para o convidado.
 */

import {
  buildGuestbookScreen,
  decideDelivery,
  guestbookScreenHasContent,
  type Recado,
  type AudioDoRecado,
} from "@albora/core";
import { guestbookReads, eventGuestbook, withEvent } from "@albora/db";
import type { Pool } from "pg";

export type GetGuestbookInput = {
  eventoId: string;
  sessaoId: string;
};

export type GetGuestbookOutput = {
  mostrar: boolean;
  codigo: string;
  tela: {
    texto: string | null;
    camera: string | null;
    audio: AudioDoRecado | null;
  };
  recado: Recado | null;
  leituras: Awaited<ReturnType<typeof guestbookReads>>;
};

/**
 * Carrega recado do evento para o convidado.
 * 
 * Spec: Recado sem carregar = resposta vazia, câmera segue.
 * 
 * @param input - eventoId e sessaoId
 * @param pool - Pool de conexões
 * @returns Recado com lógica de entrega e tela
 */
export async function getGuestbook(
  input: GetGuestbookInput,
  pool: Pool,
): Promise<GetGuestbookOutput> {
  const { recado, leituras } = await withEvent(
    pool,
    input.eventoId,
    async (c) => {
      const recado = await eventGuestbook(c, input.eventoId);
      const leituras = await guestbookReads(c, input.eventoId, input.sessaoId);
      return { recado, leituras };
    },
  );

  const entrega = decideDelivery(
    recado,
    { id: input.sessaoId, eventoId: input.eventoId },
    leituras,
    new Date(),
  );

  const estadoDoAudio = entrega.recado?.audio ? "disponivel" : "indisponivel";
  const tela = buildGuestbookScreen(entrega, estadoDoAudio);

  return {
    mostrar: entrega.mostrar && guestbookScreenHasContent(tela),
    codigo: entrega.codigo,
    tela: {
      texto: tela.texto,
      camera: tela.camera,
      audio: tela.audio,
    },
    recado,
    leituras,
  };
}
