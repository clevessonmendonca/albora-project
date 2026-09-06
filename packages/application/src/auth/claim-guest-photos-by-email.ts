import type { Pool } from "pg";

export type ClaimGuestPhotosByEmailInput = {
  eventId: string;
  guestSessionId: string;
  email: string;
};

/**
 * STUB — implementação real fica para T8. Interface fixada aqui para o
 * roteador do callback (T4) despachar por `surface: "guest"` antes do
 * caso de uso existir: vincula as fotos da sessão de convidado atual ao
 * e-mail confirmado pelo Google, para reencontrá-las num aparelho novo.
 * `guestSessionId` chega aqui só porque o `start` (T4) já resolveu contra
 * o cookie da própria sessão — nunca do cliente. Nunca chame isto fora de
 * teste com mock antes de T8 substituir o corpo: falha alto de propósito.
 */
export async function claimGuestPhotosByEmail(_pool: Pool, _input: ClaimGuestPhotosByEmailInput): Promise<void> {
  throw new Error("claimGuestPhotosByEmail: ainda não implementado (T8)");
}
