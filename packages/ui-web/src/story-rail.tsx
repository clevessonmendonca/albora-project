import type { ReactNode } from "react";
import { initials } from "./avatar";
import { PlusIcon } from "./icons";
import { cn } from "./variants";

export type StoryItem = {
  id: string;
  nome: string;
  capaUrl?: string | undefined;
  novo?: boolean | undefined;
  onPress?: (() => void) | undefined;
};

function StorySquircle({
  children,
  destaque,
  capaUrl,
  className,
}: {
  children?: ReactNode | undefined;
  destaque?: boolean | undefined;
  capaUrl?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "grid size-14 shrink-0 place-items-center overflow-hidden rounded-superficie bg-superficie-alta text-sm text-ink",
        destaque && "ring-2 ring-acento",
        className,
      )}
      style={
        capaUrl
          ? { backgroundImage: `url(${capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {!capaUrl && children}
    </span>
  );
}

function StoryYou({ onAdd }: { onAdd?: (() => void) | undefined }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1.5 transition-[opacity,transform] duration-instantaneo ease-mola active:scale-95 hover:opacity-75"
    >
      <StorySquircle className="border border-linha text-acento">
        <PlusIcon size={24} />
      </StorySquircle>
      <span className="w-full truncate text-center text-[0.6875rem] text-ink-2">Você</span>
    </button>
  );
}

function StoryAvatar({ item }: { item: StoryItem }) {
  const inner = (
    <>
      <StorySquircle destaque={item.novo} capaUrl={item.capaUrl}>
        {initials(item.nome)}
      </StorySquircle>
      <span className="w-full truncate text-center text-[0.6875rem] text-ink-3">{item.nome}</span>
    </>
  );

  if (item.onPress) {
    return (
      <button
        type="button"
        onClick={item.onPress}
        className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1.5 border-none bg-transparent p-0 transition-[opacity,transform] duration-instantaneo ease-mola active:scale-95 hover:opacity-75"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1.5">{inner}</div>
  );
}

export function StoryRail({
  items,
  onAdd,
}: {
  items: StoryItem[];
  onAdd?: (() => void) | undefined;
}) {
  return (
    <div role="list" aria-label="Stories" className="flex gap-4 overflow-x-auto pb-1">
      <StoryYou onAdd={onAdd} />
      {items.map((item) => (
        <StoryAvatar key={item.id} item={item} />
      ))}
    </div>
  );
}
