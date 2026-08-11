import type { PoolClient } from "pg";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `timestamptz` no formato texto do Postgres, com microssegundos e deslocamento
 * explícito. O cursor guarda esta string, e não um `Date`: `Date` tem
 * milissegundo, a coluna tem microssegundo, e a diferença é item repetido ou
 * item pulado entre duas páginas de uma festa que recebe foto o tempo todo.
 */
const INSTANTE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2}){0,2}$/;

/**
 * O único estado que o feed lê.
 *
 * 🔴 Não existe segunda fonte de verdade sobre o que é público. A foto que o
 * botão de pânico tira do telão sai daqui pela mesma consulta, no mesmo
 * instante, porque é a mesma coluna.
 */
const PUBLICADO = "published";

export const TAMANHO_PAGINA = 24;

/**
 * O que a superfície pode mostrar. Vem de `modoInteracao()` do `@albora/core`,
 * que é onde a regra do gate mora — este pacote repete a forma, nunca a regra.
 */
export type ModoFeed = "espelho" | "completo";

export type ItemFeed = {
  id: string;
  /** Miniatura primeiro: é ela que faz a primeira tela em 3G lento. */
  chaveThumb: string;
  chaveFull: string;
  missaoId: string | null;
  legenda: string | null;
  lugar: string | null;
  autor: string;
  criadaEm: Date;
  /**
   * Ausente — não zero — antes do gate. Um número escondido pelo CSS é um
   * número que qualquer um lê com o devtools aberto.
   */
  reacoes?: number;
};

export type PaginaFeed = {
  itens: ItemFeed[];
  proximoCursor: string | null;
};

export type EntradaFeed = {
  eventoId: string;
  modo: ModoFeed;
  missaoId: string | null;
  cursor: string | null;
  limite?: number | undefined;
};

type LinhaFeed = {
  id: string;
  storage_key: string;
  challenge_id: string | null;
  caption: string | null;
  place: string | null;
  display_name: string;
  created_at: Date;
  created_at_txt: string;
  reacoes?: number;
};

/**
 * O horário em que a interação abre, de dentro de uma transação já escopada.
 *
 * Devolve `null` quando o evento não é visível — que sob RLS é o mesmo que não
 * existir. Quem chama traduz isso em página vazia, nunca em erro: uma sessão de
 * outro evento tem de receber "não há nada aqui", e não a confirmação de que
 * aquele id existe em algum lugar.
 */
export async function gateDoEvento(
  cliente: PoolClient,
  eventoId: string,
): Promise<{ interacaoAbreEm: Date | null } | null> {
  if (!UUID.test(eventoId)) return null;

  const { rows } = await cliente.query<{ interaction_opens_at: Date | null }>(
    "SELECT interaction_opens_at FROM events WHERE id = $1",
    [eventoId],
  );

  const linha = rows[0];
  if (!linha) return null;

  return { interacaoAbreEm: linha.interaction_opens_at };
}

/**
 * Uma página do feed, mais recente primeiro.
 *
 * **Cursor, nunca OFFSET.** Numa festa chegam fotos enquanto a pessoa rola: com
 * OFFSET, cada foto nova empurra a janela e o convidado vê o mesmo item duas
 * vezes e perde outro no meio. O cursor é a posição `(created_at, id)` do
 * último item entregue, e foto nova nasce *acima* dela — nunca é revisitada nem
 * atropela o que ainda falta descer.
 *
 * O par existe porque `created_at` sozinho não é único: duas fotos confirmadas
 * no mesmo microssegundo empatariam, e um empate num cursor é exatamente o item
 * que some.
 */
export async function listarFeed(cliente: PoolClient, entrada: EntradaFeed): Promise<PaginaFeed> {
  const limite = Math.min(Math.max(entrada.limite ?? TAMANHO_PAGINA, 1), TAMANHO_PAGINA);

  const parametros: unknown[] = [entrada.eventoId, PUBLICADO];
  const filtros: string[] = ["u.event_id = $1", "u.state = $2"];

  if (entrada.missaoId !== null) {
    if (!UUID.test(entrada.missaoId)) return { itens: [], proximoCursor: null };
    parametros.push(entrada.missaoId);
    filtros.push(`u.challenge_id = $${parametros.length}`);
  }

  if (entrada.cursor !== null) {
    const posicao = decodificarCursor(entrada.cursor);
    parametros.push(posicao.instante, posicao.id);
    filtros.push(
      `(u.created_at, u.id) < ($${parametros.length - 1}::timestamptz, $${parametros.length}::uuid)`,
    );
  }

  // A contagem nem é calculada antes do gate. Omitir na serialização deixaria o
  // custo de pé e a decisão longe do lugar onde a regra vale.
  const contagem =
    entrada.modo === "completo"
      ? ", (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes"
      : "";

  parametros.push(limite + 1);

  const { rows } = await cliente.query<LinhaFeed>(
    `SELECT u.id, u.storage_key, u.challenge_id, u.caption, u.place,
            u.created_at, u.created_at::text AS created_at_txt,
            s.display_name${contagem}
       FROM uploads u
       JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
      WHERE ${filtros.join(" AND ")}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $${parametros.length}`,
    parametros,
  );

  const temMais = rows.length > limite;
  const pagina = temMais ? rows.slice(0, limite) : rows;
  const ultima = pagina[pagina.length - 1];

  return {
    itens: pagina.map((l) => paraItem(l, entrada.modo)),
    proximoCursor: temMais && ultima ? codificarCursor(ultima.created_at_txt, ultima.id) : null,
  };
}

function paraItem(linha: LinhaFeed, modo: ModoFeed): ItemFeed {
  const item: ItemFeed = {
    id: linha.id,
    chaveThumb: chaveDaMiniatura(linha.storage_key),
    chaveFull: linha.storage_key,
    missaoId: linha.challenge_id,
    legenda: linha.caption,
    lugar: linha.place,
    autor: linha.display_name,
    criadaEm: linha.created_at,
  };

  if (modo === "completo") item.reacoes = linha.reacoes ?? 0;

  return item;
}

/**
 * A thumb vive ao lado do full, sob a mesma pasta do evento.
 *
 * Derivada da chave gravada, e não recalculada por data: a chave carrega o
 * ano e o mês da confirmação, e recalcular no dia seguinte apontaria para uma
 * pasta que nunca existiu.
 */
function chaveDaMiniatura(chaveFull: string): string {
  return chaveFull.endsWith("/full") ? `${chaveFull.slice(0, -"/full".length)}/thumb` : chaveFull;
}

/**
 * O cursor é opaco para o cliente e não carrega nada que ele já não tenha: o
 * instante e o id do último item que recebeu. Sem `event_id` dentro — um cursor
 * de outra festa não teria como virar caminho até ela, e a RLS ainda o pararia,
 * mas nem chega a existir a chance.
 */
export function codificarCursor(instante: string, id: string): string {
  return Buffer.from(`${instante}|${id}`, "utf8").toString("base64url");
}

export function decodificarCursor(bruto: string): { instante: string; id: string } {
  let texto: string;
  try {
    texto = Buffer.from(bruto, "base64url").toString("utf8");
  } catch {
    throw new ErroCursorInvalido();
  }

  const separador = texto.lastIndexOf("|");
  if (separador < 0) throw new ErroCursorInvalido();

  const instante = texto.slice(0, separador);
  const id = texto.slice(separador + 1);

  // Postgres estoura ao comparar com texto que não é timestamp nem uuid, e um
  // cursor chega do cliente. A recusa aqui é um 422; lá seria 500 com a
  // consulta na mensagem.
  if (!INSTANTE.test(instante) || !UUID.test(id)) throw new ErroCursorInvalido();

  return { instante, id };
}

export class ErroCursorInvalido extends Error {
  readonly code = "feed.cursor_invalido";
  constructor() {
    super("cursor inválido");
  }
}
