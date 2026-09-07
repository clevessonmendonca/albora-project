/**
 * @deprecated Importar de `@/lib/infrastructure/queue/client` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export {
  clearQueue,
  queueSummary,
  webQueue,
  QueueQuotaExceededError,
  QueueUnavailableError,
} from "./infrastructure/queue/client";
