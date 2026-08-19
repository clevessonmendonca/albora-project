import type { ReactNode } from "react";
import { GridIcon, PersonIcon } from "./icons";
import { Star } from "./star";

/**
 * Os três atalhos do rodapé do convidado que são idênticos nos três navs —
 * `TabBar`, `GuestTabBar` e `FloatingNav` concordam em label, ícone, destino
 * e coluna do grid. Só "Feed"/"Início" diverge (rota e label conforme o
 * nav), por isso fica de fora daqui e cada nav define o seu.
 */
export type SharedGuestTabId = "missoes" | "album" | "minhas";

export type SharedGuestTabDef = {
  id: SharedGuestTabId;
  label: string;
  path: string;
  column: string;
  icon: ReactNode;
};

export const SHARED_GUEST_TABS: readonly SharedGuestTabDef[] = [
  {
    id: "missoes",
    label: "Missões",
    path: "/missions",
    column: "col-start-2",
    icon: <Star size={22} />,
  },
  {
    id: "album",
    label: "Álbum",
    path: "/album",
    column: "col-start-4",
    icon: <GridIcon size={22} />,
  },
  {
    id: "minhas",
    label: "Minhas",
    path: "/my-photos",
    column: "col-start-5",
    icon: <PersonIcon size={22} />,
  },
];
