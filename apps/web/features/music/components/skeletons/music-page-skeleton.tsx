import {
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
} from "@/features/guest/components/client/guest-shell";
import { raio } from "@/app/landing/pecas";

function Block({ height }: { height: string }) {
  return (
    <div
      aria-hidden
      style={{
        width: "100%",
        height,
        ...raio("var(--raio-superficie)"),
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
      }}
    />
  );
}

export function MusicPageSkeleton() {
  return (
    <ChaoConvidado semStatus>
      <MioloConvidado comAbas>
        <CabecalhoConvidado titulo="Música da festa" hrefInicio="#" />
        <Block height="16rem" />
        <Block height="1.25rem" />
        <Block height="2.5rem" />
      </MioloConvidado>
    </ChaoConvidado>
  );
}
