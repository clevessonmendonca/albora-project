import {
  CameraIcon,
  HomeIcon,
  SettingsIcon,
  ShareIcon,
  StackIcon,
  UsersIcon,
} from "@albora/ui-web";
import type { ComponentType } from "react";
import type { DestinoId } from "@/features/admin/lib/navegacao";

type IconProps = { size?: number };

/** Mapa num lugar só: a barra lateral e a bottom bar mostram os mesmos destinos, e dois mapas divergiriam na primeira mudança. */
export const ICONES_DE_DESTINO: Record<DestinoId, ComponentType<IconProps>> = {
  inicio: HomeIcon,
  fotos: CameraIcon,
  convidados: UsersIcon,
  experiencia: StackIcon,
  compartilhar: ShareIcon,
  ajustes: SettingsIcon,
};
