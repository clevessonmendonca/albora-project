import type { ReactNode } from "react";
import { initials } from "./avatar";
import { PlusIcon } from "./icons";
import { cn } from "./variants";

export type StoryItem = {
  id: string;
  nome: string;
  capaUrl?: string | undefined;
  novo?: boolean | undefined;
  /** O recado dos anfitriões — primeiro no trilho, anel especial + selo de áudio (redesign §3.2). */
  variant?: "recado" | undefined;
  temAudio?: boolean | undefined;
  onPress?: (() => void) | undefined;
};

function StorySquircle({
  children,
  destaque,
  recado,
  capaUrl,
  className,
}: {
  children?: ReactNode | undefined;
  destaque?: boolean | undefined;
  recado?: boolean | undefined;
  capaUrl?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "grid size-14 shrink-0 place-items-center overflow-hidden rounded-superficie bg-superficie-alta text-sm text-ink",
        // Anel especial do recado: com folga (offset), distinto do anel rente de "novo".
        recado ? "ring-2 ring-acento ring-offset-2 ring-offset-bg" : destaque && "ring-2 ring-acento",
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

/** Selo de áudio do recado — SVG inline com currentColor (design-system-v3 §6), nunca emoji. */
function AudioBadge() {
  return (
    <span
      aria-hidden
      className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-acento text-sobre-acento ring-2 ring-bg"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
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
  const recado = item.variant === "recado";
  const squircle = (
    <StorySquircle destaque={item.novo} recado={recado} capaUrl={item.capaUrl}>
      {initials(item.nome)}
    </StorySquircle>
  );
  const inner = (
    <>
      {recado ? (
        <span className="relative">
          {squircle}
          {item.temAudio && <AudioBadge />}
        </span>
      ) : (
        squircle
      )}
      <span
        className={cn(
          "w-full truncate text-center text-[0.6875rem]",
          recado ? "text-acento-texto" : "text-ink-3",
        )}
      >
        {item.nome}
      </span>
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
