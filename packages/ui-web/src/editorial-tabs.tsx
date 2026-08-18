import type { ElementType } from "react";
import { cn } from "./variants";

export type EditorialTabsItem = {
  label: string;
  suffix: string;
};

export type EditorialTabsProps = {
  items: EditorialTabsItem[];
  active: string;
  base: string;
  linkComponent?: ElementType;
};

export function EditorialTabs({ items, active, base, linkComponent }: EditorialTabsProps) {
  const L = linkComponent ?? "a";

  return (
    <nav className="flex items-center gap-[1.375rem]">
      {items.map((item) => {
        const isActive = active === item.suffix;

        return (
          <L
            key={item.suffix}
            href={`${base}${item.suffix}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-[3rem] items-center border-b border-transparent text-[0.6875rem] uppercase tracking-rotulo no-underline",
              isActive ? "border-acento text-ink" : "text-ink-3",
            )}
          >
            {item.label}
          </L>
        );
      })}
    </nav>
  );
}
