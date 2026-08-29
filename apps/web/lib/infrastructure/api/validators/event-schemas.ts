/**
 * Validators: Event Schemas
 *
 * Schemas Zod para validação de eventos (admin).
 */
import { z } from "zod";
import { FUSO_PADRAO, fusoIanaValido } from "@albora/core";
import { PACKS } from "@albora/packs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TITLE_MAX = 120;

/**
 * Schema para criar evento (POST).
 */
export const createEventSchema = z.object({
  packId: z
    .string()
    .min(1, "Pack obrigatório")
    .refine((val) => val in PACKS, {
      message: "Pack inválido",
    }),
  comecaEm: z.string().min(1, "Data de início obrigatória"),
  terminaEm: z.string().min(1, "Data de término obrigatória"),
  timezone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return fusoIanaValido(val);
      },
      {
        message: "Fuso horário inválido",
      },
    )
    .transform((val) => val ?? FUSO_PADRAO),
  expectedGuests: z
    .number()
    .int()
    .positive("Convidados esperados inválido")
    .optional()
    .transform((val) => val ?? 150),
  identityTokens: z
    .record(z.string(), z.unknown())
    .optional()
    .transform((val) => val ?? {}),
  missoes: z.array(z.string()).optional(),
  telaoModelos: z.array(z.string()).optional(),
  title: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim().length === 0) return null;
      return val.trim().slice(0, TITLE_MAX);
    }),
  vendorId: z.string().uuid("Fornecedor inválido").optional(),
  coupleEmail: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val && !EMAIL.test(val.trim())) return false;
        return true;
      },
      {
        message: "E-mail do casal obrigatório quando há fornecedor",
      },
    )
    .transform((val) => (val ? val.trim() : undefined)),
});

export type CreateEventBody = z.infer<typeof createEventSchema>;
