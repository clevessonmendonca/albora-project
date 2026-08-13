import { texto, type Pack } from "@albora/packs";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { LateralAnfitriao } from "@/features/catalog/components/lateral-anfitriao";
import { CampoWizard } from "@/features/catalog/components/campo-wizard";
import { TelaCapa } from "@/features/catalog/components/guest/tela-capa";

export function TelaIdentidade({ pack, momentos }: { pack: Pack; momentos: string[] }) {
  return (
    <ChaoClaro pack={pack}>
      <div className="flex h-full">
        <LateralAnfitriao pack={pack} active="Identidade" />

        <main className="flex flex-1 gap-8 overflow-hidden px-8 py-7">
          <div className="flex w-64 shrink-0 flex-col gap-5">
            <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">
              Identidade
            </p>
            <CampoWizard rotulo="Cor de destaque" valor="Âmbar do pack" />
            <CampoWizard rotulo="Fonte do título" valor="Serif do pack" />
            <CampoWizard rotulo="Raio dos cantos" valor="Suave" />
            <p className="m-0 text-[0.8125rem] leading-normal text-ink-2">
              Cada mudança re-renderiza o preview com resolverTokens real — o mesmo resolvedor do
              telão e da peça impressa.
            </p>
          </div>

          <div className="grid flex-1 place-items-center overflow-hidden rounded-token bg-superficie-alta">
            <div className="relative h-[28rem] w-56 origin-center scale-[0.92]">
              <TelaCapa pack={pack} momentos={momentos} fundo="escuro" />
            </div>
          </div>
        </main>
      </div>
    </ChaoClaro>
  );
}
