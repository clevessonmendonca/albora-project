import { cn } from "./variants";

const VARIANT_CLASSES = {
  rect: "w-full",
  circle: "shrink-0 rounded-full",
  text: "w-full rounded-pilula",
} as const;

type SkeletonProps = {
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ variant = "rect", className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "skeleton-pulse bg-ink-skeleton",
        variant === "rect" && "rounded-superficie",
        VARIANT_CLASSES[variant],
        className,
      )}
      style={style}
    />
  );
}
