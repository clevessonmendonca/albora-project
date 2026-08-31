import { resolvePackText, type Pack } from "@albora/packs";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { HostSidebar } from "@/features/catalog/components/host-sidebar";

const PECAS = [
  { label: "Placa A4", size: "210×297 mm + sangria 3 mm" },
  { label: "Card de mesa", size: "100×140 mm + sangria 3 mm" },
  { label: "Card de missão", size: "55×85 mm + sangria 3 mm" },
] as const;

export function HostPiecesScreen({ pack }: { pack: Pack }) {
  const missoes = pack.missoes.slice(0, 4).map((m) => resolvePackText(pack, m.chaveTitulo));

  return (
    <GuestBackground background="light" pack={pack}>
      <div className="flex h-full">
        <HostSidebar pack={pack} active="Ao vivo" />

        <main className="flex-1 overflow-hidden px-8 py-7">
          <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">
            Peças para imprimir
          </p>
          <p className="mb-6 mt-3 max-w-[48ch] text-[0.875rem] leading-normal text-ink-2">
            PDF pronto para a gráfica. SVG se o estúdio pedir para editar. A placa destaca as
            missões ligadas no editor.
          </p>

          <div className="flex items-start gap-8">
            <div className="flex aspect-[210/297] w-48 flex-col items-center justify-between rounded-token border border-linha bg-superficie-alta p-5">
              <p className="m-0 text-center font-titulo text-[0.875rem]">
                {resolvePackText(pack, "landing.exemplo.nome")}
              </p>
              <span className="grid size-[5.5rem] place-items-center rounded-token bg-ink text-[0.5625rem] tracking-wider text-bg">
                QR
              </span>
              <ul className="m-0 w-full list-none p-0 text-center text-[0.5625rem] leading-snug text-ink-2">
                {missoes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p className="m-0 break-all text-center text-[0.5625rem] text-ink-3">
                albora.app/e/exemplo
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="rounded-token bg-superficie-alta p-4">
                <p className="mb-3 mt-0 text-[0.875rem] leading-relaxed text-ink">
                  Placa A4, card de mesa e card de missão num ZIP — o que a gráfica pede de uma
                  vez.
                </p>
                <span className="mb-3 flex items-center gap-2 text-[0.8125rem] text-ink-2">
                  <span className="grid size-4 place-items-center rounded-[0.25rem] border border-linha" />
                  Incluir SVG, se o estúdio pedir para editar
                </span>
                <span className="inline-flex rounded-pilula bg-acento px-6 py-3 font-semibold text-sobre-acento">
                  Baixar tudo (ZIP)
                </span>
              </div>

              <p className="mb-0 mt-1 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                Uma peça só
              </p>
              {PECAS.map((p) => (
                <div key={p.label}>
                  <p className="mb-2 mt-0 text-[0.875rem] text-ink">
                    {p.label} <span className="text-ink-3">{p.size}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-pilula bg-acento px-3 py-1.5 text-[0.8125rem] font-medium text-sobre-acento">
                      Baixar PDF
                    </span>
                    <span className="inline-flex rounded-pilula border border-linha px-3 py-1.5 text-[0.8125rem] text-ink">
                      Baixar SVG
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </GuestBackground>
  );
}
