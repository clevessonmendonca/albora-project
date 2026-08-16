import { resolvePackText, type Pack } from "@albora/packs";
import { Badge, cn, Frame, StatusBar, TabBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function AlbumScreen({ pack, moments }: { pack: Pack; moments: string[] }) {
  const missoes = pack.missoes.slice(0, 3).map((m) => resolvePackText(pack, m.chaveTitulo));
  const capitulos = [
    {
      titulo: moments[1] ?? moments[0] ?? "A cerimônia",
      faixas: [
        { hora: "20h", fotos: [0, 1, 2, 3], amanhecer: false },
        { hora: "21h", fotos: [4, 5, 6], amanhecer: false },
      ],
    },
    {
      titulo: moments[2] ?? "A festa",
      faixas: [
        { hora: "23h", fotos: [7, 8, 9, 10, 11], amanhecer: false },
        { hora: "05h", fotos: [12, 13], amanhecer: true },
      ],
    },
  ];

  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="relative h-28 shrink-0 overflow-hidden">
        <Frame atmosphere variant={1} />
        <div className="absolute inset-0 bg-gradient-cover-hero" />
      </div>

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-3 pb-2">
        <span className="font-titulo text-[1.125rem] tracking-titulo">O álbum</span>
      </div>

      <ul className="mb-3 mt-0 flex list-none justify-center gap-0 px-[1.125rem] p-0" aria-hidden>
        {[
          ["847", "fotos"],
          ["112", "pessoas"],
          ["4", "missões"],
        ].map(([valor, rotulo], i) => (
          <li
            key={rotulo}
            className={cn("flex-1 px-2 text-center", i > 0 && "border-l border-linha")}
          >
            <span className="block font-titulo text-[1.25rem] font-light tabular-nums leading-none">
              {valor}
            </span>
            <span className="mt-1 block text-[0.5625rem] uppercase tracking-rotulo text-ink-3">
              {rotulo}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-1.5 overflow-hidden px-[1.125rem] pb-3">
        <Badge tone="accent">Tudo</Badge>
        {missoes.map((m) => (
          <Badge key={m}>{m}</Badge>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-[1.125rem]">
        {capitulos.map((capitulo) => (
          <section key={capitulo.titulo} className="mt-5 first:mt-0">
            <h2
              className={cn(
                "mb-3 font-titulo text-[1.125rem] font-light tracking-titulo",
                capitulo.faixas.some((f) => f.amanhecer) && "text-acento",
              )}
            >
              {capitulo.titulo}
            </h2>
            <ol className="m-0 list-none p-0">
              {capitulo.faixas.map((faixa) => (
                <li
                  key={faixa.hora}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-t border-linha py-3 first:border-t-0 first:pt-0"
                >
                  <p
                    className={cn(
                      "m-0 pt-2 font-titulo text-[0.625rem] uppercase tracking-rotulo",
                      faixa.amanhecer ? "text-acento" : "text-ink-3",
                    )}
                  >
                    {faixa.hora}
                  </p>
                  <span className="flex flex-wrap gap-2">
                    {faixa.fotos.map((n) => (
                      <span
                        key={n}
                        className={cn(
                          "relative block size-11 overflow-hidden rounded-full bg-superficie",
                          faixa.amanhecer && "shadow-[inset_0_0_0_1px_var(--acento)]",
                        )}
                      >
                        <Frame atmosphere variant={n} />
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <TabBar active="album" />
    </GuestBackground>
  );
}
