import { Frame } from "@albora/ui-web";

type CoverHeroProps = {
  hero: string | null;
};

export function CoverHero({ hero }: CoverHeroProps) {
  return (
    <div className="relative h-[20.5rem] shrink-0">
      {hero ? (
        <img src={hero} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Frame label="" atmosphere variant={1} />
      )}
      <div className="absolute inset-0 bg-gradient-cover-hero" />
    </div>
  );
}
