/**
 * @deprecated Importar de `@/lib/infrastructure/queue` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export type { EnqueueTaskPayload } from "./infrastructure/queue/client";
export { enqueueTask } from "./infrastructure/queue/client";
