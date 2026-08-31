import type { Pack } from "@albora/packs";
import {
  Avatar,
  BackIcon,
  CommentIcon,
  FloatingButton,
  Frame,
  Star,
  StatusBar,
} from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

const COMMENTS = [
  { name: "Tio João", text: "essa é a melhor da noite", time: "23h41" },
  { name: "Lele", text: "que luz linda", time: "23h44" },
  { name: "Bia", text: "Obrigada! Ficou incrível mesmo", time: "23h48" },
];

export function CommentScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="flex items-center gap-3 px-[1.125rem] py-2.5">
        <FloatingButton>
          <BackIcon size={20} />
        </FloatingButton>
        <span className="font-titulo text-[1.0625rem]">Comentários</span>
      </div>

      {/* foto de contexto */}
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
        <Frame atmosphere variant={9} />
      </div>

      {/* contadores */}
      <div className="flex items-center gap-[1.125rem] px-[1.125rem] py-3 border-b border-linha">
        <span className="flex items-center gap-1.5 text-ink">
          <Star size={22} filled />
          <span className="text-[0.84375rem]">12</span>
        </span>
        <span className="flex items-center gap-1.5 text-ink-2">
          <CommentIcon size={20} />
          <span className="text-[0.84375rem]">3</span>
        </span>
      </div>

      {/* thread */}
      <div className="min-h-0 flex-1 overflow-hidden px-[1.125rem] pt-4">
        <div className="grid gap-4">
          {COMMENTS.map((c) => (
            <div key={c.name + c.time} className="flex gap-2.5">
              <Avatar name={c.name} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.84375rem] font-medium text-ink">{c.name}</span>
                  <span className="text-[0.6875rem] text-ink-3">{c.time}</span>
                </div>
                <p className="m-0 mt-0.5 text-[0.84375rem] leading-snug text-ink-2">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* input */}
      <div className="flex items-center gap-2.5 border-t border-linha px-[1.125rem] pb-7 pt-3">
        <Avatar name="Eu" />
        <span className="flex min-h-10 flex-1 items-center rounded-pilula bg-superficie px-4 text-[0.84375rem] text-ink-3">
          Escreva um comentário…
        </span>
        <span className="text-[0.78125rem] font-medium text-acento-texto">Enviar</span>
      </div>
    </GuestBackground>
  );
}
