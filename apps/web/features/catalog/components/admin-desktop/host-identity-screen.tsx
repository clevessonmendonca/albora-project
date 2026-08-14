import type { Pack } from "@albora/packs";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { HostSidebar } from "@/features/catalog/components/host-sidebar";
import { WizardField } from "@/features/catalog/components/wizard-field";
import { CoverScreen } from "@/features/catalog/components/guest/cover-screen";

export function HostIdentityScreen({ pack, moments }: { pack: Pack; moments: string[] }) {
  return (
    <GuestBackground background="light" pack={pack}>
      <div className="flex h-full">
        <HostSidebar pack={pack} active="Identidade" />

        <main className="flex flex-1 gap-8 overflow-hidden px-8 py-7">
          <div className="flex w-64 shrink-0 flex-col gap-5">
            <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">
              Identidade
            </p>
            <WizardField label="Cor de destaque" value="Âmbar do pack" />
            <WizardField label="Fonte do título" value="Serif do pack" />
            <WizardField label="Raio dos cantos" value="Suave" />
            <p className="m-0 text-[0.8125rem] leading-normal text-ink-2">
              Cada mudança re-renderiza o preview com resolveTokens real — o mesmo resolvedor do
              telão e da peça impressa.
            </p>
          </div>

          <div className="grid flex-1 place-items-center overflow-hidden rounded-token bg-superficie-alta">
            <div className="relative h-[28rem] w-56 origin-center scale-[0.92]">
              <CoverScreen pack={pack} moments={moments} background="dark" />
            </div>
          </div>
        </main>
      </div>
    </GuestBackground>
  );
}
