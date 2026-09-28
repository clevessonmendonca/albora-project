import {
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  Heart,
  Home,
  Layers,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Music,
  Plus,
  Settings,
  Share2,
  Sun,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Os ícones do produto, sobre Lucide.
 *
 * Eram 264 linhas de `path` escritas à mão, e o custo apareceu: o `SettingsIcon`
 * carregava um `H10.5` e um `V19.5` — comandos absolutos no meio de uma
 * sequência relativa — que arrastavam o traço para dentro da engrenagem, e o
 * peso divergia do resto do conjunto. Nenhum teste pega isso; só o olho pega, e
 * o próximo ícone colado teria a mesma chance de vir torto.
 *
 * A API pública não muda: os mais de cem usos continuam escrevendo
 * `<CameraIcon size={20} />`. O que muda é quem desenha.
 *
 * O traço fica fixado aqui, num lugar só, porque consistência de peso é o que
 * faz um conjunto ler como sistema — e era justamente o que se perdia quando
 * cada ícone trazia o seu.
 */

type IconProps = { size?: number };

/** 1.5 é o traço do conjunto. O Lucide vem em 2 e destoaria do peso do texto ao lado. */
const TRACO = 1.5;

function comTraco(Icone: LucideIcon, padrao: number) {
  return function Envolvido({ size = padrao }: IconProps) {
    return <Icone size={size} strokeWidth={TRACO} aria-hidden="true" />;
  };
}

export const CameraIcon = comTraco(Camera, 26);
export const CommentIcon = comTraco(MessageCircle, 22);
export const ShareIcon = comTraco(Share2, 22);
export const GridIcon = comTraco(LayoutGrid, 22);
export const StackIcon = comTraco(Layers, 22);
export const PersonIcon = comTraco(User, 22);
export const MoreIcon = comTraco(MoreHorizontal, 20);
export const BackIcon = comTraco(ArrowLeft, 20);
export const BookmarkIcon = comTraco(Bookmark, 21);
export const PlusIcon = comTraco(Plus, 24);
export const SunIcon = comTraco(Sun, 22);
export const MoonIcon = comTraco(Moon, 22);
export const HomeIcon = comTraco(Home, 22);
export const UsersIcon = comTraco(Users, 22);
export const SettingsIcon = comTraco(Settings, 22);
export const MusicNoteIcon = comTraco(Music, 22);
export const ChevronIcon = comTraco(ChevronRight, 18);

/**
 * Confirmação dentro de disco pequeno. Traço próprio: a 12px o `1.5` do
 * conjunto renderiza a 0,75px e some — aqui o peso aparente é que precisa
 * casar, não o número.
 */
export function CheckIcon({ size = 12 }: IconProps) {
  return <Check size={size} strokeWidth={2.5} aria-hidden="true" />;
}

/** O único com estado: preenche quando a reação está dada. */
export function HeartIcon({ size = 22, filled }: IconProps & { filled?: boolean }) {
  return (
    <Heart
      size={size}
      strokeWidth={filled ? 0 : TRACO}
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    />
  );
}
