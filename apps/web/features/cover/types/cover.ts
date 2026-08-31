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
  interactionBannerLabel: string;
  interactionOpensAt: string | null;
  interactionLabels: {
    aberta: string;
    fechada: string;
    fechadaAgendada: string;
  };
  fuso: string;
  musicLabel: string | null;
  hostMessageLabel: string;
  /** Título do confessionário resolvido do pack; null quando o pack não tem confessionário. */
  confessionalTitle: string | null;
  /** URL assinada da imagem de capa enviada pelo casal; null = usa primeira foto do álbum. */
  coverImageUrl: string | null;
};
