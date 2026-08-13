import type { Pool, PoolClient } from "pg";
import { comConta, comEvento } from "./evento";

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
  /** Id de preset sugerido pelo anfitrião. `null` = tira na ordem do catálogo. */
  filtroRecomendado: string | null;
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
      `SELECT id, pack_id, starts_at, ends_at, interaction_opens_at, identity_tokens,
              recommended_filter
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
      filtroRecomendado: (linha.recommended_filter ?? null) as string | null,
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
 * O pack do evento, de dentro de uma transação já escopada.
 *
 * Existe para o servidor validar contra conjunto fechado o que o cliente
 * manda — lugar, missão, filtro. Whitelist vinda do banco, não do corpo da
 * requisição.
 */
export async function packDoEvento(cliente: PoolClient, eventoId: string): Promise<string | null> {
  const { rows } = await cliente.query<{ pack_id: string }>(
    "SELECT pack_id FROM events WHERE id = $1",
    [eventoId],
  );

  return rows[0]?.pack_id ?? null;
}

/** Slug legível, sem l/o/0/1: vai impresso na placa e alguém pode reconferir. */
const ALFABETO_SLUG = "abcdefghijkmnpqrstuvwxyz23456789";
const TAMANHO_SLUG = 8;

function gerarSlug(rand: () => number): string {
  let s = "";
  for (let i = 0; i < TAMANHO_SLUG; i++) s += ALFABETO_SLUG[Math.floor(rand() * ALFABETO_SLUG.length)];
  return s;
}

function ehColisaoDeSlug(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

export type NovoEvento = {
  accountId: string;
  packId: string;
  comecaEm: Date;
  terminaEm: Date;
  expectedGuests?: number;
  identityTokens?: Record<string, unknown>;
  /** Chaves de vocabulário do pack (`missao.*`). Vazio = nenhuma missão semeada. */
  missoes?: readonly string[];
};

/**
 * Cria o evento de uma conta (spec 009).
 *
 * 🔴 Roda em `comConta`: a política `conta_evento` de `events` e o `WITH CHECK`
 * garantem que a linha nasce presa ao `accountId` da sessão de host — uma conta
 * não cria evento para outra. O `event_slugs` (fora da RLS) e o `events`
 * nascem na mesma transação: um evento sem porta de QR não existiria para o
 * convidado.
 *
 * O slug é sorteado e reaposta na colisão — improvável, mas não pode virar erro
 * na cara do casal que só quis criar a festa. O `pack_id` é conferido pela FK:
 * pack fora do conjunto estoura antes de qualquer linha.
 */
export async function criarEvento(
  pool: Pool,
  entrada: NovoEvento,
  rand: () => number = Math.random,
): Promise<{ eventoId: string; slug: string }> {
  const convidados =
    entrada.expectedGuests !== undefined ? Math.trunc(entrada.expectedGuests) : 150;
  if (!Number.isFinite(convidados) || convidados <= 0) {
    throw new Error("expected_guests inválido");
  }

  return comConta(pool, entrada.accountId, async (c) => {
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const slug = gerarSlug(rand);
      try {
        const { rows } = await c.query<{ id: string }>(
          `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, identity_tokens, expected_guests)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            entrada.accountId,
            entrada.packId,
            slug,
            entrada.comecaEm,
            entrada.terminaEm,
            JSON.stringify(entrada.identityTokens ?? {}),
            convidados,
          ],
        );
        const eventoId = rows[0]!.id;
        await c.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [slug, eventoId]);

        const missoes = entrada.missoes ?? [];
        if (missoes.length > 0) {
          await c.query("SELECT set_config('app.event_id', $1, true)", [eventoId]);
          for (const [i, chave] of missoes.entries()) {
            await c.query(
              "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3)",
              [eventoId, chave, i + 1],
            );
          }
        }

        return { eventoId, slug };
      } catch (e) {
        if (ehColisaoDeSlug(e)) continue;
        throw e;
      }
    }
    throw new Error("não foi possível gerar um slug livre");
  });
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
