import type { PoolClient } from "pg";

/**
 * O que a parede lê (spec 010).
 *
 * 🔴 Uma fonte de verdade só sobre o que é público, e é a mesma do feed:
 * `state = 'published'`. A foto que o botão de pânico tira sai daqui pela mesma
 * coluna, no mesmo instante — a parede não guarda uma segunda regra de
 * visibilidade, porque duas regras divergem e a que sobra na parede é a errada.
 *
 * O afinamento que só o telão tem — segurar com N denúncias, segurar quando o
 * classificador não respondeu — mora em `decidirExibicao()` do `@albora/core`,
 * na superfície `telao`. Ele entra aqui quando a spec 011 persistir denúncia e
 * veredito do classificador; até lá o `state` é o único sinal que o banco tem,
 * e é o mesmo que o feed respeita.
 */

const PUBLICADO = "published";

/** Teto por página da parede. A TV acumula e poda no cliente (`TETO_DO_CACHE`). */
export const TETO_DA_PAREDE = 60;

export type MidiaNaParede = {
  id: string;
  chaveFull: string;
  chaveThumb: string;
  /** Concessão `ler.identidade`: o primeiro nome de quem enviou, nunca o contato. */
  autor: string;
  criadaEm: Date;
  /** Concessão `ler.contagem`. */
  reacoes: number;
};

type Linha = {
  id: string;
  storage_key: string;
  display_name: string;
  created_at: Date;
  reacoes: number;
};

/**
 * As fotos públicas do evento, mais recentes primeiro, de dentro de uma
 * transação já escopada por `comEvento`.
 *
 * O `event_id` no WHERE é redundante sob RLS e vai mesmo assim: duas camadas
 * para a mesma invariante, como no resto do pacote. A parede é só leitura —
 * nenhuma escrita passa por aqui, por isso o crachá pode ficar na TV.
 */
export async function listarMidiaDaParede(
  cliente: PoolClient,
  eventoId: string,
  limite: number = TETO_DA_PAREDE,
): Promise<MidiaNaParede[]> {
  const teto = Math.min(Math.max(Math.trunc(limite), 1), TETO_DA_PAREDE);

  const { rows } = await cliente.query<Linha>(
    `SELECT u.id, u.storage_key, u.created_at, s.display_name,
            (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes
       FROM uploads u
       JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
      WHERE u.event_id = $1 AND u.state = $2
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows.map((l) => ({
    id: l.id,
    chaveFull: l.storage_key,
    chaveThumb: chaveDaMiniatura(l.storage_key),
    autor: l.display_name,
    criadaEm: l.created_at,
    reacoes: l.reacoes,
  }));
}

/**
 * A thumb vive ao lado do full, na mesma pasta do evento. Derivada da chave
 * gravada, nunca recalculada por data — a chave carrega o ano e o mês da
 * confirmação, e recalcular no dia seguinte apontaria para pasta que não existe.
 */
function chaveDaMiniatura(chaveFull: string): string {
  return chaveFull.endsWith("/full") ? `${chaveFull.slice(0, -"/full".length)}/thumb` : chaveFull;
}
