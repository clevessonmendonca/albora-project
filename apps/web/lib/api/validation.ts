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

/** Token opaco de passagem — mesmo formato do token de sessão. */
export function parsePassagemToken(value: string): string | Response {
  const passagem = value.trim();
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(passagem)) {
    return errorResponse(422, "validation_error", "Passagem inválida", { campos: ["passagem"] });
  }
  return passagem;
}
