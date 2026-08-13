import {
  GuestHeader,
  GuestShell,
  GuestMain,
} from "@albora/ui-web";
import { PostLoading } from "../client/post";
import { HourStripLoading } from "../client/hour-strip";

export function FeedPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <style>{`
        @keyframes feed-respirar {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        .feed-esperando { animation: feed-respirar 1900ms var(--curva) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .feed-esperando { animation: none !important; }
        }
      `}</style>
      <GuestMain>
        <GuestHeader title="A festa" homeHref="#" />
        <HourStripLoading />
        <div className="mt-4 flex flex-col gap-6">
          <PostLoading />
          <PostLoading />
        </div>
      </GuestMain>
    </GuestShell>
  );
}
