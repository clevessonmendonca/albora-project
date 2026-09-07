/**
 * Validators: App Pair Schemas
 *
 * Schemas Zod para validação de pareamento de app nativo.
 */
import { z } from "zod";

const FOUR_DIGIT_CODE = /^[0-9]{4}$/;
const PASSAGEM_TOKEN = /^[a-zA-Z0-9_-]{8,128}$/;

/**
 * Schema para resgate de pareamento (POST).
 */
export const redeemAppPairSchema = z
  .object({
    codigo: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          return FOUR_DIGIT_CODE.test(val.trim());
        },
        {
          message: "Código deve ter 4 dígitos",
        },
      )
      .transform((val) => (val ? val.trim() : undefined)),
    passagem: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          return PASSAGEM_TOKEN.test(val.trim());
        },
        {
          message: "Passagem inválida",
        },
      )
      .transform((val) => (val ? val.trim() : undefined)),
  })
  .refine((data) => data.codigo || data.passagem, {
    message: "Informe código ou passagem",
  });

export type RedeemAppPairBody = z.infer<typeof redeemAppPairSchema>;
