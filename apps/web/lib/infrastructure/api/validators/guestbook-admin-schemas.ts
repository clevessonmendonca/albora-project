/**
 * Validators: Guestbook Schemas
 *
 * Schemas Zod para validação de guestbook (admin).
 */
import { z } from "zod";

/**
 * Schema para upsert guestbook (PUT).
 */
export const upsertGuestbookSchema = z.object({
  texto: z.string().min(1, "Texto obrigatório"),
  publicaEm: z
    .string()
    .datetime({ message: "Horário inválido" })
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const date = new Date(val);
      return Number.isNaN(date.getTime()) ? null : date;
    }),
});

export type UpsertGuestbookBody = z.infer<typeof upsertGuestbookSchema>;

/**
 * Valida se cliente tentou enviar chave de storage.
 */
export function clientSentStorageKey(corpo: Record<string, unknown>): boolean {
  if (
    "chave" in corpo ||
    "audioKey" in corpo ||
    "storage_key" in corpo ||
    "storageKey" in corpo
  ) {
    return true;
  }

  const audio = corpo.audio;
  return Boolean(audio && typeof audio === "object" && audio !== null && "chave" in audio);
}
