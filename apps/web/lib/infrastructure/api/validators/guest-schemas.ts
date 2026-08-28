/**
 * Validators: Guest Schemas
 *
 * Schemas Zod para validação de endpoints de convidados (admin).
 */
import { z } from "zod";

/**
 * Schema para atualizar nome de sessão (PATCH).
 */
export const updateSessionNameSchema = z.object({
  sessaoId: z.string().uuid("ID de sessão inválido"),
  acao: z.enum(["ocultar", "renomear"], {
    errorMap: () => ({ message: "Ação deve ser 'ocultar' ou 'renomear'" }),
  }),
  nome: z.string().optional(),
});

export type UpdateSessionNameBody = z.infer<typeof updateSessionNameSchema>;
