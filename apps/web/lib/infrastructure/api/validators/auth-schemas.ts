/**
 * Validators: Auth Schemas
 *
 * Schemas Zod para validação de autenticação admin.
 */
import { z } from "zod";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Schema para sign-in (POST).
 */
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail obrigatório")
    .refine((val) => EMAIL.test(val), {
      message: "E-mail inválido",
    }),
  next: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const next = val.trim();
        if (!next.startsWith("/admin")) return false;
        if (next.startsWith("//") || next.includes("://") || next.includes("\\")) return false;
        return true;
      },
      {
        message: "Próxima URL inválida",
      },
    )
    .transform((val) => (val ? val.trim() : null)),
});

export type SignInBody = z.infer<typeof signInSchema>;

/**
 * Schema para consumir magic link (POST).
 */
export const consumeMagicLinkSchema = z.object({
  token: z.string().min(1, "Token obrigatório"),
});

export type ConsumeMagicLinkBody = z.infer<typeof consumeMagicLinkSchema>;
