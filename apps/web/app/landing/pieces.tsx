import { cn } from "@albora/ui-web";
import React, { type CSSProperties, type ReactNode } from "react";
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

export function Frame({
  label,
  radius: curvature,
  src,
  priority,
  atmosphere,
  variant,
}: {
  label: string;
  radius: string;
  src?: string;
  priority?: boolean;
  /** Full-frame blur reads as broken-image (was a bug in v1) — keep lights small. */
  atmosphere?: boolean;
  /** Offsets the lights so five slots side by side do not repeat the same sky. */
  variant?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
        className="absolute inset-0 h-full w-full object-cover"
        style={radiusStyle(curvature)}
      />
    );
  }

  const background: CSSProperties = atmosphere
    ? {
        backgroundImage: ATMOSPHERE,
        backgroundSize: "125% 125%",
        backgroundPositionX: `${((variant ?? 0) * 23) % 101}%`,
        backgroundPositionY: `${((variant ?? 0) * 41) % 101}%`,
      }
    : {
        backgroundImage:
          "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
      };

  return (
    <div
      className="brilho absolute inset-0 grid place-items-center overflow-hidden bg-acento-fundo p-3"
      style={{ ...radiusStyle(curvature), ...background }}
    >
      {label || atmosphere ? null : (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(18%,2.25rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-borda-forte"
          aria-hidden="true"
        />
      )}
      {label ? (
        <span className="relative max-w-[18ch] rounded-pilula bg-bg-vidro-medio px-3 py-1.5 text-center text-[0.625rem] uppercase leading-[1.35] tracking-rotulo text-ink-2">
          {label}
        </span>
      ) : null}
    </div>
  );
}

const ATMOSPHERE = [
  "radial-gradient(circle 14px at 22% 26%, color-mix(in srgb, var(--acento) 55%, transparent), transparent 100%)",
  "radial-gradient(circle 9px at 68% 18%, color-mix(in srgb, var(--acento) 42%, transparent), transparent 100%)",
  "radial-gradient(circle 20px at 79% 72%, color-mix(in srgb, var(--acento) 30%, transparent), transparent 100%)",
  "radial-gradient(circle 7px at 41% 61%, color-mix(in srgb, var(--acento) 48%, transparent), transparent 100%)",
  "radial-gradient(circle 11px at 12% 82%, color-mix(in srgb, var(--acento) 26%, transparent), transparent 100%)",
  "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
].join(", ");

/** Longhand border-radius — `border-radius: var(--raio)` breaks hydration. */
export function radiusStyle(v: string): CSSProperties {
  return {
    borderTopLeftRadius: v,
    borderTopRightRadius: v,
    borderBottomLeftRadius: v,
    borderBottomRightRadius: v,
  };
}

export function transition(property: string, duration = "var(--tempo)"): CSSProperties {
  return {
    transitionProperty: property,
    transitionDuration: duration,
    transitionTimingFunction: "var(--curva)",
  };
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
