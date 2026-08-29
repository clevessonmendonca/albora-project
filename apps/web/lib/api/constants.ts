export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const RATE_LIMITS = {
  default: { max: 120, windowSec: 60 },
  upload: { max: 30, windowSec: 60 },
  feed: { max: 60, windowSec: 60 },
  commentWrite: { max: 10, windowSec: 60 },
  reactionWrite: { max: 20, windowSec: 60 },
  magicLink: { max: 5, windowSec: 600 },
  consumeMagicLink: { max: 10, windowSec: 60 },
} as const;

export const DEFAULT_RATE_LIMIT = RATE_LIMITS.default;

export const ADMIN_SESSION_REQUIRED = {
  code: "admin.sem_sessao",
  message: "Entre no painel para continuar",
} as const;
