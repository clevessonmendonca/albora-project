/**
 * @deprecated Importar de `@/lib/infrastructure/queue` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export {
  webQueue,
  queueSummary,
  clearQueue,
  QueueUnavailableError,
  QueueQuotaExceededError,
} from "./infrastructure/queue/client";
