import type { WallDisplayModel } from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import {
  Framing,
  modelName,
  modelNote,
  wallProfileText as profileText,
} from "@/features/catalog/components/wall/framing";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export { Framing, modelName, modelNote, profileText };

export function WallScreen({ pack, modelo }: { pack: Pack; modelo: WallDisplayModel }) {
  const sangra = modelo === "cheio";

  return (
    <GuestBackground background="dark" pack={pack}>
      <div
        className={cn("relative flex-1 overflow-hidden", !sangra && "p-[var(--espaco)]")}
      >
        <Framing modelo={modelo} />

        <span className="absolute bottom-6 left-6 flex items-center gap-3 rounded-pilula bg-bg-vidro px-[1.375rem] py-2.5">
          <span className="pulso size-2 rounded-full bg-acento" />
          <span className="font-titulo text-xl tracking-rotulo">ao vivo · 847 fotos</span>
        </span>

        <span className="absolute right-6 top-6 font-titulo text-2xl tracking-rotulo text-ink-2">
          {resolvePackText(pack, "landing.exemplo.nome")}
        </span>
      </div>
    </GuestBackground>
  );
}

export function PanicScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="m-0 font-titulo text-[clamp(1.75rem,4vw,2.75rem)] font-light tracking-titulo text-ink">
          {resolvePackText(pack, "landing.exemplo.nome")}
        </p>
        <p className="m-0 text-[clamp(1rem,2vw,1.35rem)] text-ink-3">Voltamos já</p>
      </div>
    </GuestBackground>
  );
}
