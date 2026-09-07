import type { z } from "zod";
import { errorResponse } from "./response";

export function validateBody<T>(
  body: unknown,
  schema: z.ZodType<T>,
): T | Response {
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return errorResponse(
      422,
      "validation.failed",
      firstIssue?.message ?? "Dados inválidos",
    );
  }

  return result.data;
}
