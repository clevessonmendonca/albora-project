import {
  GuestHeader,
  GuestShell,
  GuestMain,
} from "@albora/ui-web";
import { AlbumTimelineLoading } from "../client/album-timeline";

export function AlbumPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <style>{`
        @keyframes album-respirar {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        .album-esperando { animation: album-respirar 1900ms var(--curva) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .album-esperando { animation: none !important; }
        }
      `}</style>
      <GuestMain>
        <GuestHeader title="O álbum" homeHref="#" />
        <AlbumTimelineLoading />
      </GuestMain>
    </GuestShell>
  );
}
