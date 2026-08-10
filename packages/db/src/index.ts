/**
 * A regra que este pacote existe para impor, e que o guard de isolamento
 * verifica estaticamente desde a task 002:
 *
 * Toda tabela com dado de evento tem `event_id` NOT NULL, RLS **FORÇADO**, e
 * todo acesso passa por `comEvento()` — que abre transação e faz `SET LOCAL`.
 * Nunca `SET`, nunca `pg_advisory_lock` de sessão: o pooling em modo
 * transação devolve a conexão a cada COMMIT, e o que sobrar vaza para o
 * próximo cliente, que é outro casamento.
 */

export const SETTING_EVENTO = "app.event_id";

export { comAgregacao, comEvento, ErroEventoAusente } from "./evento";
export { migrar } from "./migrar";

export type { LinhaUpload, ResultadoConfirm } from "./uploads";
export { confirmarUpload, ErroUploadDeOutroEvento } from "./uploads";
