import {
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
} from "@/app/telas/shell-convidado";
import { raio } from "@/app/landing/pecas";

function Block({ height, width = "100%" }: { height: string; width?: string }) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        ...raio("var(--raio)"),
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
      }}
    />
  );
}

export function MissionsPageSkeleton() {
  return (
    <ChaoConvidado semStatus>
      <MioloConvidado>
        <CabecalhoConvidado titulo="Missões" hrefInicio="#" />
        <Block height="5rem" />
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Block height="3.5rem" />
          <Block height="3.5rem" />
          <Block height="3.5rem" />
        </div>
      </MioloConvidado>
    </ChaoConvidado>
  );
}
