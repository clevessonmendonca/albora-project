import type { ButtonHTMLAttributes } from "react";
import { cn } from "./variants";

/** Rotações fixas por posição — nunca aleatórias em runtime (DESIGN.md §4). */
const ROTACOES_FIXAS = [-3.5, 5.5, -7, 2.2, -1.8, 4.1, -5.2, 1.6, -6.4, 3.8] as const;

export function printedCopyRotation(indice: number): number {
  return ROTACOES_FIXAS[((indice % ROTACOES_FIXAS.length) + ROTACOES_FIXAS.length) % ROTACOES_FIXAS.length]!;
}

export type PrintedCopyCardProps = {
  imageUrl: string;
  caption: string;
  /** Posição na grade — define rotação determinística. */
  index: number;
  selected?: boolean;
  alt?: string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;

const CLASSE_BASE =
  "group m-0 w-[7.75rem] shrink-0 rounded-[2px] bg-superficie-alta px-[0.5625rem] pt-[0.5625rem] pb-[1.875rem] shadow-alta transition-[transform,box-shadow] duration-[260ms] ease-[var(--curva, ease)] hover:z-10 hover:-translate-y-2 hover:rotate-0 hover:shadow-alta";

function CopyBody({
  imageUrl,
  caption,
  alt,
  selected,
}: Pick<PrintedCopyCardProps, "imageUrl" | "caption" | "alt" | "selected">) {
  return (
    <>
      <div className="relative aspect-[3/4] overflow-hidden bg-superficie-alta">
        <img src={imageUrl} alt={alt} className="size-full object-cover" loading="lazy" />
        {selected && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1px] ring-2 ring-acento ring-offset-2 ring-offset-superficie-alta"
          />
        )}
      </div>
      <p className="mb-0 mt-2.5 text-center text-[0.53125rem] uppercase tracking-rotulo text-ink-3">
        {caption}
      </p>
    </>
  );
}

/**
 * Cópia impressa da superfície clara (DESIGN.md §4) — foto como objeto físico,
 * não card genérico. Usada no álbum do admin e em vitrines editoriais.
 */
export function PrintedCopyCard({
  imageUrl,
  caption,
  index,
  selected = false,
  alt = "",
  onClick,
  type = "button",
}: PrintedCopyCardProps) {
  const rotacao = printedCopyRotation(index);
  const estilo = { transform: `rotate(${rotacao}deg)` } as const;

  if (onClick) {
    return (
      <button
        type={type}
        onClick={onClick}
        aria-pressed={selected}
        className={cn(CLASSE_BASE, "cursor-pointer border-none text-inherit")}
        style={estilo}
      >
        <CopyBody imageUrl={imageUrl} caption={caption} alt={alt} selected={selected} />
      </button>
    );
  }

  return (
    <figure className={CLASSE_BASE} style={estilo}>
      <CopyBody imageUrl={imageUrl} caption={caption} alt={alt} selected={selected} />
    </figure>
  );
}
