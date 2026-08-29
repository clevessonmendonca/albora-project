/**
 * Validation Middleware
 * 
 * Middleware genérico para validação de body com Zod.
 */

import type { ZodSchema } from "zod";
import { parseJsonBody } from "./parse-json";
import { errorResponse } from "./response";

/**
 * Valida o body já parseado usando um schema Zod.
 *
 * `body` é o JSON (unknown), nunca o `Request`. Para o caminho HTTP
 * completo use `validateRequestBody`.
 */
export function validateBody<T>(
  body: unknown,
  schema: ZodSchema<T>,
): T | Response {
  const result = schema.safeParse(body);

  if (!result.success) {
    const issues = result.error.issues ?? [];
    const firstError = issues[0];
    return errorResponse(
      422,
      "validation.failed",
      firstError?.message ?? "Dados inválidos",
    );
  }

  return result.data;
}

/** Lê o JSON do `Request` e valida com Zod. */
export async function validateRequestBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<T | Response> {
  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;
  return validateBody(parsed.data, schema);
}
