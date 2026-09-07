/**
 * Validators: Comment Schemas
 * 
 * Schemas Zod para validação de comentários.
 */

import { z } from "zod";

/**
 * Schema para publicação de comentário (POST).
 */
export const publishCommentSchema = z.object({
  uploadId: z.string().uuid("ID de upload inválido"),
  texto: z
    .string()
    .min(1, "Comentário não pode ser vazio")
    .max(500, "Comentário muito longo (máx. 500 caracteres)"),
  respostaA: z.string().uuid("ID de comentário pai inválido").nullable().optional(),
  id: z.string().uuid("ID de comentário inválido").optional(),
});

export type PublishCommentBody = z.infer<typeof publishCommentSchema>;

/**
 * Schema para remoção de comentário (DELETE).
 */
export const deleteCommentSchema = z.object({
  comentarioId: z.string().uuid("ID de comentário inválido"),
});

export type DeleteCommentBody = z.infer<typeof deleteCommentSchema>;
