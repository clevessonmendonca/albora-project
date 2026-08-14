import type { Pack } from "@albora/packs";
import { cn, Frame, StatusBar, TabBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function MusicScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground fundo="escuro" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">Música da festa</span>
      </div>

      <div className="grid flex-1 content-start gap-4 px-[1.125rem]">
        <div className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-superficie">
          <Frame atmosphere variant={5} />
        </div>
        <p className="m-0 text-center font-titulo text-[1.125rem]">Perfect — Ed Sheeran</p>
        <p className="m-0 text-center text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Escolha do casal
        </p>
        <div className="flex h-8 items-end justify-center gap-[3px]">
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-pilula bg-acento",
                ["h-[40%]", "h-[52%]", "h-[64%]", "h-[76%]", "h-[88%]"][i % 5],
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-acento text-sobre-acento">
            ▶
          </span>
          <span className="text-[0.85rem] text-ink-3">—:——</span>
        </div>
      </div>

      <TabBar active="feed" />
    </GuestBackground>
  );
}
