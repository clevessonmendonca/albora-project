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
          {[0, 1].map((i) => (
            <div key={i} className="elev-1 grid gap-3 rounded-token p-3.5">
              <div className="flex items-center gap-2.5">
                <Block className="size-[1.875rem] rounded-full" />
                <Block className="h-3.5 w-24 rounded-pilula" />
              </div>
              <Block className="aspect-4/5 rounded-media" />
            </div>
          ))}
        </div>
      </GuestMain>
    </GuestShell>
  );
}
