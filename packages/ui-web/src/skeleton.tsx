import { cn } from "./variants";

export function Skeleton({
  className,
  rounded = "rounded-token",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse bg-linha/50",
        rounded,
        className,
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("grid gap-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-3/5" : "w-full")}
          rounded="rounded-pilula"
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({
  count = 9,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("grid grid-cols-3 gap-1", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("grid gap-3 rounded-superficie border border-linha bg-superficie p-5", className)}>
      <Skeleton className="h-5 w-2/5" rounded="rounded-pilula" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonFeed({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden className="grid gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0" rounded="rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-24" rounded="rounded-pilula" />
              <Skeleton className="h-2.5 w-16" rounded="rounded-pilula" />
            </div>
          </div>
          <Skeleton className="aspect-[4/5] w-full" rounded="rounded-superficie" />
          <div className="flex gap-4">
            <Skeleton className="h-7 w-14" rounded="rounded-pilula" />
            <Skeleton className="h-7 w-14" rounded="rounded-pilula" />
          </div>
        </div>
      ))}
    </div>
  );
}
