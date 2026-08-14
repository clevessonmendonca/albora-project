import type { Pack } from "@albora/packs";
import { Badge, Button, Card, StatusBar, Switch } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminNav } from "@/features/catalog/components/admin-nav";

export function AdminRetentionScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="light" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Retenção</p>
        <Badge>conta</Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <div className="rounded-token bg-superficie p-4 shadow-suave">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1.5">
              <span className="size-2.5 rounded-full bg-acento" />
              <span className="my-1 w-px flex-1 bg-linha" />
              <span className="size-2.5 rounded-full bg-critico" />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <p className="font-titulo text-[0.9375rem]">Dia 330 · vai pro seu drive</p>
                <p className="mt-0.5 text-[0.75rem] text-ink-2">
                  Exportamos tudo pra nuvem do casal, antes de qualquer coisa sumir.
                </p>
              </div>
              <div>
                <p className="font-titulo text-[0.9375rem] text-critico">Dia 365 · apagamos tudo</p>
                <p className="mt-0.5 text-[0.75rem] text-ink-2">
                  Cumprido por job, não por promessa. Depois disso, não existe mais aqui.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Button width="full" variant="secondary">
            Exportar agora
          </Button>
        </div>

        <Card className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-titulo text-base">Memórias automáticas</p>
              <p className="mt-0.5 text-[0.78125rem] text-ink-2">
                Opt-in. Desliga num toque, sem fricção e sem tentativa de retenção.
              </p>
            </div>
            <Switch checked={false} label="Memórias automáticas" />
          </div>
        </Card>

        <div className="mt-4 rounded-token border border-critico-borda p-4">
          <p className="font-titulo text-base text-critico">Excluir este evento</p>
          <p className="mt-0.5 text-[0.78125rem] text-ink-2">
            Exclui de verdade e rápido — as fotos, o feed, tudo. Sem “tem certeza que quer
            perder…”.
          </p>
          <span className="mt-3 inline-flex items-center rounded-pilula bg-critico px-5 py-2.5 text-sm font-medium text-sobre-acento">
            Excluir evento
          </span>
        </div>
      </div>

      <AdminNav active="more" />
    </GuestBackground>
  );
}
