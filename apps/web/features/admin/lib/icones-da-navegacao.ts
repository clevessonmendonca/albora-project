import {
  BarChart3,
  Home,
  Image,
  Lightbulb,
  MessageCircle,
  MonitorPlay,
  Palette,
  QrCode,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { DestinoId } from "./navegacao";

export const ICONES_DA_NAVEGACAO: Record<DestinoId, LucideIcon> = {
  inicio: Home,
  convidados: Users,
  album: Image,
  telao: MonitorPlay,
  missoes: Sparkles,
  insights: BarChart3,
  comunidade: MessageCircle,
  /** O protótipo repete o ícone de faísca aqui; duas faíscas na mesma barra deixam de distinguir destino. */
  inspiracao: Lightbulb,
  identidade: Palette,
  convite: QrCode,
  configuracoes: Settings,
};
