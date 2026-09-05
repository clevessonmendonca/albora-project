import type { Pool, PoolClient } from "pg";
import { comAgregacao } from "./event";

/** ref_token opaco por evento — event_id cru não deve circular em querystring pública (Analytics, pixel de terceiro). */

const ALFABETO_REF = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TAMANHO_REF = 24;

export { REF_TOKEN_RE, isRefToken } from "@albora/core";

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

/** 🔴 Exige app.event_id resolvido na transação — criarEvento seta o GUC antes de chamar. Nunca rotaciona. */
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

/** Via comAgregacao — nunca em caminho de convidado; falha não afeta o share já gravado. */
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
