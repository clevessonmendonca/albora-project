import {
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
} from "@/app/telas/shell-convidado";
import { PostLoading } from "../client/post";
import { HourStripLoading } from "../client/hour-strip";

export function FeedPageSkeleton() {
  return (
    <ChaoConvidado semStatus>
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
      <MioloConvidado>
        <CabecalhoConvidado titulo="A festa" hrefInicio="#" />
        <HourStripLoading />
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
          <PostLoading />
          <PostLoading />
        </div>
      </MioloConvidado>
    </ChaoConvidado>
  );
}
