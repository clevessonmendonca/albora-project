import type { Pack } from "@albora/packs";
import { Badge, Frame, StatusBar, TabBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function AlbumScreen({ pack, momentos }: { pack: Pack; momentos: string[] }) {
  return (
    <GuestBackground fundo="escuro" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">O álbum</span>
        <Badge>847</Badge>
      </div>

      <div className="flex gap-1.5 overflow-hidden px-[1.125rem] pb-3.5">
        <Badge tone="accent">Tudo</Badge>
        {momentos.slice(0, 3).map((m) => (
          <Badge key={m}>{m}</Badge>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-3 gap-0.5 overflow-hidden">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className="relative aspect-square overflow-hidden">
            <Frame atmosphere variant={i} />
          </span>
        ))}
      </div>

      <TabBar active="album" />
    </GuestBackground>
  );
}
