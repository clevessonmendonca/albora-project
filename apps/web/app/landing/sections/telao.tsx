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
          A festa inteira na parede —{" "}
          <Accent>sem cortar nenhum rosto.</Accent>
        </Heading>
        <p className="mt-5 max-w-[46ch] text-ink-2 text-[1.0625rem] leading-relaxed">
          Três de cada quatro fotos de festa são verticais. Onze
          enquadramentos que cabem a foto em pé sem decepar cabeça. Nenhum
          concorrente mostra isto — porque nenhum faz.
        </p>
        <div className="relative mt-11 aspect-video overflow-hidden border border-ink-borda">
          <Image
            src="/landing/gen/03-telao-festa.png"
            alt="Telão do Albora exibindo uma foto ao vivo num salão de festa"
            fill
            sizes="(max-width:760px) 92vw, 1100px"
            className="object-cover"
          />
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-ink-3">
          <span className="size-1.5 rounded-full bg-acento" /> O telão ao vivo
          no salão · <b className="font-semibold text-acento-texto">
            11 modelos
          </b>{" "}
          de enquadramento, foto em pé sem corte
        </div>
      </div>
    </section>
  );
}
