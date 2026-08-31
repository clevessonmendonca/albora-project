/**
 * Validators: Upload Schemas
 * 
 * Schemas Zod para validação de uploads.
 */

import { z } from "zod";

/**
 * Detalhe que o cliente manda como `null` quando não existe.
 *
 * `transport.confirm` (web) e `confirmPayload` (mobile) montam o corpo com
 * `?? null`, e `.optional()` sozinho aceita só `undefined` — a foto sem legenda,
 * sem lugar e sem missão, que é o caminho padrão do convidado, tomava 422.
 * Normaliza para `undefined` para o domínio não precisar saber da diferença.
 */
const detalheOpcional = <T extends z.ZodTypeAny>(base: T) =>
  base.nullish().transform((v) => v ?? undefined);

/**
 * Schema para confirmação de upload (POST).
 */
export const confirmUploadSchema = z.object({
  uploadId: z.string().uuid("ID de upload inválido"),
  chave: z.string().min(1, "Chave obrigatória"),
  mime: z.string().min(1, "MIME type obrigatório"),
  legenda: detalheOpcional(z.string()),
  lugar: detalheOpcional(z.string()),
  desafioId: detalheOpcional(z.string().uuid("ID de desafio inválido")),
  promptKey: detalheOpcional(z.string()),
  capturadaEm: z.union([z.string(), z.number()]).optional(),
  capturadaEmParede: z.boolean().optional(),
  largura: z.number().int().positive("Largura inválida").optional(),
  altura: z.number().int().positive("Altura inválida").optional(),
  story: z.boolean().optional(),
  musicTrackId: z.string().optional(),
});

export type ConfirmUploadBody = z.infer<typeof confirmUploadSchema>;

/**
 * Schema para anotação de upload (PATCH).
 */
export const annotateUploadSchema = z.object({
  legenda: z
    .string()
    .max(280, "Legenda muito longa (máx. 280 caracteres)")
    .nullable()
    .optional(),
  lugar: z
    .string()
    .max(100, "Lugar muito longo (máx. 100 caracteres)")
    .nullable()
    .optional(),
});

export type AnnotateUploadBody = z.infer<typeof annotateUploadSchema>;
