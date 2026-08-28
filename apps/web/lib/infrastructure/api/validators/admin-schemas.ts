/**
 * Validators: Admin Schemas
 * 
 * Schemas Zod para validação de endpoints admin.
 */

import { z } from "zod";

/**
 * Schema para definir música do casal (PUT).
 */
export const setMusicSchema = z.object({
  url: z.string().min(1, "Cole o link da faixa").trim(),
});

export type SetMusicBody = z.infer<typeof setMusicSchema>;
