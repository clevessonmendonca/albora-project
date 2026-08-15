import { ehEventoDoFunil, ehEventoUnicoDoFunil, type EventoDoFunil } from "@albora/core";
import type { PoolClient } from "pg";

const ENTRADA: readonly EventoDoFunil[] = ["qr_scan", "page_open", "consent"];

export class ErroEventoDoFunilInvalido extends Error {
  readonly code = "funil.evento_invalido";

  constructor(readonly recebido: string) {
    super("evento de funil fora do contrato");
  }
}

/**
 * Grava um passo do funil. `event_id` sai do GUC da transação, nunca do
 * chamador — a mesma regra das outras escritas de convidado.
 *
 * Eventos únicos (QR, entrada, consentimento, primeira abertura do feed) não
 * duplicam na mesma sessão: refresh e toque duplo contam uma vez. Captura e
 * envio se repetem a cada foto.
 *
 * Devolve se uma linha nova nasceu. Sessão de outro evento é invisível sob
 * RLS e conta como não gravado — o mesmo silêncio de "não existe".
 */
export async function registrarEventoDoFunil(
  cliente: PoolClient,
  entrada: { sessaoId: string; name: string },
): Promise<boolean> {
  if (!ehEventoDoFunil(entrada.name)) {
    throw new ErroEventoDoFunilInvalido(entrada.name);
  }

  const { rowCount: visivel } = await cliente.query("SELECT 1 FROM guest_sessions WHERE id = $1", [
    entrada.sessaoId,
  ]);
  if ((visivel ?? 0) === 0) return false;

  if (ehEventoUnicoDoFunil(entrada.name)) {
    await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [
      entrada.sessaoId,
      entrada.name,
    ]);

    const { rowCount } = await cliente.query(
      `INSERT INTO funnel_events (event_id, session_id, name)
       SELECT NULLIF(current_setting('app.event_id', true), '')::uuid, $1, $2
        WHERE NOT EXISTS (
          SELECT 1 FROM funnel_events
           WHERE session_id = $1 AND name = $2
        )`,
      [entrada.sessaoId, entrada.name],
    );
    return (rowCount ?? 0) > 0;
  }

  const { rowCount } = await cliente.query(
    `INSERT INTO funnel_events (event_id, session_id, name)
     VALUES (NULLIF(current_setting('app.event_id', true), '')::uuid, $1, $2)`,
    [entrada.sessaoId, entrada.name],
  );
  return (rowCount ?? 0) > 0;
}

/** QR → página → consentimento, nesta ordem, para o `id ASC` do agregador. */
export async function registrarEntradaDoFunil(
  cliente: PoolClient,
  sessaoId: string,
): Promise<void> {
  for (const name of ENTRADA) {
    await registrarEventoDoFunil(cliente, { sessaoId, name });
  }
}
