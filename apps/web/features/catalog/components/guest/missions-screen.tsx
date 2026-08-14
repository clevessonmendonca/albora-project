import { resolvePackText, type Pack } from "@albora/packs";
import {
  Badge,
  BackIcon,
  Button,
  CameraIcon,
  Frame,
  Star,
  StatusBar,
  TabBar,
} from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function MissionsScreen({ pack }: { pack: Pack }) {
  const missoes = pack.missoes.slice(0, 4);
  const daVez = missoes[1] ?? missoes[0];
  const estados = ["feita", "agora", "aberta", "aberta"] as const;

  return (
    <GuestBackground fundo="escuro" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">Missões</span>
        <Badge>1 de 4</Badge>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-[1.125rem] pb-4">
          <div className="relative aspect-[16/10] overflow-hidden rounded-superficie shadow-suave">
            <Frame atmosphere variant={2} />
            <div className="absolute inset-0 bg-veu-topo-medio" />
            <span className="absolute left-3.5 top-3.5">
              <Badge tone="accent">
                <span className="pulso size-1 rounded-full bg-current" />
                missão de agora
              </Badge>
            </span>
            <div className="absolute inset-x-4 bottom-4">
              <p className="font-titulo text-[1.375rem] font-light leading-tight tracking-titulo">
                {resolvePackText(pack, daVez?.chaveTitulo ?? "missao.livre")}
              </p>
              <span className="mt-3 inline-block">
                <Button size="sm">
                  <CameraIcon size={16} />
                  toque pra fotografar
                </Button>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-[1.125rem]">
          {missoes.map((m, i) => {
            const estado = estados[i] ?? "aberta";
            const feita = estado === "feita";
            const agora = estado === "agora";

            return (
              <div
                key={m.id}
                className={`flex items-center gap-3.5 rounded-token p-2 ${
                  agora ? "bg-acento-superficie-suave" : "bg-superficie"
                }`}
              >
                <span
                  className={`relative size-12 shrink-0 overflow-hidden rounded-token ${
                    estado === "aberta" ? "opacity-50" : ""
                  }`}
                >
                  <Frame atmosphere={estado !== "aberta"} variant={i * 6 + 3} />
                  {feita && (
                    <span className="absolute inset-0 grid place-items-center bg-bg-overlay text-ink">
                      <Star size={20} filled />
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{resolvePackText(pack, m.chaveTitulo)}</span>
                  <span
                    className={`mt-0.5 block text-[0.6875rem] uppercase tracking-rotulo ${
                      agora ? "text-acento-texto" : "text-ink-3"
                    }`}
                  >
                    {feita ? "feita" : agora ? "agora" : "aberta"}
                  </span>
                </span>

                {!feita && (
                  <span className="rotate-180 text-ink-3">
                    <BackIcon size={18} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <TabBar active="missoes" />
    </GuestBackground>
  );
}
