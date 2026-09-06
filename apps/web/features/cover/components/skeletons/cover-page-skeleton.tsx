import { GuestShell } from "@albora/ui-web";

function Block({
  className,
}: {
  className: string;
}) {
  return <div aria-hidden className={`bg-ink-skeleton ${className}`} />;
}

export function CoverPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <Block className="h-[20.5rem] w-full" />
      <div className="-mt-13 px-6 text-center">
        <Block className="mx-auto h-10 w-[72%] rounded-token" />
        <div className="mt-2">
          <Block className="mx-auto h-3.5 w-[48%] rounded-pilula" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 px-[1.125rem] pb-[1.125rem] pt-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-[4.5rem] w-full rounded-token" />
        ))}
      </div>
      <div className="px-6 pt-[1.125rem] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <Block className="h-12 w-full rounded-pilula" />
      </div>
    </GuestShell>
  );
}
