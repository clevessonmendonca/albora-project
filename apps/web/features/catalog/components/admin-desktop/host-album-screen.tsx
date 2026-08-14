import type { Pack } from "@albora/packs";
import { Badge, Frame } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { HostSidebar } from "@/features/catalog/components/host-sidebar";

export function HostAlbumScreen({ pack, moments }: { pack: Pack; moments: string[] }) {
  return (
    <GuestBackground background="light" pack={pack}>
      <div className="flex h-full">
        <HostSidebar pack={pack} active="O álbum" />

        <main className="flex-1 overflow-hidden px-8 py-7">
          <div className="flex items-center justify-between gap-4">
            <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">
              O álbum
            </p>
            <Badge>847 fotos</Badge>
          </div>

          <div className="mb-4 mt-5 flex gap-[0.4375rem] overflow-hidden">
            <Badge tone="accent">Tudo</Badge>
            {moments.slice(0, 4).map((m) => (
              <Badge key={m}>{m}</Badge>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="relative aspect-[3/4]">
                <span className="absolute inset-0 overflow-hidden rounded-token">
                  <Frame atmosphere variant={i * 5} />
                </span>
                {i === 2 && (
                  <span className="absolute inset-0 grid place-items-center rounded-token bg-bg-overlay-medio text-[0.6875rem] uppercase tracking-rotulo text-ink">
                    Ocultar
                  </span>
                )}
              </span>
            ))}
          </div>
        </main>
      </div>
    </GuestBackground>
  );
}
