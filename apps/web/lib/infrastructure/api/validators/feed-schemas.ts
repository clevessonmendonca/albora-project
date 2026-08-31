/**
 * Validators: Feed Schemas
 * 
 * Schemas Zod para validação do feed.
 */

import { z } from "zod";

/**
 * Schema para listar feed (GET query params).
 */
export const listFeedSchema = z.object({
  missao: z
    .string()
    .uuid("ID de missão inválido")
    .optional()
    .nullable()
    .transform((val) => val || null),
  cursor: z.string().optional().nullable(),
});

export type ListFeedQuery = z.infer<typeof listFeedSchema>;
