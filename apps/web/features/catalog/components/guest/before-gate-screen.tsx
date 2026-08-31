import { resolvePackText, type Pack } from "@albora/packs";
import { Badge, Frame, StatusBar, TabBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function BeforeGateScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">
          {resolvePackText(pack, "landing.exemplo.nome")}
        </span>
        <Badge>847 fotos</Badge>
      </div>

      <div className="px-[1.125rem] pb-4">
        <div className="flex items-start gap-3 rounded-token bg-superficie px-4 py-3.5">
          <span className="pulso mt-1.5 size-[0.4375rem] shrink-0 rounded-full bg-acento" />
          <span className="text-[0.8125rem] leading-snug text-ink-2">
            As reações e os comentários abrem no horário que o anfitrião escolheu. Até lá, continue
            enviando: tudo já está indo pro álbum.
          </span>
        </div>
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-hidden px-[1.125rem]">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="relative aspect-square overflow-hidden rounded-token">
            <Frame atmosphere variant={i * 3} />
          </span>
        ))}
      </div>

      <TabBar active="feed" />
    </GuestBackground>
  );
}
