import type { AlbumServido } from "@/lib/album";

export type CoverMoment = {
  id: string;
  title: string;
  missionFilterId: string | null;
  /** Miniatura real do álbum quando existir; senão a capa usa Frame. */
  thumbUrl: string | null;
  /** "Ana, João e +3 fotografaram esse momento" — null quando ninguém ainda. */
  contributorsLabel: string | null;
};

export type CoverData = {
  slug: string;
  eventName: string;
  startsAt: string;
  album: AlbumServido;
  moments: CoverMoment[];
  interactionOpen: boolean;
  musicLabel: string | null;
  hostMessageLabel: string;
  hasConfessional: boolean;
};
