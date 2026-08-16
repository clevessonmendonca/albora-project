import type { Pack } from "@albora/packs";
import { Badge, Frame, StatusBar, TabBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function MyPhotosScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">Minhas</span>
        <Badge>14</Badge>
      </div>

      <div className="px-[1.125rem] pb-3.5">
        <div className="flex items-center gap-3 rounded-token bg-superficie px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alta">
            <span className="ml-0.5 size-0 border-y-[0.3125rem] border-l-[0.5rem] border-y-transparent border-l-ink-2" />
          </span>
          <span className="flex-1 text-[0.8125rem]">Seu vídeo grátis</span>
          <Badge>1 usado</Badge>
        </div>
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-3 gap-1.5 overflow-hidden px-[1.125rem]">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="relative aspect-square overflow-hidden rounded-token">
            <Frame atmosphere variant={i * 4 + 1} />
            {i === 0 && (
              <span className="absolute right-1 bottom-1 inline-flex items-center gap-1 rounded-pilula bg-bg-vidro-forte px-1.5 py-0.5 text-[0.5625rem] text-ink">
                <span className="size-0 border-y-[0.1875rem] border-l-[0.3125rem] border-y-transparent border-l-current" />
                0:47
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="mx-[1.125rem] mb-3 mt-3 rounded-token bg-superficie px-4 py-3">
        <p className="m-0 font-titulo text-[1.0625rem]">Colagem da noite</p>
        <p className="mb-2 mt-1 text-[0.8125rem] leading-snug text-ink-2">
          Até quatro fotos suas, com a moldura desta festa, prontas para o Instagram.
        </p>
        <span className="inline-flex rounded-pilula bg-acento px-4 py-2 text-[0.8125rem] font-medium text-sobre-acento">
          Compartilhar colagem
        </span>
      </div>

      <TabBar active="minhas" />
    </GuestBackground>
  );
}
