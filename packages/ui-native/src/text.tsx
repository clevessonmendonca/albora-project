import type { ReactNode } from "react";
import { Text as RNText } from "react-native";

type Tone = "ink" | "muted" | "accent" | "critical" | "onAccent";

const TONE: Record<Tone, string> = {
  ink: "text-ink",
  muted: "text-ink-2",
  accent: "text-acento",
  critical: "text-critico",
  onAccent: "text-sobre-acento",
};

export function Text({
  children,
  tone = "ink",
  title = false,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  title?: boolean;
  className?: string;
}) {
  return (
    <RNText className={`${title ? "font-titulo" : "font-corpo"} ${TONE[tone]} ${className}`}>
      {children}
    </RNText>
  );
}
