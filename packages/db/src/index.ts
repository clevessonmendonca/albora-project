/**
 * Schema e migrations entram na task 003. Este pacote existe agora só para
 * fixar o lugar e a regra.
 *
 * A regra, que vale desde o primeiro commit e é verificada pelo guard de
 * isolamento: toda tabela com dado de evento tem `event_id` NOT NULL, RLS
 * FORÇADO, e todo acesso abre transação com `SET LOCAL app.event_id`.
 * Nunca `SET`, nunca `pg_advisory_lock` de sessão — o pooling em modo
 * transação devolve a conexão a cada COMMIT e o setting vaza para o próximo
 * cliente, que é outro casamento.
 */

export const SETTING_EVENTO = "app.event_id";

/**
 * Monta o `SET LOCAL` do evento. Existe para que nenhuma consulta escreva
 * `SET` à mão — o guard de isolamento reprova a forma de sessão, e ter uma
 * função certa disponível é o que torna a regra fácil de obedecer.
 */
export function setLocalEvento(eventoId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(eventoId)) {
    throw new Error("event_id fora do formato uuid");
  }
  return `SET LOCAL ${SETTING_EVENTO} = '${eventoId}'`;
}
