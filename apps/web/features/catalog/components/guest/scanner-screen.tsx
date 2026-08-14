import type { Pack } from "@albora/packs";
import { Frame, SecondaryButton } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function ScannerScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <div className="relative flex-1 bg-superficie">
        <Frame atmosphere variant={2} />
        <span className="absolute inset-[18%] rounded-token border border-acento shadow-scan-mascara" />
        <p className="absolute inset-x-[1.125rem] top-4 m-0 text-center font-titulo text-[1.0625rem] [text-shadow:0_1px_4px_var(--bg)]">
          Aponte para o QR da festa
        </p>
      </div>
      <div className="px-[1.125rem] pt-4 pb-8">
        <SecondaryButton>Já tenho o link</SecondaryButton>
      </div>
    </GuestBackground>
  );
}
