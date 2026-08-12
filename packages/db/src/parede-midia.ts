import {
  DENUNCIAS_PARA_SEGURAR,
  decidirExibicao,
  type VeredictoDoClassificador,
} from "@albora/core";
import type { PoolClient } from "pg";

/**
 * O que a parede lê (spec 010 + 011).
 *
 * 🔴 A base é uma fonte de verdade só sobre o que é público, e é a mesma do
 * feed: `state = 'published'`. Sobre ela roda `decidirExibicao()` do
 * `@albora/core` na superfície `telao` — o afinamento que só o telão tem:
 * segura com N denúncias de sessões distintas (o melhor sensor da sala), com o
 * classificador suspeito, e sob pânico ou modo endurecido do evento. A decisão
 * é do núcleo, e este módulo só a alimenta com o que o banco tem.
 */

const PUBLICADO = "published";

/**
 * `classifier_verdict` nulo é classificador **não rodado**, não "sem resposta":
 * mapeia para `limpo`. Tratar ausência como sem-resposta esconderia toda foto
 * do telão enquanto não houver classificador — fail-closed no lugar errado.
 */
function veredicto(bruto: string | null): VeredictoDoClassificador {
  return bruto === "suspeito" || bruto === "sem-resposta" ? bruto : "limpo";
}

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
  denuncias: number;
  classifier_verdict: string | null;
  released_by_host: boolean;
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

  const { rows: eventoRows } = await cliente.query<{ panic: boolean; hardened: boolean }>(
    "SELECT panic, hardened FROM events WHERE id = $1",
    [eventoId],
  );
  const evento = {
    panico: eventoRows[0]?.panic ?? false,
    modoEndurecido: eventoRows[0]?.hardened ?? false,
  };

  const { rows } = await cliente.query<Linha>(
    `SELECT u.id, u.storage_key, u.created_at, s.display_name,
            u.classifier_verdict, u.released_by_host,
            (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes,
            (SELECT count(*) FROM reports rp WHERE rp.upload_id = u.id)::int AS denuncias
       FROM uploads u
       JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
      WHERE u.event_id = $1 AND u.state = $2
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows
    .filter(
      (l) =>
        decidirExibicao(
          {
            // `state = 'published'` já filtrou o removido: quem chega aqui não está.
            removida: false,
            liberadaPeloAnfitriao: l.released_by_host,
            denuncias: l.denuncias,
            classificador: veredicto(l.classifier_verdict),
          },
          evento,
          "telao",
          DENUNCIAS_PARA_SEGURAR,
        ).visivel,
    )
    .map((l) => ({
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
