import { cn } from "@albora/ui-web";
import React, { type ReactNode } from "react";
import { Reveal } from "./interactives";
import { WIDTH, SECTION_PADDING } from "./landing-data";

export const pillClasses =
  "pilula inline-flex items-center justify-center whitespace-nowrap rounded-pilula bg-ink px-8 py-4 font-medium text-bg no-underline";

export const lightPillClasses =
  "pilula inline-flex items-center justify-center whitespace-nowrap rounded-pilula bg-superficie-alta px-8 py-4 font-normal text-ink no-underline";

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="tipo-label mb-4 uppercase text-acento-texto">{children}</p>
  );
}

/**
 * Fraunces display via `.tipo-display` — uma escala só, herdada de
 * `tipografia.css`. `size` continua por chamada (cada seção pede um peso
 * visual diferente); o que a escala fixa é família, entrelinha e tracking,
 * pra não haver três tipografias de título convivendo na mesma rolagem.
 */
export function Heading({
  children,
  size = "clamp(1.75rem, 4.2vw, 3.25rem)",
  className,
}: {
  children: ReactNode;
  size?: string;
  className?: string;
}) {
  return (
    <h2
      className={cn("tipo-display m-0 font-light text-balance", className)}
      style={{ fontSize: size }}
    >
      {children}
    </h2>
  );
}

/** The italic amber clause v4 uses to close every heading. */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="font-normal italic text-acento-texto">{children}</em>;
}

export function Section({
  children,
  id,
  className,
  reveal,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  reveal?: boolean;
}) {
  return (
    <section
      {...(id ? { id } : {})}
      className={cn("mx-auto", WIDTH, className ?? SECTION_PADDING)}
    >
      {reveal ? <Reveal>{children}</Reveal> : children}
    </section>
  );
}
