import type { Pack } from "@albora/packs";
import { Frame, SecondaryButton, ShareIcon, StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function ConfirmScreen({ pack, ios = false }: { pack: Pack; ios?: boolean }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="flex min-h-0 flex-1 flex-col px-8 pb-8 pt-6">
        <div className="relative mb-6 aspect-[3/4] w-[min(62%,16rem)] shrink-0 overflow-hidden rounded-superficie">
          <Frame atmosphere variant={7} />
        </div>

        <p className="m-0 font-titulo text-[1.75rem] font-light leading-tight tracking-titulo">
          Foto 1.
          <br />
          <em className="font-normal">Já tá no telão.</em>
        </p>

        <div className="mt-5 max-w-[34ch]">
          <p className="mb-3 flex items-baseline gap-3 text-[0.88rem] leading-relaxed text-ink-2">
            <span className="shrink-0 font-titulo text-[0.68rem] font-normal uppercase tracking-rotulo text-acento-texto">
              App
            </span>
            Instale e receba suas fotos depois da festa
          </p>
          {ios ? (
            <ol className="mb-3 ml-0 flex list-none flex-col gap-2.5 p-0">
              <li className="flex items-center gap-3 text-[0.88rem] leading-snug text-ink-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-superficie border border-linha text-acento">
                  <ShareIcon size={18} />
                </span>
                <span>
                  <span className="mb-0.5 block font-titulo text-[0.62rem] uppercase tracking-rotulo text-acento-texto">
                    1
                  </span>
                  Toque em Compartilhar
                </span>
              </li>
              <li className="flex items-center gap-3 text-[0.88rem] leading-snug text-ink-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-superficie border border-linha font-titulo text-acento">
                  +
                </span>
                <span>
                  <span className="mb-0.5 block font-titulo text-[0.62rem] uppercase tracking-rotulo text-acento-texto">
                    2
                  </span>
                  Adicionar à Tela de Início
                </span>
              </li>
            </ol>
          ) : (
            <SecondaryButton>Instalar na tela inicial</SecondaryButton>
          )}
          <p className="mb-3 mt-2 text-[0.85rem] text-ink-3">Agora não</p>
          <SecondaryButton>Abrir no app com código</SecondaryButton>
        </div>

        <span className="flex-1" />

        <span className="grid min-h-14 place-items-center rounded-pilula bg-ink text-[0.97rem] font-medium text-bg">
          Continuar tirando
        </span>
      </div>
    </GuestBackground>
  );
}
