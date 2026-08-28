/**
 * Validation Middleware
 * 
 * Middleware genérico para validação de body com Zod.
 */

import type { ZodSchema } from "zod";
import { errorResponse } from "../response";

/**
 * Valida o body de uma requisição usando um schema Zod.
 * 
 * @param body - Body parseado (unknown)
 * @param schema - Schema Zod para validação
 * @returns Dados validados ou Response de erro
 * 
 * @example
 * ```ts
 * const body = await parseJsonBody(req);
 * const validated = validateBody(body, publishCommentSchema);
 * if (validated instanceof Response) return validated;
 * // validated é tipado como PublishCommentBody
 * ```
 */
export function validateBody<T>(
  body: unknown,
  schema: ZodSchema<T>,
): T | Response {
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.errors[0];
    return errorResponse(
      422,
      "validation.failed",
      firstError?.message ?? "Dados inválidos",
    );
  }

  return result.data;
}
