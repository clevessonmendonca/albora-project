import type { ReactNode } from "react";
import { cn } from "./variants";

export function Card({
  highlighted,
  className,
  children,
}: {
  highlighted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-token p-5",
        highlighted ? "bg-acento-superficie" : "bg-superficie",
        className,
      )}
    >
      {children}
    </div>
  );
}
