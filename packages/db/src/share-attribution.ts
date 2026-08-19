import type { Pool, PoolClient } from "pg";
import { comAgregacao } from "./event";

/**
 * Atribuição de origem do compartilhamento (spec A1).
 *
 * A moldura na foto já leva de volta ao MESMO evento (`frame-renderer.ts`,
 * `via=link`) — canal viral que já funciona e que este arquivo não toca. O
 * que falta é a ponte pra FORA do evento: um convite discreto no recap que
 * aponta pra landing genérica (`/?ref=<ref_token>`), pra medir "quantas
 * visitas terminam em alguém criando a própria festa".
 *
 * `ref_token` é opaco, um por evento, mintado uma vez e nunca rotaciona —
 * não é o slug (que rotaciona) nem o `event_id` cru (chave interna não deve
 * circular em querystring pública que passa por Analytics/pixel de terceiro).
 */

const ALFABETO_REF = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TAMANHO_REF = 24;
const MAX_TENTATIVAS_REF = 6;

export type RefDeCompartilhamento = { refToken: string };

function gerarRefToken(rand: () => number): string {
  let s = "";
  for (let i = 0; i < TAMANHO_REF; i++) {
    s += ALFABETO_REF[Math.floor(rand() * ALFABETO_REF.length)];
  }
  return s;
}

function ehColisaoDeRef(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

/**
 * Mintado uma vez, dentro da mesma transação de `criarEvento` — nunca
 * rotaciona. Mesmo padrão de retry-em-colisão de `gerarSlug`.
 *
 * 🔴 Exige `app.event_id` já resolvido na transação (RLS de `event_share_refs`
 * é o padrão comum) — `criarEvento` seta o GUC antes de chamar isto.
 */
export async function mintarRefDeCompartilhamento(
  cliente: PoolClient,
  eventoId: string,
  rand: () => number = Math.random,
): Promise<RefDeCompartilhamento> {
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS_REF; tentativa++) {
    const refToken = gerarRefToken(rand);
    try {
      await cliente.query(
        `INSERT INTO event_share_refs (event_id, ref_token) VALUES ($1, $2)`,
        [eventoId, refToken],
      );
      return { refToken };
    } catch (e) {
      if (ehColisaoDeRef(e)) continue;
      throw e;
    }
  }
  throw new Error("não foi possível gerar um ref_token livre");
}

/** Leitura dentro de `comEvento` — para embutir no link do recap. */
export async function refDoEvento(cliente: PoolClient, eventoId: string): Promise<string | null> {
  const { rows } = await cliente.query<{ ref_token: string }>(
    `SELECT ref_token FROM event_share_refs WHERE event_id = $1`,
    [eventoId],
  );
  return rows[0]?.ref_token ?? null;
}

/**
 * Só usada pelo job de reconciliação, via `comAgregacao` — nunca em caminho
 * de convidado. Casa `product_events.origin_ref` com `event_share_refs` pra
 * alimentar `analytics_snapshots` (scope='event'). Enriquecimento, nunca
 * bloqueante: se este job falhar, o share e o `origin_ref` já gravados não
 * são afetados.
 */
export async function eventoDoRef(
  pool: Pool,
  refToken: string,
  auditar: (registro: { motivo: string; em: Date }) => void,
): Promise<string | null> {
  return comAgregacao(pool, "reconciliacao_share_ref", auditar, async (c) => {
    const { rows } = await c.query<{ event_id: string }>(
      `SELECT event_id FROM event_share_refs WHERE ref_token = $1`,
      [refToken],
    );
    return rows[0]?.event_id ?? null;
  });
}
