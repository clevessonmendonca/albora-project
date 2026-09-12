"use client";

import { Badge } from "@albora/ui-web";
import type { AlbumMission } from "../../hooks/use-album-filter";

type AlbumFiltersProps = {
  missions: AlbumMission[];
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function AlbumFilters({ missions, selected, onSelect }: AlbumFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar o álbum"
      className="-mx-[calc(var(--espaco)*5)] mb-3.5 flex gap-[0.4375rem] overflow-x-auto px-[calc(var(--espaco)*5)] [scrollbar-width:none]"
    >
      <ButtonBadge active={selected === null} onClick={() => onSelect(null)}>
        Tudo
      </ButtonBadge>
      {missions.map((m) => (
        <ButtonBadge
          key={m.id}
          active={selected === m.id}
          onClick={() => onSelect(selected === m.id ? null : m.id)}
        >
          {m.title}
        </ButtonBadge>
      ))}
    </div>
  );
}

function ButtonBadge({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-[inherit]"
    >
      <Badge tone={active ? "accent" : "neutral"}>{children}</Badge>
    </button>
  );
}
