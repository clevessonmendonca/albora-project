import type { Pack } from "@albora/packs";
import {
  Avatar,
  BackIcon,
  CommentIcon,
  FloatingButton,
  Frame,
  MoreIcon,
  ShareIcon,
  Star,
  StatusBar,
} from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function PhotoDetailScreen({ pack, own = false }: { pack: Pack; own?: boolean }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="relative aspect-[4/5] shrink-0">
        <Frame atmosphere variant={7} />
        <div className="absolute inset-x-[1.125rem] top-3 flex justify-between">
          <FloatingButton>
            <BackIcon />
          </FloatingButton>
          <FloatingButton>
            <MoreIcon />
          </FloatingButton>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-[1.125rem] py-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar name="Bia" />
          <span className="flex-1">
            <span className="block text-sm">Bia</span>
            <span className="block text-[0.6875rem] text-ink-3">23h41 · Pista</span>
          </span>
          {own && (
            <span className="inline-flex items-center gap-1.5 rounded-pilula border border-linha px-3 py-1.5 text-xs text-ink-2">
              ✕ remover
            </span>
          )}
        </div>

        <div className="flex items-center gap-5 py-3.5">
          <span className="flex items-center gap-1.5 text-ink">
            <Star size={24} filled />
            <span className="text-[0.84375rem]">12</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CommentIcon size={22} />
            <span className="text-[0.84375rem]">3</span>
          </span>
          {own && (
            <span className="ml-auto">
              <ShareIcon size={21} />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t border-linha pt-3.5">
          {[
            ["Tio João", "essa é a melhor da noite"],
            ["Lele", "que luz linda"],
          ].map(([nome, txt]) => (
            <p key={nome} className="text-[0.84375rem] leading-snug text-ink-2">
              <span className="text-ink">{nome}</span> {txt}
            </p>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2.5 rounded-pilula bg-superficie px-4 py-2.5">
          <span className="flex-1 text-[0.8125rem] text-ink-3">Escreva um comentário…</span>
          <span className="text-[0.78125rem] font-medium text-acento-texto">enviar</span>
        </div>
      </div>
    </GuestBackground>
  );
}
