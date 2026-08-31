import {
  GuestHeader,
  GuestShell,
  GuestMain,
} from "@albora/ui-web";
import { radiusStyle } from "@albora/ui-web";

function Block({ height }: { height: string }) {
  return (
    <div
      aria-hidden
      style={{
        width: "100%",
        height,
        ...radiusStyle("var(--raio-superficie)"),
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
      }}
    />
  );
}

export function MusicPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <GuestMain reserveTabBarSpace>
        <GuestHeader title="Música da festa" homeHref="#" />
        <Block height="16rem" />
        <Block height="1.25rem" />
        <Block height="2.5rem" />
      </GuestMain>
    </GuestShell>
  );
}
