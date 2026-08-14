import { texto, type Pack } from "@albora/packs";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { HostSidebar } from "@/features/catalog/components/host-sidebar";

export function HostPiecesScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground fundo="claro" pack={pack}>
      <div className="flex h-full">
        <HostSidebar pack={pack} active="Ao vivo" />

        <main className="flex-1 overflow-hidden px-8 py-7">
          <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">
            Peças para imprimir
          </p>
          <p className="mb-6 mt-3 max-w-[48ch] text-[0.875rem] leading-normal text-ink-2">
            QR nível H, URL legível e identidade do casal — tudo pelo mesmo resolvedor do telão.
          </p>

          <div className="flex items-start gap-8">
            <div className="flex aspect-[210/297] w-48 flex-col items-center justify-between rounded-token border border-linha bg-superficie-alta p-5">
              <p className="m-0 text-center font-titulo text-[0.875rem]">
                {texto(pack, "landing.exemplo.nome")}
              </p>
              <span className="grid size-[5.5rem] place-items-center rounded-token bg-ink text-[0.5625rem] tracking-wider text-bg">
                QR
              </span>
              <p className="m-0 break-all text-center text-[0.5625rem] text-ink-3">
                albora.app/e/exemplo
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <span className="inline-flex rounded-pilula bg-acento px-6 py-3 font-semibold text-sobre-acento">
                Baixar PDF
              </span>
              <span className="inline-flex rounded-pilula border border-linha px-6 py-3 text-ink-2">
                Baixar SVG
              </span>
              <p className="mb-0 mt-2 max-w-[28ch] text-xs text-ink-3">
                Contraste do QR validado antes do download.
              </p>
            </div>
          </div>
        </main>
      </div>
    </GuestBackground>
  );
}
