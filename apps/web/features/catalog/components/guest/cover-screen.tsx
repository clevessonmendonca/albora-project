import { resolvePackText, type Pack } from "@albora/packs";
import {
  BackIcon,
  Badge,
  Button,
  FloatingButton,
  Frame,
  GridIcon,
  MoreIcon,
  PersonIcon,
  ShareIcon,
  StackIcon,
  Star,
} from "@albora/ui-web";
import type { Background } from "@albora/tokens";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function CoverScreen({
  pack,
  moments,
  background,
}: {
  pack: Pack;
  moments: string[];
  background: Background;
}) {
  const chapters = moments.slice(0, 5);
  const atalhos = [
    { r: "Álbum", v: "847", i: <GridIcon size={20} /> },
    { r: "Feed", v: "ao vivo", i: <StackIcon size={20} /> },
    { r: "Missões", v: "1 de 4", i: <Star size={20} /> },
    { r: "Convidados", v: "112", i: <PersonIcon size={20} /> },
  ];

  return (
    <GuestBackground background={background} pack={pack}>
      <div className="relative h-[20.5rem] shrink-0">
        <Frame atmosphere variant={1} />
        <div className="absolute inset-0 bg-veu-capa" />
        <div className="absolute inset-x-[1.125rem] top-11 flex justify-between">
          <FloatingButton>
            <BackIcon />
          </FloatingButton>
          <span className="flex gap-2">
            <FloatingButton>
              <ShareIcon size={19} />
            </FloatingButton>
            <FloatingButton>
              <MoreIcon />
            </FloatingButton>
          </span>
        </div>
      </div>

      <div className="relative -mt-13 px-6 text-center">
        <p className="font-titulo text-[1.875rem] font-light leading-tight tracking-titulo">
          {resolvePackText(pack, "landing.exemplo.nome")}
        </p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-2">8 de novembro · 112 pessoas fotografando</p>
      </div>

      <div className="grid grid-cols-4 gap-2 px-[1.125rem] pt-5 pb-[1.125rem]">
        {atalhos.map((a) => (
          <span
            key={a.r}
            className="flex flex-col items-center gap-[0.3125rem] rounded-token bg-superficie px-1 py-3 text-ink-2"
          >
            {a.i}
            <span className="text-[0.625rem] uppercase tracking-rotulo">{a.r}</span>
            <span className="text-[0.6875rem] text-ink">{a.v}</span>
          </span>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between px-[1.125rem] pb-3">
          <span className="font-titulo text-base">Os momentos</span>
          <span className="text-[0.6875rem] text-ink-3">arraste</span>
        </div>
        <div className="flex gap-2.5 overflow-hidden px-[1.125rem]">
          {chapters.map((c, i) => {
            const central = i === 1;
            return (
              <span
                key={c}
                className={`relative aspect-[9/16] shrink-0 overflow-hidden rounded-token ${
                  central ? "w-[9.25rem]" : "w-20 opacity-60"
                }`}
              >
                <Frame atmosphere variant={i * 6 + 2} />
                <span className="absolute inset-0 bg-veu-card" />
                {central && (
                  <span className="absolute left-2 top-2">
                    <Badge tone="accent">
                      <span className="pulso size-1 rounded-full bg-current" />
                      agora
                    </Badge>
                  </span>
                )}
                <span
                  className={`absolute inset-x-2.5 bottom-2.5 block font-titulo leading-tight tracking-titulo ${
                    central ? "text-[0.9375rem]" : "text-[0.6875rem]"
                  }`}
                >
                  {c}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="px-6 pt-[1.125rem] pb-8">
        <Button width="full">Enviar foto</Button>
      </div>
    </GuestBackground>
  );
}
