export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_RATE_LIMIT = { max: 120, windowSec: 60 } as const;

export const ADMIN_SESSION_REQUIRED = {
  code: "admin.sem_sessao",
  message: "Entre no painel para continuar",
} as const;
