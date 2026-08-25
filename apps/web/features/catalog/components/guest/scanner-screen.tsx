import type { Pack } from "@albora/packs";
import { Frame, SecondaryButton, StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function ScannerScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="relative flex-1 overflow-hidden">
        <Frame atmosphere variant={2} />

        {/* viewfinder com shadow-scan-mascara escurecendo tudo fora do quadrado */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative size-[62%]">
            <span className="absolute inset-0 rounded-[0.75rem] shadow-scan-mascara" />

            {/* cantos */}
            <span className="absolute top-0 left-0 size-7 rounded-tl-token border-l-2 border-t-2 border-acento" />
            <span className="absolute top-0 right-0 size-7 rounded-tr-token border-r-2 border-t-2 border-acento" />
            <span className="absolute bottom-0 left-0 size-7 rounded-bl-token border-b-2 border-l-2 border-acento" />
            <span className="absolute bottom-0 right-0 size-7 rounded-br-token border-b-2 border-r-2 border-acento" />

            {/* linha de scan animada */}
            <span className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-acento opacity-60" />
          </div>
        </div>

        <p className="absolute inset-x-[1.125rem] top-5 m-0 text-center font-titulo text-[1.0625rem] [text-shadow:0_1px_8px_color-mix(in_srgb,var(--noite)_70%,transparent)]">
          Aponte para o QR da festa
        </p>

        <p className="absolute inset-x-[1.125rem] bottom-5 m-0 text-center text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Mesa · convite · cartão de missões
        </p>
      </div>

      <div className="px-[1.125rem] pt-4 pb-8">
        <SecondaryButton>Já tenho o link</SecondaryButton>
      </div>
    </GuestBackground>
  );
}
