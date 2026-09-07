/**
 * Validators: Challenge Schemas
 *
 * Schemas Zod para validação de desafios/missões.
 */
import { z } from "zod";

const CUSTOM_TITLE_MAX = 120;

/**
 * Schema para missão custom.
 */
const customMissionSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z
    .string()
    .trim()
    .min(1, "Título obrigatório")
    .max(CUSTOM_TITLE_MAX, `Título muito longo (máx. ${CUSTOM_TITLE_MAX} caracteres)`),
  posicao: z.number().int().min(0, "Posição inválida"),
  emoji: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

/**
 * Schema para atualizar missões (PUT).
 */
export const updateChallengesSchema = z.object({
  titleKeys: z.array(z.string()).optional(),
  customMissions: z.array(customMissionSchema).optional(),
});

export type UpdateChallengesBody = z.infer<typeof updateChallengesSchema>;
export type CustomMissionInput = z.infer<typeof customMissionSchema>;
