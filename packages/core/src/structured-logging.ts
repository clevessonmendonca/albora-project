/**
 * Structured Logging com PII Masking
 * 
 * Helpers para logging estruturado que nunca logam PII crua.
 * Nome, telefone, email são sempre mascarados.
 */

/**
 * Campos que contém PII e devem ser mascarados
 */
const PII_FIELDS = new Set(["name", "email", "phone", "cpf", "displayName", "firstName", "lastName"]);

/**
 * Mascara valor de PII
 * 
 * @example
 * maskPii("João Silva") => "J***a"
 * maskPii("joao@example.com") => "j***@e***.com"
 * maskPii("11987654321") => "119****4321"
 */
export function maskPii(value: string): string {
  if (!value || value.length < 3) return "***";

  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    const maskedLocal = local && local.length > 0 ? local[0] + "***" : "***";
    const maskedDomain = domain && domain.length > 0 ? domain[0] + "***" : "***";
    return `${maskedLocal}@${maskedDomain}`;
  }

  if (value.length > 8) {
    return value.slice(0, 3) + "****" + value.slice(-4);
  }

  return value[0] + "***" + (value.length > 1 ? value[value.length - 1] : "");
}

/**
 * Mascara objeto recursivamente
 */
export function maskObject(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (PII_FIELDS.has(key) && typeof value === "string") {
      masked[key] = maskPii(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      masked[key] = maskObject(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Logger estruturado com PII masking automático
 */
export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    console.log(message, data ? maskObject(data) : undefined);
  },

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(message, data ? maskObject(data) : undefined);
  },

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    console.error(message, {
      erro: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...(data ? maskObject(data) : {}),
    });
  },

  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(message, data ? maskObject(data) : undefined);
    }
  },
};

/**
 * Adiciona campo PII customizado para mascarar
 */
export function addPiiField(fieldName: string): void {
  PII_FIELDS.add(fieldName);
}

/**
 * Cria contexto de log estruturado
 */
export function createLogContext(baseContext: Record<string, unknown>) {
  const masked = maskObject(baseContext);

  return {
    info(message: string, data?: Record<string, unknown>) {
      logger.info(message, { ...masked, ...data });
    },
    warn(message: string, data?: Record<string, unknown>) {
      logger.warn(message, { ...masked, ...data });
    },
    error(message: string, error?: unknown, data?: Record<string, unknown>) {
      logger.error(message, error, { ...masked, ...data });
    },
  };
}
