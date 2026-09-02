const PII_FIELDS = new Set(["name", "email", "phone", "cpf", "displayName", "firstName", "lastName"]);

export function maskPii(value: string): string {
  if (!value || value.length < 3) return "***";

  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    const maskedLocal = local && local.length > 0 ? local[0] + "***" : "***";
    const maskedDomain = domain && domain.length > 0 ? domain[0] + "***" : "***";
    return `${maskedLocal}@${maskedDomain}`;
  }

  const isNumeric = /\d/.test(value) && /^[\d\s()+-]+$/.test(value);
  if (isNumeric && value.length > 8) {
    return value.slice(0, 3) + "****" + value.slice(-4);
  }

  return value[0] + "***" + (value.length > 1 ? value[value.length - 1] : "");
}

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

export function addPiiField(fieldName: string): void {
  PII_FIELDS.add(fieldName);
}

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
