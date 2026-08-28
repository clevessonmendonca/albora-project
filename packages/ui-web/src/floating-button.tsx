import type { ReactNode } from "react";

export function FloatingButton({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-9 place-items-center rounded-full bg-bg-vidro text-ink backdrop-blur-sm">
      {children}
    </span>
  );
}
