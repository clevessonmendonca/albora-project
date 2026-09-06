import {
  GuestHeader,
  GuestShell,
  GuestMain,
  Skeleton,
} from "@albora/ui-web";

export function MusicPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <GuestMain reserveTabBarSpace>
        <GuestHeader title="Música da festa" homeHref="#" />
        <Skeleton className="h-64" />
        <Skeleton variant="text" className="mt-4 h-5" />
        <Skeleton variant="text" className="mt-3 h-10" />
      </GuestMain>
    </GuestShell>
  );
}
