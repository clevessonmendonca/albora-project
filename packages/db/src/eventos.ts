import type { Pool } from "pg";
import { comEvento } from "./evento";

export type EstadoDoEvento =
  | "aberto"
  | "nao_comecou"
  | "encerrado"
  | "slug_rotacionado"
  | "desconhecido";

export type EventoPublico = {
  eventoId: string;
  packId: string;
  comecaEm: Date;
  terminaEm: Date;
  interacaoAbreEm: Date | null;
  identityTokens: Record<string, unknown>;
};

export type Resolucao =
  | { estado: "aberto" | "nao_comecou"; evento: EventoPublico }
  | { estado: "encerrado" | "slug_rotacionado"; evento: EventoPublico }
  | { estado: "desconhecido" };

/**
 * Janela em que a fila ainda pode drenar depois de a festa acabar.
 *
 * Não é generosidade: é o convidado que fotografou às 2h, guardou o celular
 * sem sinal e só abriu o app no domingo à tarde. Fechar no fim do evento
 * jogaria fora exatamente as fotos do fim da festa.
 */
export const HORAS_APOS_EVENTO = 48;

/**
 * Resolve o slug do QR. É a primeira coisa que roda quando alguém escaneia a
 * placa da mesa, e a única consulta além do token que precisa acontecer antes
 * de existir contexto de evento.
 */
export async function resolverSlug(
  pool: Pool,
  slug: string,
  agora: Date,
): Promise<Resolucao> {
  const { rows } = await pool.query<{ event_id: string; active: boolean }>(
    "SELECT event_id, active FROM event_slugs WHERE slug = $1",
    [slug],
  );

  const encontrado = rows[0];
  if (!encontrado) return { estado: "desconhecido" };

  const evento = await comEvento(pool, encontrado.event_id, async (c) => {
    const { rows: e } = await c.query(
      `SELECT id, pack_id, starts_at, ends_at, interaction_opens_at, identity_tokens
       FROM events WHERE id = $1`,
      [encontrado.event_id],
    );
    const linha = e[0];
    if (!linha) return null;

    return {
      eventoId: linha.id as string,
      packId: linha.pack_id as string,
      comecaEm: linha.starts_at as Date,
      terminaEm: linha.ends_at as Date,
      interacaoAbreEm: linha.interaction_opens_at as Date | null,
      identityTokens: (linha.identity_tokens ?? {}) as Record<string, unknown>,
    };
  });

  if (!evento) return { estado: "desconhecido" };

  if (!encontrado.active) return { estado: "slug_rotacionado", evento };

  const limite = new Date(evento.terminaEm.getTime() + HORAS_APOS_EVENTO * 3600_000);
  if (agora >= limite) return { estado: "encerrado", evento };

  // Antes de começar o evento existe e é legítimo — só não é hora. A tela
  // diz quando é, em vez de dizer que não existe.
  if (agora < evento.comecaEm) return { estado: "nao_comecou", evento };

  return { estado: "aberto", evento };
}

/**
 * Rotaciona o slug. O antigo **não** é apagado: ele continua resolvendo, como
 * inativo, para quem escanear a placa que já foi impressa.
 */
export async function rotacionarSlug(
  pool: Pool,
  eventoId: string,
  novoSlug: string,
): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("UPDATE event_slugs SET active = false WHERE event_id = $1", [eventoId]);
    await cliente.query(
      "INSERT INTO event_slugs (slug, event_id, active) VALUES ($1, $2, true)",
      [novoSlug, eventoId],
    );
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    cliente.release();
  }
}
