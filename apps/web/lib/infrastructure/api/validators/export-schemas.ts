/**
 * Validators: Export Schemas
 *
 * Schemas Zod para validação de export (admin).
 */
import { z } from "zod";

/**
 * Schema para criar export (POST).
 */
export const createExportSchema = z.object({
  token: z.string().min(1, "Confirme o download"),
  curated: z.boolean().optional().default(false),
});

export type CreateExportBody = z.infer<typeof createExportSchema>;

/**
 * Schema para buscar export (GET query).
 */
export const getExportSchema = z.object({
  modo: z.enum(["full", "curated"]).optional(),
});

export type GetExportQuery = z.infer<typeof getExportSchema>;

/**
 * Schema para arquivo (GET query).
 */
export const getExportFileSchema = z.object({
  job: z.string().uuid("Job inválido"),
});

export type GetExportFileQuery = z.infer<typeof getExportFileSchema>;
