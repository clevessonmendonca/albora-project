import { padroesDoEvento } from "@albora/core";
import { texto, type Pack } from "@albora/packs";
import { Badge, Card, Frame, StatusBar, Switch } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { NavAdmin } from "@/features/catalog/components/nav-admin";

export function TelaAdminPainel({ pack, haMenores = false }: { pack: Pack; haMenores?: boolean }) {
  const padroes = padroesDoEvento({ haMenores });

  const stats = [
    { n: "847", o: "fotos enviadas" },
    { n: "112", o: "convidados" },
    { n: "4", o: "missões abertas" },
    {
      n: "0",
      o:
        padroes.denunciasParaSegurar === 1
          ? "denúncias · 1 segura"
          : `denúncias · ${padroes.denunciasParaSegurar} seguram`,
    },
  ];

  return (
    <ChaoClaro pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <div>
          <p className="font-titulo text-[1.375rem] leading-tight tracking-titulo">
            {texto(pack, "landing.exemplo.nome")}
          </p>
          <p className="text-[0.75rem] text-ink-3">A festa está acontecendo</p>
        </div>
        <Badge tone="accent">
          <span className="pulso size-1 rounded-full bg-current" />
          ao vivo
        </Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div key={s.o} className="rounded-token bg-superficie p-4 shadow-suave">
              <p className="font-titulo text-[1.75rem] font-light leading-none tabular-nums text-acento-texto">
                {s.n}
              </p>
              <p className="mt-1.5 text-[0.75rem] text-ink-2">{s.o}</p>
            </div>
          ))}
        </div>

        <Card highlighted className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-titulo text-base">Reações e comentários</p>
              <p className="mt-0.5 text-[0.78125rem] text-ink-2">
                {padroes.gateComecaFechado
                  ? "Começam fechados. Você abre quando quiser."
                  : "Abrem às 22h30. Você escolhe a hora."}
              </p>
            </div>
            <Switch checked={!padroes.gateComecaFechado} label="Gate de interação" />
          </div>
        </Card>

        <Card className="mt-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-titulo text-base">Há menores na festa</p>
              <p className="mt-0.5 text-[0.78125rem] text-ink-2">
                Sobe o piso pra todo mundo. Não perguntamos a idade de ninguém.
              </p>
            </div>
            <Switch checked={haMenores} label="Há menores na festa" />
          </div>
        </Card>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          Chegando agora
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="relative aspect-[3/4] overflow-hidden rounded-token">
              <Frame atmosphere variant={i * 6} />
            </span>
          ))}
        </div>
      </div>

      <NavAdmin active="aovivo" />
    </ChaoClaro>
  );
}
