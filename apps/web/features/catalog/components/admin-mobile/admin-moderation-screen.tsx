import type { Pack } from "@albora/packs";
import { Badge, Button, Frame, StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminNav } from "@/features/catalog/components/admin-nav";

export function AdminModerationScreen({ pack }: { pack: Pack }) {
  const fila = [
    { motivo: "Sinalizada por um convidado", meta: "23h41 · Pista", variante: 3 },
    { motivo: "Marcada pelo classificador", meta: "23h38 · Mesa", variante: 9 },
  ];

  return (
    <GuestBackground fundo="claro" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Moderação</p>
        <Badge>{fila.length} na fila</Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          Nada sai do ar sozinho — você decide. A denúncia segura a foto, não apaga.
        </p>

        <div className="flex flex-col gap-2.5">
          {fila.map((f) => (
            <div key={f.motivo} className="flex gap-3 rounded-token bg-superficie p-2.5 shadow-suave">
              <span className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-token">
                <Frame atmosphere variant={f.variante} />
              </span>
              <div className="flex flex-1 flex-col">
                <p className="text-[0.8125rem]">{f.motivo}</p>
                <p className="mt-0.5 text-[0.6875rem] text-ink-3">{f.meta}</p>
                <div className="mt-auto flex gap-2 pt-2">
                  <span className="flex-1">
                    <Button size="sm" variant="secondary" width="full">
                      Manter
                    </Button>
                  </span>
                  <span className="flex-1">
                    <Button size="sm" width="full">
                      Ocultar
                    </Button>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdminNav active="moderation" />
    </GuestBackground>
  );
}
