import { ChaoConvidado } from "@/features/guest/components/client/guest-shell";
import { raio } from "@/app/landing/pecas";

function Block({ height }: { height: string }) {
  return (
    <div
      aria-hidden
      style={{
        width: "100%",
        height,
        ...raio("var(--raio)"),
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
      }}
    />
  );
}

export function PhotoPageSkeleton() {
  return (
    <ChaoConvidado semStatus>
      <Block height="100dvh" />
    </ChaoConvidado>
  );
}
