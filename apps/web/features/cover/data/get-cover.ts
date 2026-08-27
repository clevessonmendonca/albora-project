import {
  withEvent,
  filtroSemBloqueio,
  listChallenges,
  musicaDoCasal,
  eventPack,
  type EventoPublico,
} from "@albora/db";
import { exibirMusica, VALIDADE_PRESIGN_SEGUNDOS } from "@albora/core";
import { PACKS, resolvePackText } from "@albora/packs";
import { getPool } from "@/lib/db";
import { montarAlbumServido } from "@/lib/album";
import { signGet } from "@/lib/r2";
import { isInteractionOpen } from "../lib/is-interaction-open";
import { missionForMoment } from "../lib/mission-for-moment";
import { contributorsLabel } from "../lib/moment-contributors";
import type { CoverData } from "../types/cover";

export type CoverInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
};

export async function getCover(input: CoverInput): Promise<CoverData> {
  const { slug, eventoId, sessaoId, evento } = input;

  const [challenges, packId, album, chosen, coverImageUrl] = await Promise.all([
    withEvent(getPool(), eventoId, (c) => listChallenges(c, eventoId, sessaoId)),
    withEvent(getPool(), eventoId, (c) => eventPack(c, eventoId)),
    montarAlbumServido(eventoId),
    withEvent(getPool(), eventoId, (c) => musicaDoCasal(c, eventoId)),
    evento.coverImageKey
      ? signGet(evento.coverImageKey, VALIDADE_PRESIGN_SEGUNDOS).then((u) => u.toString())
      : Promise.resolve(null),
  ]);

  const pack = packId ? PACKS[packId] : undefined;
  const musicLabel = chosen ? exibirMusica(chosen.link, chosen.metadado).rotulo : null;
  const thumbs = albumThumbs(album, 5);
  const semLabel = (pack?.momentos ?? []).slice(0, 5).map((m, i) => ({
    id: m.id,
    title: pack ? resolvePackText(pack, m.chaveTitulo) : m.id,
    missionFilterId: missionForMoment(pack, m.id, challenges),
    thumbUrl: thumbs[i] ?? null,
  }));

  const contribuidoresPorMissao = await contribuidoresDosMomentos(eventoId, sessaoId, semLabel);
  const moments = semLabel.map((m) => ({
    ...m,
    contributorsLabel: m.missionFilterId
      ? (contribuidoresPorMissao.get(m.missionFilterId) ?? null)
      : null,
  }));

  return {
    slug,
    eventName: pack ? resolvePackText(pack, "landing.exemplo.nome") : "A festa",
    startsAt: evento.comecaEm.toISOString(),
    album,
    moments,
    interactionOpen: isInteractionOpen(evento),
    musicLabel,
    hostMessageLabel: pack ? resolvePackText(pack, "recado.rotulo") : "Um recado",
    hasConfessional: (pack?.confessionario?.length ?? 0) > 0,
    coverImageUrl,
  };
}

type MomentoSemLabel = { missionFilterId: string | null };

/**
 * "Quem mais fotografou esse momento" (mapa, oportunidade P2) — reaproveita
 * `challenge_id` já coletado, sem tabela nova. Uma query só para todos os
 * momentos da capa; `filtroSemBloqueio` aplica a mesma regra simétrica do
 * feed, para quem já bloqueou não aparecer como contribuidor pra quem leu.
 */
async function contribuidoresDosMomentos(
  eventoId: string,
  sessaoId: string,
  momentos: MomentoSemLabel[],
): Promise<Map<string, string | null>> {
  const missionIds = [
    ...new Set(momentos.map((m) => m.missionFilterId).filter((id): id is string => id !== null)),
  ];
  if (missionIds.length === 0) return new Map();

  const { rows } = await withEvent(getPool(), eventoId, (c) =>
    c.query<{ challenge_id: string; display_name: string; fotos: number }>(
      `SELECT u.challenge_id, s.display_name, count(*)::int AS fotos
         FROM uploads u
         JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
        WHERE u.event_id = $1
          AND u.state = 'published'
          AND u.challenge_id = ANY($2::uuid[])
          AND ${filtroSemBloqueio("s.id", 3)}
        GROUP BY u.challenge_id, s.id, s.display_name
        ORDER BY u.challenge_id, fotos DESC, s.display_name ASC`,
      [eventoId, missionIds, sessaoId],
    ),
  );

  const porMissao = new Map<string, { name: string; fotos: number }[]>();
  for (const row of rows) {
    const lista = porMissao.get(row.challenge_id) ?? [];
    lista.push({ name: row.display_name, fotos: row.fotos });
    porMissao.set(row.challenge_id, lista);
  }

  const labels = new Map<string, string | null>();
  for (const [missionId, contagens] of porMissao) {
    labels.set(missionId, contributorsLabel(contagens));
  }
  return labels;
}

function albumThumbs(album: Awaited<ReturnType<typeof montarAlbumServido>>, max: number): string[] {
  const out: string[] = [];
  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      for (const foto of pagina.fotos) {
        if (foto.url) {
          out.push(foto.url);
          if (out.length >= max) return out;
        }
      }
    }
  }
  return out;
}
