import type { Pack } from "@albora/packs";
import { Frame, PrimaryButton } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function CommentScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground fundo="escuro" pack={pack}>
      <div className="relative flex-1">
        <Frame atmosphere variant={9} />
        <div className="absolute inset-x-0 bottom-0 bg-veu-topo p-5">
          <div className="grid gap-3 rounded-superficie border border-linha bg-superficie p-5">
            <p className="m-0 font-titulo text-[1.0625rem]">Comentários</p>
            <p className="m-0 text-[0.84375rem] leading-snug">
              <span className="text-ink">Bia</span> que foto linda · 23:41
            </p>
            <p className="m-0 text-[0.84375rem] leading-snug">
              <span className="text-ink">Tio João</span> essa é a melhor da noite · 23:52
            </p>
            <div className="flex gap-2">
              <span className="grid min-h-11 flex-1 items-center rounded-pilula border border-linha px-3.5 text-[0.9rem] text-ink-3">
                Escreva um comentário…
              </span>
              <PrimaryButton>Enviar</PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </GuestBackground>
  );
}
