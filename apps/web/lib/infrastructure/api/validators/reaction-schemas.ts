/**
 * Validators: Reaction Schemas
 * 
 * Schemas Zod para validação de reações.
 */

import { z } from "zod";

/**
 * Schema para listar reações (GET query params).
 */
export const listReactionsSchema = z.object({
  uploadId: z.string().uuid("ID de upload inválido"),
});

export type ListReactionsQuery = z.infer<typeof listReactionsSchema>;

/**
 * Schema para adicionar reação (PUT).
 */
export const addReactionSchema = z.object({
  uploadId: z.string().uuid("ID de upload inválido"),
  tipo: z.string().min(1, "Tipo de reação obrigatório"),
});

export type AddReactionBody = z.infer<typeof addReactionSchema>;

/**
 * Schema para remover reação (DELETE).
 */
export const removeReactionSchema = z.object({
  uploadId: z.string().uuid("ID de upload inválido"),
});

export type RemoveReactionBody = z.infer<typeof removeReactionSchema>;
