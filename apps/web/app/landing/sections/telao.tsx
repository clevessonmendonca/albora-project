import type { Pack } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import Image from "next/image";
import type { CSSProperties } from "react";
import { Accent, Heading, Label } from "../pieces";

export function TelaoSection({ pack }: { pack: Pack }) {
  const dark = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "dark" },
  });

  return (
    <section
      id="telao"
      className="bg-bg text-ink"
      style={toVariables(dark) as CSSProperties}
    >
      <div className="mx-auto max-w-[78rem] px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(4rem,8vw,6.5rem)]">
        <Label>O telão</Label>
        <Heading size="clamp(1.875rem,4.6vw,3.375rem)">
          Olha a sua foto <Accent>no telão.</Accent>
        </Heading>
        <p className="mt-5 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-2">
          As fotos também podem fazer parte da festa enquanto ela acontece. No
          plano Completo, o álbum ganha a tela do salão.
        </p>
        <div className="telao-shot relative mt-11 overflow-hidden border border-linha aspect-video">
          <Image
            src="/landing/gen/03-telao-festa.png"
            alt="Exemplo visual de fotos em um telão de festa"
            fill
            sizes="(max-width: 760px) 92vw, 72rem"
            className="object-cover"
          />
        </div>
        <p className="mt-4 text-sm text-ink-3">
          Exemplo visual do telão. TV ou projetor não incluídos.
        </p>
      </div>
    </section>
  );
}
