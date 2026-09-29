import type { ReactNode } from "react";
import { GridIcon, PersonIcon } from "./icons";
import { Star } from "./star";

/** Tabs idênticas nos três navs — Feed/Início fica de fora porque rota e label divergem por nav. */
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
    id: "album",
    label: "Explorar",
    path: "/album",
    column: "col-start-2",
    icon: <GridIcon size={22} />,
  },
  {
    id: "missoes",
    label: "Missões",
    path: "/missions",
    column: "col-start-4",
    icon: <Star size={22} />,
  },
  {
    id: "minhas",
    label: "Perfil",
    path: "/my-photos",
    column: "col-start-5",
    icon: <PersonIcon size={22} />,
  },
];
