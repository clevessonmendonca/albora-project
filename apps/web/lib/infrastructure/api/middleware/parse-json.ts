import { errorResponse } from "./response";

export async function parseJsonBody<T extends Record<string, unknown>>(
  req: Request,
): Promise<{ data: T } | Response> {
  try {
    const data = (await req.json()) as T;
    return { data };
  } catch {
    return errorResponse(422, "validation_error", "Corpo inválido", { campo: "body" });
  }
}
