import { UUID_RE } from "./constants";
import { errorResponse } from "./response";

export function parseUuidParam(
  value: string | null,
  field: string,
  message = "Filtro inválido",
): string | null | Response {
  if (value === null) return null;
  if (!UUID_RE.test(value)) {
    return errorResponse(422, "validation_error", message, { campos: [field] });
  }
  return value;
}

export function parseFourDigitCode(value: unknown): string | Response {
  const codigo = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}$/.test(codigo)) {
    return errorResponse(422, "validation_error", "Código inválido", { campos: ["codigo"] });
  }
  return codigo;
}
