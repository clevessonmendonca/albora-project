import { GuestShell } from "@albora/ui-web";

function Block({ height }: { height: string }) {
  return (
    <div
      aria-hidden
      className="w-full rounded-token bg-ink-suave"
      style={{ height }}
    />
  );
}

export function PhotoPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <Block height="100dvh" />
    </GuestShell>
  );
}
