import pino from "pino";

const PII_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "req.body.token",
  "email",
  "phone",
  "nome",
  "name",
  "guestName",
  "nomeConvidado",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: PII_PATHS,
    censor: "[REDACTED]",
  },
  base: {
    service: "albora",
    env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type LogContext = {
  eventId?: string;
  guestId?: string;
  sessionId?: string;
  requestId?: string;
  uploadId?: string;
  route?: string;
  [key: string]: unknown;
};

export function childLogger(context: LogContext) {
  return logger.child(context);
}

export function maskPii(value: string): string {
  if (!value) return value;
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (/^\+?\d{8,}$/.test(value.replace(/\s/g, ""))) {
    return value.slice(0, 4) + "****" + value.slice(-2);
  }
  if (value.length <= 3) return "***";
  return value.slice(0, 2) + "***";
}
