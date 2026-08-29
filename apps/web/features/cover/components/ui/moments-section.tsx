import Link from "next/link";
import type { CoverMoment } from "../../types/cover";
import { MomentCard } from "./moment-card";

type MomentsSectionProps = {
  moments: CoverMoment[];
  base: string;
  slug: string;
  interactionOpen: boolean;
};

export function MomentsSection({ moments, base, slug, interactionOpen }: MomentsSectionProps) {
  if (moments.length === 0) return null;

  const centerIndex = moments.length > 1 ? 1 : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline justify-between px-[1.125rem] pb-3">
        <span className="font-titulo text-base">Os momentos</span>
        <Link
          href={`${base}/album`}
          className="text-[0.6875rem] text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink-2"
        >
          ver álbum
        </Link>
      </div>

      <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[1.125rem] [scrollbar-width:none]">
        {moments.map((moment, i) => (
          <MomentCard
            key={moment.id}
            moment={moment}
            slug={slug}
            index={i}
            central={i === centerIndex}
            interactionOpen={interactionOpen}
          />
        ))}
      </div>
    </div>
  );
}
