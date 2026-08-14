import { texto, type Pack } from "@albora/packs";
import {
  Avatar,
  Badge,
  CommentIcon,
  Frame,
  Star,
  StatusBar,
  TabBar,
} from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function FeedScreen({ pack, moments }: { pack: Pack; moments: string[] }) {
  const chapters = moments.slice(0, 4);

  return (
    <GuestBackground fundo="escuro" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">
          {texto(pack, "landing.exemplo.nome")}
        </span>
        <Badge>847 fotos</Badge>
      </div>

      <div className="flex gap-3.5 overflow-hidden px-[1.125rem] pb-4">
        {chapters.map((m, i) => (
          <span key={m} className="flex w-15 shrink-0 flex-col items-center gap-1.5">
            <span className={`relative size-14 rounded-full p-0.5 ${i < 2 ? "bg-acento" : "bg-linha"}`}>
              <span className="relative block size-full overflow-hidden rounded-full">
                <Frame atmosphere variant={i * 5} />
              </span>
            </span>
            <span className="text-center text-[0.5625rem] leading-tight text-ink-2">{m}</span>
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-hidden border-t border-linha">
        <div className="flex items-center gap-2.5 px-[1.125rem] py-3.5">
          <Avatar name="Bia" />
          <span className="flex-1 text-[0.84375rem]">Bia</span>
          <span className="text-[0.6875rem] text-ink-3">23h · Pista</span>
        </div>

        <div className="relative aspect-[4/5]">
          <Frame atmosphere variant={7} />
        </div>

        <div className="flex items-center gap-[1.125rem] px-[1.125rem] py-2.5 text-ink">
          <span className="flex items-center gap-1.5">
            <Star size={24} filled />
            <span className="text-[0.84375rem]">12</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CommentIcon size={22} />
            <span className="text-[0.84375rem]">3</span>
          </span>
        </div>

        <p className="px-[1.125rem] text-[0.84375rem] leading-snug text-ink-2">
          <span className="text-ink">Tio João</span> essa é a melhor da noite
        </p>
      </div>

      <TabBar active="feed" />
    </GuestBackground>
  );
}
