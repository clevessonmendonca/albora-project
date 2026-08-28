import type { Pool, PoolClient } from "pg";

/**
 * 🔴 `SET LOCAL`, nunca `SET` — pooling devolve a conexão a cada COMMIT e um setting de sessão vaza para o próximo
 * cliente. Sem transação o setting não é aplicado e o sintoma é "sumiu tudo", não "vazou tudo".
 */
export async function comEvento<T>(
  pool: Pool,
  eventoId: string,
  executar: (cliente: PoolClient) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventoId)) {
    // Falha alto em vez de assumir padrão. Um job sem event_id no payload
    // precisa quebrar, não processar contra um evento arbitrário.
    throw new ErroEventoAusente(eventoId);
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    // Parametrizado: event_id vem de payload de job e de rota, e concatenar
    // aqui seria injeção no lugar mais caro possível.
    await cliente.query("SELECT set_config('app.event_id', $1, true)", [eventoId]);
    const resultado = await executar(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (erro) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    cliente.release();
  }
}

export class ErroEventoAusente extends Error {
  readonly code = "event.missing";
  constructor(readonly recebido: unknown) {
    super("caminho de evento sem event_id válido");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 🔴 `contaId` vem sempre da sessão de host resolvida, nunca do cliente — é ele que decide quais eventos a transação enxerga. */
export async function comConta<T>(
  pool: Pool,
  contaId: string,
  executar: (cliente: PoolClient) => Promise<T>,
): Promise<T> {
  if (!UUID.test(contaId)) throw new ErroContaAusente(contaId);

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT set_config('app.account_id', $1, true)", [contaId]);
    const resultado = await executar(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (erro) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    cliente.release();
  }
}

export class ErroContaAusente extends Error {
  readonly code = "account.missing";
  constructor(readonly recebido: unknown) {
    super("caminho de conta sem account_id válido");
  }
}

/** Única porta declarada para cruzar eventos — quem não passa aqui não aparece na auditoria. */
export async function comAgregacao<T>(
  pool: Pool,
  motivo: string,
  auditar: (registro: { motivo: string; em: Date }) => void,
  executar: (cliente: PoolClient) => Promise<T>,
): Promise<T> {
  if (!motivo.trim()) {
    throw new Error("agregação exige motivo — é o que a auditoria registra");
  }

  const cliente = await pool.connect();
  try {
    auditar({ motivo, em: new Date() });
    await cliente.query("BEGIN");
    const resultado = await executar(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (erro) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    cliente.release();
  }
}
