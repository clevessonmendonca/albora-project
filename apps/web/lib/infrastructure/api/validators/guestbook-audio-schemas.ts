/**
 * Validators: Guestbook Audio Schemas
 *
 * Schemas Zod para validação de áudio do guestbook (admin).
 */
import { z } from "zod";

/**
 * Schema para presign de áudio (POST).
 */
export const presignGuestbookAudioSchema = z.object({
  mime: z.string().min(1, "MIME type obrigatório"),
  bytes: z.number().int().positive("Tamanho inválido"),
  duracaoSegundos: z.number().int().positive("Duração inválida"),
});

export type PresignGuestbookAudioBody = z.infer<typeof presignGuestbookAudioSchema>;

/**
 * Schema para confirmar upload de áudio (POST confirm).
 */
export const confirmGuestbookAudioSchema = z.object({
  chave: z.string().min(1, "Chave obrigatória"),
  mime: z.string().min(1, "MIME type obrigatório"),
  duracaoSegundos: z.number().int().positive("Duração inválida"),
  aceite: z.boolean().refine((val) => val === true, {
    message: "Confirme que a gravação é da sua voz",
  }),
});

export type ConfirmGuestbookAudioBody = z.infer<typeof confirmGuestbookAudioSchema>;
