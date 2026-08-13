import { ChaoConvidado, RODAPE_ABAS } from "@/app/telas/shell-convidado";
import { raio } from "@/app/landing/pecas";

function Block({
  height,
  width = "100%",
  rounded,
}: {
  height: string;
  width?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        ...(rounded ? raio(rounded) : {}),
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
      }}
    />
  );
}

export function CoverPageSkeleton() {
  return (
    <ChaoConvidado semStatus>
      <Block height="20.5rem" />
      <div style={{ marginTop: "-3.25rem", padding: "0 1.5rem", textAlign: "center" }}>
        <Block height="2rem" width="72%" rounded="var(--raio)" />
        <div style={{ marginTop: "0.5rem" }}>
          <Block height="0.875rem" width="48%" rounded="var(--raio-pilula)" />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.5rem",
          padding: "1.25rem 1.125rem 1.125rem",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} height="4.5rem" rounded="var(--raio)" />
        ))}
      </div>
      <div style={{ padding: `1.125rem 1.5rem ${RODAPE_ABAS}` }}>
        <Block height="3rem" rounded="var(--raio-pilula)" />
      </div>
    </ChaoConvidado>
  );
}
