import type { Pack } from "@albora/packs";
import { Badge, Frame, StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminNav } from "@/features/catalog/components/admin-nav";

export function AdminAlbumScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="light" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">O álbum</p>
        <Badge>847 fotos</Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <div className="mb-4 rounded-token bg-superficie p-4 shadow-suave">
          <p className="mb-1 mt-0 font-titulo text-[1.0625rem]">Baixar tudo</p>
          <p className="mb-3 mt-0 text-[0.8125rem] leading-relaxed text-ink-2">
            As fotos publicadas da noite, num ZIP. Confirma no e-mail antes — a sessão aberta não
            basta.
          </p>
          <span className="inline-flex rounded-pilula border border-linha px-4 py-2 text-[0.8125rem] text-ink">
            Baixar tudo
          </span>
        </div>

        <p className="mb-3 mt-0 text-[0.8125rem] leading-relaxed text-ink-2">
          Curadoria leve: ocultar tira a foto do feed, do álbum e do telão.
        </p>

        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="relative aspect-[3/4] overflow-hidden rounded-token">
              <Frame atmosphere variant={i * 5} />
              {i === 2 && (
                <span className="absolute inset-0 grid place-items-center bg-bg-overlay-medio text-[0.625rem] uppercase tracking-rotulo text-ink">
                  Ocultar
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <AdminNav active="more" />
    </GuestBackground>
  );
}
