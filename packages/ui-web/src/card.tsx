import type { ReactNode } from "react";
import { cn } from "./variants";

const CLASSE_ELEVACAO = {
  0: "elev-0",
  1: "elev-1",
  2: "elev-2",
} as const;

export function Card({
  elevation = 1,
  highlighted,
  className,
  children,
}: {
  elevation?: 0 | 1 | 2;
  highlighted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-token p-5",
        CLASSE_ELEVACAO[elevation],
        highlighted && "bg-acento-superficie",
        className,
      )}
    >
      {children}
    </div>
  );
}
