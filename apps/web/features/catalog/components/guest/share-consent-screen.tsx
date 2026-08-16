import type { Pack } from "@albora/packs";
import { Button, Frame } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function ShareConsentScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <div className="relative flex-1">
        <Frame atmosphere variant={7} />
        <div className="absolute inset-x-0 bottom-0 bg-veu-topo p-5">
          <div className="grid gap-3 rounded-superficie border border-linha bg-superficie p-5">
            <p className="m-0 font-titulo text-[1.0625rem]">Postar fora da festa</p>
            <p className="m-0 text-[0.875rem] leading-normal text-ink-2">
              A foto sai com a moldura desta festa: monograma, nomes, data e o endereço da Albora.
              No Instagram ou no WhatsApp, quem receber pode guardar para sempre — não dá para
              desfazer.
            </p>
            <span className="flex items-start gap-2 text-[0.84375rem] text-ink-2">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[0.375rem] border border-acento bg-acento text-[0.6875rem] text-sobre-acento">
                ✓
              </span>
              Incluir meu primeiro nome na moldura
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" width="full">
                Agora não
              </Button>
              <Button variant="primary" size="md" width="full">
                Aceitar e postar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GuestBackground>
  );
}
