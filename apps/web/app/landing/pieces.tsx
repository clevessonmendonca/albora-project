import { cn } from "@albora/ui-web";
import type { CSSProperties, ReactNode } from "react";

/**
 * Repeated landing pieces from v4 — the pill, the label, the warm ground and
 * the photo frame.
 *
 * They exist so the same drawing is not retyped in nine places and diverges
 * in three. No literal colors: v4 writes `#FFF6E9` and here that is paper
 * warmed by the event amber, which is what makes the landing change look
 * when the couple changes theirs.
 */

export const pillClasses =
  "pilula inline-flex items-center justify-center whitespace-nowrap rounded-pilula bg-ink px-8 py-4 font-medium text-bg no-underline";

export const lightPillClasses =
  "pilula inline-flex items-center justify-center whitespace-nowrap rounded-pilula bg-superficie-alta px-8 py-4 font-normal text-ink no-underline";

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
      {children}
    </p>
  );
}

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
      className={cn(
        "m-0 font-titulo font-light leading-[1.03] tracking-titulo text-balance",
        className,
      )}
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

/**
 * The place of a photo.
 *
 * With `src`, it is the photo. Without, it is a **declared** hole — drawn as
 * proof of development, with crop marks and a caption bar, instead of a
 * broken `<img>` or a gray rectangle. Neutral gray reads as a design
 * decision and survives review; this does not.
 */
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
  /**
   * Out-of-focus lights, for the slot that waits for a night-party photo.
   *
   * They are small and discreet on purpose: a blur covering the whole frame
   * reads as a broken image loading, which is how the first version of this
   * frame went wrong.
   */
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
