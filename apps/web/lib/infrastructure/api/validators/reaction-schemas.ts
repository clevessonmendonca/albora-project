/**
 * Validators: Reaction Schemas
 * 
 * Schemas Zod para validação de reações.
 */

import { z } from "zod";

/**
 * Schema para adicionar reação (POST).
 */
export const addReactionSchema = z.object({
  uploadId: z.string().uuid("ID de upload inválido"),
  tipo: z.enum(["curtir", "amar", "rir", "chorar", "aplaudir"], {
    errorMap: () => ({ message: "Tipo de reação inválido" }),
  }),
});

export type AddReactionBody = z.infer<typeof addReactionSchema>;

/**
 * Schema para remover reação (DELETE).
 */
export const removeReactionSchema = z.object({
  uploadId: z.string().uuid("ID de upload inválido"),
});

export type RemoveReactionBody = z.infer<typeof removeReactionSchema>;
