import { resolvePackText, type Pack } from "@albora/packs";
import { MissionBanner, Switch } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { HostSidebar } from "@/features/catalog/components/host-sidebar";

export function HostMissionsScreen({ pack }: { pack: Pack }) {
  const ligadas = pack.missoes.slice(0, 3);
  const desligadas = pack.missoes.slice(3);
  const primeira = ligadas[0] ? resolvePackText(pack, ligadas[0].chaveTitulo) : null;

  return (
    <GuestBackground background="light" pack={pack}>
      <div className="flex h-full">
        <HostSidebar pack={pack} active="Missões" />

        <main className="flex-1 overflow-hidden px-8 py-7">
          <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">Missões</p>
          <p className="mb-5 mt-3 max-w-[52ch] text-[0.875rem] leading-normal text-ink-2">
            Liga e ordena as missões do pack. O convidado vê esta lista na aba Missões — sem texto
            livre, para o vocabulário do evento continuar no pack.
          </p>

          <div className="grid gap-6 lg:grid-cols-[minmax(16rem,1fr)_minmax(14rem,18rem)]">
            <div className="flex flex-col gap-2">
              {ligadas.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-token border border-linha bg-bg p-3"
                >
                  <Switch checked label={resolvePackText(pack, m.chaveTitulo)} />
                  <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug">
                    {resolvePackText(pack, m.chaveTitulo)}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <span className="grid size-8 place-items-center rounded-token border border-linha bg-superficie font-titulo text-sm text-ink">
                      ↑
                    </span>
                    <span
                      className={`grid size-8 place-items-center rounded-token border border-linha bg-superficie font-titulo text-sm ${
                        i === ligadas.length - 1 ? "opacity-30" : "text-ink"
                      }`}
                    >
                      ↓
                    </span>
                  </span>
                </div>
              ))}

              {desligadas.length > 0 && (
                <>
                  <p className="mb-0 mt-3 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                    Do pack, desligadas
                  </p>
                  {desligadas.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-token border border-linha bg-bg p-3"
                    >
                      <Switch checked={false} label={resolvePackText(pack, m.chaveTitulo)} />
                      <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug">
                        {resolvePackText(pack, m.chaveTitulo)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="rounded-token bg-superficie-alta p-4">
              <p className="mb-3 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                Na câmera
              </p>
              <div className="relative min-h-[11rem] overflow-hidden rounded-superficie bg-superficie">
                <div className="absolute inset-x-3 top-3">
                  {primeira ? (
                    <MissionBanner index={1} total={ligadas.length} title={primeira} />
                  ) : (
                    <p className="m-0 text-sm text-ink-2">Sem faixa de missão — modo livre.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <span className="mt-6 inline-flex rounded-pilula bg-acento px-7 py-3 font-semibold text-sobre-acento">
            Salvar missões
          </span>
        </main>
      </div>
    </GuestBackground>
  );
}
