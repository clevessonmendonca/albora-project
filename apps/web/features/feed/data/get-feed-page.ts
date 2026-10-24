import { withEvent, listChallenges, janelaDoAlbum, type EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import { chapterTitle, planAlbumChapters } from "@/lib/domain/album/album-chapters";
import { photoPathForMission, proximaMissao } from "@/features/missions/lib/missions-utils";
import type { MomentoDoFeed } from "@/features/feed/lib/momento-do-instante";
import { recordFunnelEvent } from "@/features/guest/lib/record-funnel";
import { eventNameFromPack, packText } from "@/features/guest/lib/pack-text";
import {
  resolveMissions,
  resolveMissionsWithStatus,
  type ResolvedMission,
} from "@/features/guest/lib/resolved-missions";
import { getPool } from "@/lib/db";

export type FeedPageInput = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  evento: EventoPublico;
};

export type FeedPageData = {
  slug: string;
  eventTitle: string;
  missions: ResolvedMission[];
  copy: { missionTitle: string; proximaMissao: string };
  cameraPath: string;
  hostMessageLabel: string;
  anfitriaoPlural: string;
  momentos: MomentoDoFeed[];
  proximaMissao: { id: string; title: string; emoji: string | null; href: string } | null;
};

export async function getFeedPage(input: FeedPageInput): Promise<FeedPageData> {
  const { slug, eventoId, sessaoId, evento } = input;

  const { challenges, janela } = await withEvent(getPool(), eventoId, async (c) => ({
    challenges: await listChallenges(c, eventoId, sessaoId),
    janela: await janelaDoAlbum(c, eventoId),
  }));

  const pack = PACKS[evento.packId];
  const momentos: MomentoDoFeed[] = janela
    ? planAlbumChapters(
        {
          comecaEm: janela.comecaEm,
          terminaEm: janela.terminaEm,
          offsetMinutos: janela.offsetMinutos,
        },
        pack,
      ).flatMap((c) =>
        c.comecaEm
          ? [{ id: c.id, titulo: chapterTitle(pack, c.id), comecaEm: c.comecaEm.toISOString() }]
          : [],
      )
    : [];

  const pendente = proximaMissao(resolveMissionsWithStatus(evento.packId, challenges));

  await recordFunnelEvent(eventoId, sessaoId, "feed_open");

  return {
    slug,
    eventTitle: eventNameFromPack(evento.packId),
    missions: resolveMissions(evento.packId, challenges),
    copy: {
      missionTitle: packText(evento.packId, "missao.titulo"),
      proximaMissao: "Próxima missão",
    },
    cameraPath: `/e/${encodeURIComponent(slug)}/photo`,
    hostMessageLabel: packText(evento.packId, "recado.rotulo"),
    anfitriaoPlural: packText(evento.packId, "anfitriao.plural"),
    momentos,
    proximaMissao: pendente
      ? {
          id: pendente.id,
          title: pendente.title,
          emoji: pendente.emoji ?? null,
          href: photoPathForMission(slug, pendente.id),
        }
      : null,
  };
}
