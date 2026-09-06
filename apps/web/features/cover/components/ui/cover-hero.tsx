import Image from "next/image";
import { Frame } from "@albora/ui-web";

type CoverHeroProps = {
  hero: string | null;
};

export function CoverHero({ hero }: CoverHeroProps) {
  return (
    <div className="capa-hero-anima relative h-[20.5rem] shrink-0 overflow-hidden">
      {hero ? (
        // object-top: a capa raramente é 9:16 exata, então o corte tende a
        // sobrar em cima ou embaixo — puxar pro topo protege o rosto (regra
        // não-negociável de identidade visual), nunca o centro.
        <Image src={hero} alt="" fill sizes="100vw" className="object-cover object-top" />
      ) : (
        <Frame label="" atmosphere variant={1} />
      )}
      <div className="absolute inset-0 bg-gradient-cover-hero" />
    </div>
  );
}
