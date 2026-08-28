import type { Pack } from "@albora/packs";
import { FirstPhotoDemo } from "../first-photo-demo";
import { Accent, Heading, Label, Section } from "../pieces";

export function NoAppSection({
  pack,
  t: _t,
}: {
  pack: Pack;
  t: (key: string) => string;
}) {
  return (
    <Section id="sem-app" reveal>
      <Label>A objeção número um</Label>
      <Heading size="clamp(1.875rem, 4.4vw, 3.5rem)" className="max-w-[38ch]">
        {`"Meus convidados vão instalar um aplicativo?" `}
        <Accent>Toque e veja que não.</Accent>
      </Heading>
      <p className="m-0 mt-6 mb-[clamp(2rem,4vw,3.25rem)] max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
        Os quatro toques que um convidado dá de verdade, sem tirar o celular do
        bolso um segundo antes.
      </p>
      <FirstPhotoDemo packHint={pack.id} />
    </Section>
  );
}
