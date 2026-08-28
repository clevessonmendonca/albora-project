/**
 * Validators: Cover Image Schemas
 *
 * Schemas Zod para validação de imagem de capa.
 */
import { z } from "zod";

/**
 * Schema para presign (POST).
 */
export const presignCoverImageSchema = z.object({
  mime: z.string().min(1, "MIME type obrigatório"),
  bytes: z.number().int().positive("Tamanho inválido"),
});

export type PresignCoverImageBody = z.infer<typeof presignCoverImageSchema>;

/**
 * Schema para confirmar upload (POST confirm).
 */
export const confirmCoverImageSchema = z.object({
  chave: z.string().min(1, "Chave obrigatória"),
  mime: z.string().min(1, "MIME type obrigatório"),
});

export type ConfirmCoverImageBody = z.infer<typeof confirmCoverImageSchema>;
