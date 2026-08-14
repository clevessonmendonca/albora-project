import type { Pack } from "@albora/packs";
import { Frame, PrimaryButton, SecondaryButton } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function ReportScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <div className="relative flex-1">
        <Frame atmosphere variant={9} />
        <div className="absolute inset-x-0 bottom-0 bg-veu-topo p-5">
          <div className="grid gap-3 rounded-superficie border border-linha bg-superficie p-5">
            <p className="m-0 font-titulo text-[1.0625rem]">Sinalizar esta foto</p>
            <p className="m-0 text-[0.875rem] leading-normal text-ink-2">
              A moderação revisa depois. O upload não trava.
            </p>
            <span className="grid min-h-11 items-center rounded-pilula border border-linha px-3.5 text-[0.9rem] text-ink-3">
              Motivo (opcional)
            </span>
            <PrimaryButton>Sinalizar</PrimaryButton>
            <SecondaryButton>Bloquear autor</SecondaryButton>
          </div>
        </div>
      </div>
    </GuestBackground>
  );
}
