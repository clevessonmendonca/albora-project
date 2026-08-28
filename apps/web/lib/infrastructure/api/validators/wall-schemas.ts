/**
 * Validators: Wall Schemas
 * 
 * Schemas Zod para validação de telão.
 */

import { z } from "zod";

const PAIRING_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Schema para autorização de pareamento (POST).
 */
export const authorizeWallSchema = z.object({
  codigo: z
    .string()
    .min(1, "Código obrigatório")
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => PAIRING_CODE.test(val), {
      message: "Código inválido",
    }),
});

export type AuthorizeWallBody = z.infer<typeof authorizeWallSchema>;
