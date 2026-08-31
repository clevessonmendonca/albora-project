/**
 * Validators: Drive Schemas
 *
 * Schemas Zod para validação de Drive (admin).
 */
import { z } from "zod";

/**
 * Schema para connect (GET query).
 */
export const driveConnectSchema = z.object({
  confirmacao: z.string().min(1, "Confirme a conexão"),
});

export type DriveConnectQuery = z.infer<typeof driveConnectSchema>;

/**
 * Schema para callback (GET query).
 */
export const driveCallbackSchema = z.object({
  code: z.string().min(1, "Code obrigatório"),
  state: z.string().min(1, "State obrigatório"),
});

export type DriveCallbackQuery = z.infer<typeof driveCallbackSchema>;
