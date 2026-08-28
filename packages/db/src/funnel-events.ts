import {
  ehEventoDoFunil,
  ehEventoUnicoDoFunil,
  eventosDeEntrada,
  type ViaDeEntrada,
} from "@albora/core";
import type { PoolClient } from "pg";

export class ErroEventoDoFunilInvalido extends Error {
  readonly code = "funil.evento_invalido";

  constructor(readonly recebido: string) {
    super("evento de funil fora do contrato");
  }
}

/** `event_id` do GUC, nunca do chamador; eventos únicos não duplicam por sessão; sessão de outro evento é invisível sob RLS — o mesmo silêncio de "não existe". */
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

/** QR → página → consentimento só quando `via=qr`. Link e WhatsApp abrem a página. */
export async function registrarEntradaDoFunil(
  cliente: PoolClient,
  sessaoId: string,
  via: ViaDeEntrada,
): Promise<void> {
  for (const name of eventosDeEntrada(via)) {
    await registrarEventoDoFunil(cliente, { sessaoId, name });
  }
}
