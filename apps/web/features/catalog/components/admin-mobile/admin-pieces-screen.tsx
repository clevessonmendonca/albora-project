import { resolvePackText, type Pack } from "@albora/packs";
import { StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminNav } from "@/features/catalog/components/admin-nav";

export function AdminPiecesScreen({ pack }: { pack: Pack }) {
  const missoes = pack.missoes.slice(0, 4).map((m) => resolvePackText(pack, m.chaveTitulo));

  return (
    <GuestBackground background="light" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Peças</p>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-2">
          Placa A4, card de mesa e card de missão num ZIP — o que a gráfica pede de uma vez.
        </p>

        <div className="mb-4 flex justify-center">
          <div className="flex aspect-[210/297] w-36 flex-col items-center justify-between rounded-token border border-linha bg-superficie p-4">
            <p className="m-0 text-center font-titulo text-[0.75rem]">
              {resolvePackText(pack, "landing.exemplo.nome")}
            </p>
            <span className="grid size-14 place-items-center rounded-token bg-ink text-[0.5rem] tracking-wider text-bg">
              QR
            </span>
            <ul className="m-0 w-full list-none p-0 text-center text-[0.5rem] leading-snug text-ink-2">
              {missoes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>

        <span className="mb-3 flex items-center gap-2 text-[0.8125rem] text-ink-2">
          <span className="grid size-4 place-items-center rounded-[0.25rem] border border-linha" />
          Incluir SVG, se o estúdio pedir para editar
        </span>
        <span className="mb-5 flex min-h-12 items-center justify-center rounded-pilula bg-acento font-semibold text-sobre-acento">
          Baixar tudo (ZIP)
        </span>

        <p className="mb-2 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Uma peça só
        </p>
        <div className="mb-4 flex flex-col gap-2">
          {["Placa A4", "Card de mesa", "Card de missão"].map((label) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-[0.8125rem] text-ink">{label}</span>
              <span className="flex gap-3">
                <span className="text-[0.75rem] font-medium text-acento">PDF</span>
                <span className="text-[0.75rem] text-ink-2">SVG</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <AdminNav active="more" />
    </GuestBackground>
  );
}
