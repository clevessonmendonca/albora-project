import type { ReactNode } from "react";

export function CatalogGroup({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-[clamp(3rem,7vw,5.5rem)]">
      <div className="mb-[clamp(1.5rem,3vw,2.5rem)] max-w-[48rem]">
        <h2 className="font-titulo text-[clamp(1.5rem,3vw,2.25rem)] font-light tracking-titulo">
          {titulo}
        </h2>
        <p className="mt-3 text-ink-2">{nota}</p>
      </div>

      <div className="flex flex-wrap gap-[clamp(1.5rem,3vw,2.75rem)]">{children}</div>
    </section>
  );
}
