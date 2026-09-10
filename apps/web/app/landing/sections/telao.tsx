import type { Pack } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import Image from "next/image";
import type { CSSProperties } from "react";
import { Accent, Heading, Label } from "../pieces";

const TELAO_IMAGES = [
  ["/landing/gen/09-amigos-na-mesa.png", "Amigos na mesa"],
  ["/landing/gen/03-telao-festa.png", "Foto ao vivo no telão"],
  ["/landing/gen/07-pista-de-danca.png", "A pista de dança"],
] as const;

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
          enquadramentos que cabem a foto em pé sem cortar rostos. A tela se
          adapta ao formato da foto enquanto a festa acontece.
        </p>
        <div className="telao-moldura relative mt-11 overflow-hidden border border-ink-borda">
          <div className="telao-legenda"><span className="size-1.5 rounded-full bg-acento" /> Telão · ao vivo</div>
          <div className="telao-polaroides">
            {TELAO_IMAGES.map(([src, alt], index) => (
              <figure className={`telao-polaroide telao-polaroide-${index + 1}`} key={src}>
                <div className="relative aspect-[9/13] overflow-hidden">
                  <Image src={src} alt={alt} fill sizes="(max-width:760px) 28vw, 280px" className="object-cover" />
                </div>
              </figure>
            ))}
          </div>
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
