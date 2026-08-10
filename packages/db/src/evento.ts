import type { Pool, PoolClient } from "pg";

/**
 * O único lugar do produto que abre acesso ao banco num caminho de evento.
 *
 * Três coisas que ele garante, e que nenhuma delas sobrevive a ser
 * reimplementada num segundo lugar:
 *
 * 1. **Transação sempre.** `SET LOCAL` só existe dentro de uma. Sem
 *    transação o setting não é aplicado, a política não casa com nada e o
 *    sintoma é "sumiu tudo" — não "vazou tudo". Erro silencioso e enganoso.
 * 2. **`SET LOCAL`, nunca `SET`.** O pooling em modo transação devolve a
 *    conexão a cada COMMIT; um setting de sessão vaza para o próximo cliente,
 *    que é outro casamento.
 * 3. **Devolve a conexão em toda saída**, inclusive exceção e cancelamento.
 *    Conexão vazada leva o setting junto.
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

/**
 * Caminho que cruza eventos, por desenho: painel do fornecedor e
 * observabilidade. Exige papel com BYPASSRLS e **registra a chamada**.
 *
 * Não é conveniência — é a única porta declarada. Se alguém precisar cruzar
 * eventos e não passar por aqui, a auditoria não vê, e o que a auditoria não
 * vê não aconteceu.
 */
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
