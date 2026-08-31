import { resolvePackText, type Pack } from "@albora/packs";
import { MissionBanner, StatusBar, Switch } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminNav } from "@/features/catalog/components/admin-nav";

export function AdminMissionsScreen({ pack }: { pack: Pack }) {
  const ligadas = pack.missoes.slice(0, 3);
  const desligadas = pack.missoes.slice(3);
  const primeira = ligadas[0] ? resolvePackText(pack, ligadas[0].chaveTitulo) : null;

  return (
    <GuestBackground background="light" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Missões</p>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-2">
          Liga e ordena. Sem texto livre — o vocabulário continua no pack.
        </p>

        <div className="mb-4 overflow-hidden rounded-superficie bg-superficie p-3">
          <p className="mb-2 mt-0 text-[0.625rem] uppercase tracking-rotulo text-ink-3">
            Na câmera
          </p>
          {primeira ? <MissionBanner index={1} total={ligadas.length} title={primeira} /> : null}
        </div>

        <div className="flex flex-col gap-2">
          {ligadas.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-token border border-linha bg-bg p-3"
            >
              <Switch checked label={resolvePackText(pack, m.chaveTitulo)} />
              <span className="min-w-0 flex-1 font-titulo text-[0.9rem] leading-snug">
                {resolvePackText(pack, m.chaveTitulo)}
              </span>
            </div>
          ))}
          {desligadas.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-token border border-linha bg-bg p-3"
            >
              <Switch checked={false} label={resolvePackText(pack, m.chaveTitulo)} />
              <span className="min-w-0 flex-1 font-titulo text-[0.9rem] leading-snug text-ink-2">
                {resolvePackText(pack, m.chaveTitulo)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-[1.125rem] pb-3">
        <span className="flex min-h-12 items-center justify-center rounded-pilula bg-acento font-semibold text-sobre-acento">
          Salvar missões
        </span>
      </div>

      <AdminNav active="more" />
    </GuestBackground>
  );
}
