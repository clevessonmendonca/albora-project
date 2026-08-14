import { padroesDoEvento } from "@albora/core";
import type { Pack } from "@albora/packs";
import { Badge, Card, cn, Frame, Switch } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { HostSidebar } from "@/features/catalog/components/host-sidebar";

export function HostPanelScreen({ pack, hasMinors = false }: { pack: Pack; hasMinors?: boolean }) {
  const padroes = padroesDoEvento({ haMenores: hasMinors });

  const efeitos: [string, string][] = [
    [
      "Compartilhar para fora",
      padroes.compartilhamentoExterno ? "ligado" : "desligado por padrão",
    ],
    [
      "Para segurar uma foto",
      padroes.denunciasParaSegurar === 1
        ? "uma denúncia"
        : `${padroes.denunciasParaSegurar} denúncias`,
    ],
    [
      "Gate de interação",
      padroes.gateComecaFechado ? "começa fechado" : "abre junto com a festa",
    ],
  ];

  return (
    <GuestBackground fundo="claro" pack={pack}>
      <div className="flex h-full">
        <HostSidebar pack={pack} active="Ao vivo" />

        <main className="flex-1 overflow-hidden px-8 py-7">
          <div className="flex items-center justify-between gap-4">
            <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">
              A festa está acontecendo
            </p>
            <Badge tone="accent">
              <span className="pulso size-1.5 rounded-full bg-current" />
              ao vivo
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {[
              { n: "847", o: "fotos enviadas" },
              { n: "112", o: "convidados fotografando" },
              { n: "4", o: "missões abertas" },
              {
                n: "0",
                o:
                  padroes.denunciasParaSegurar === 1
                    ? "denúncias · uma já segura"
                    : `denúncias · ${padroes.denunciasParaSegurar} seguram`,
              },
            ].map((x) => (
              <div key={x.o} className="rounded-token bg-superficie-alta p-[1.125rem]">
                <p className="m-0 font-titulo text-[1.875rem] font-light leading-none tabular-nums text-acento-texto">
                  {x.n}
                </p>
                <p className="mt-2 mb-0 text-[0.78125rem] text-ink-2">{x.o}</p>
              </div>
            ))}
          </div>

          <Card highlighted className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block font-titulo text-[1.0625rem]">Reações e comentários</span>
                <span className="mt-1 block text-[0.8125rem] text-ink-2">
                  {padroes.gateComecaFechado
                    ? "Começam fechados. Quem abre, e quando, é você."
                    : "Abrem às 22h30. Quem escolhe a hora é você."}
                </span>
              </span>
              <Switch checked={!padroes.gateComecaFechado} />
            </div>
          </Card>

          <Card className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block font-titulo text-[1.0625rem]">Há menores nesta festa</span>
                <span className="mt-1 block text-[0.8125rem] text-ink-2">
                  Sobe o piso para todo mundo. Não perguntamos a idade de ninguém, aqui nem em
                  lugar nenhum — quem conhece os convidados é você.
                </span>
              </span>
              <Switch checked={hasMinors} />
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-2">
              {efeitos.map(([rotulo, valor]) => (
                <span key={rotulo} className="rounded-token bg-superficie-alta px-3 py-2.5">
                  <span className="block text-[0.625rem] uppercase tracking-rotulo text-ink-3">
                    {rotulo}
                  </span>
                  <span
                    className={cn(
                      "mt-[0.1875rem] block text-[0.8125rem]",
                      hasMinors ? "text-acento-texto" : "text-ink-2",
                    )}
                  >
                    {valor}
                  </span>
                </span>
              ))}
            </div>
          </Card>

          <p className="mb-3 mt-6 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
            Chegando agora
          </p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="relative aspect-[3/4]">
                <span className="absolute inset-0 overflow-hidden rounded-token">
                  <Frame atmosphere variant={i * 6} />
                </span>
              </span>
            ))}
          </div>
        </main>
      </div>
    </GuestBackground>
  );
}
