import { GuestHeader, GuestMain, GuestShell } from "@albora/ui-web";

function Block({ className }: { className: string }) {
  return <div aria-hidden className={`bg-ink-skeleton ${className}`} />;
}

export function HomePageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <GuestMain>
        <GuestHeader title="A festa" homeHref="#" />

        <div className="flex gap-4 overflow-hidden pb-1">
          {Array.from({ length: 6 }, (_, i) => (
            <Block key={i} className="size-14 shrink-0 rounded-superficie" />
          ))}
        </div>

        <div className="mt-5 grid gap-6">
          <Block className="aspect-4/5 rounded-media" />
          <Block className="aspect-4/5 rounded-media" />
        </div>
      </GuestMain>
    </GuestShell>
  );
}
