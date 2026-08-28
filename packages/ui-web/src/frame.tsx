import type { CSSProperties } from "react";

const ATMOSPHERE = [
  "radial-gradient(circle 14px at 22% 26%, color-mix(in srgb, var(--acento) 55%, transparent), transparent 100%)",
  "radial-gradient(circle 9px at 68% 18%, color-mix(in srgb, var(--acento) 42%, transparent), transparent 100%)",
  "radial-gradient(circle 20px at 79% 72%, color-mix(in srgb, var(--acento) 30%, transparent), transparent 100%)",
  "radial-gradient(circle 7px at 41% 61%, color-mix(in srgb, var(--acento) 48%, transparent), transparent 100%)",
  "radial-gradient(circle 11px at 12% 82%, color-mix(in srgb, var(--acento) 26%, transparent), transparent 100%)",
  "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
].join(", ");

export function Frame({
  label = "",
  src,
  priority,
  atmosphere,
  variant = 0,
}: {
  label?: string;
  src?: string;
  priority?: boolean;
  atmosphere?: boolean;
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
      />
    );
  }

  const background: CSSProperties = atmosphere
    ? {
        backgroundImage: ATMOSPHERE,
        backgroundSize: "125% 125%",
        backgroundPositionX: `${(variant * 23) % 101}%`,
        backgroundPositionY: `${(variant * 41) % 101}%`,
      }
    : {
        backgroundImage:
          "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
      };

  return <div className="absolute inset-0 overflow-hidden bg-acento-fundo" style={background} />;
}
