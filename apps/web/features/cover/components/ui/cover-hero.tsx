import { CAPA_FOCO_PADRAO, capaObjectPosition, type CapaFoco } from "@albora/core";
import { Frame } from "@albora/ui-web";

type CoverHeroProps = {
  hero: string | null;
  focus?: CapaFoco;
};

export function CoverHero({ hero, focus = CAPA_FOCO_PADRAO }: CoverHeroProps) {
  return (
    <div className="relative h-[20.5rem] shrink-0">
      {hero ? (
        <img
          src={hero}
          alt=""
          style={{ objectPosition: capaObjectPosition(focus) }}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <Frame label="" atmosphere variant={1} />
      )}
      <div className="absolute inset-0 bg-gradient-cover-hero" />
    </div>
  );
}
