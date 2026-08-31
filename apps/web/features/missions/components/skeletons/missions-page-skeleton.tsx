import { GuestHeader, GuestMain, GuestShell } from "@albora/ui-web";

function Block({ height, width = "100%" }: { height: string; width?: string }) {
  return (
    <div
      aria-hidden
      className="rounded-token bg-ink-suave"
      style={{ width, height }}
    />
  );
}

export function MissionsPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <GuestMain>
        <GuestHeader title="Missões" homeHref="#" />
        <Block height="5rem" />
        <div className="mt-4 flex flex-col gap-3">
          <Block height="3.5rem" />
          <Block height="3.5rem" />
          <Block height="3.5rem" />
        </div>
      </GuestMain>
    </GuestShell>
  );
}
