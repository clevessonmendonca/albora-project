import { raio } from "@/app/landing/pecas";
import {
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
} from "@/features/guest/components/client/guest-shell";

function Block() {
  return (
    <div
      aria-hidden
      style={{
        aspectRatio: "1 / 1",
        ...raio("var(--raio)"),
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
      }}
    />
  );
}

export function MyPhotosPageSkeleton() {
  return (
    <ChaoConvidado semStatus>
      <MioloConvidado>
        <CabecalhoConvidado titulo="Minhas fotos" hrefInicio="#" />
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "2px",
          }}
        >
          {Array.from({ length: 9 }, (_, i) => (
            <li key={i}>
              <Block />
            </li>
          ))}
        </ul>
      </MioloConvidado>
    </ChaoConvidado>
  );
}
