import { texto, type Pack } from "@albora/packs";
import { Badge, Frame, StatusBar } from "@albora/ui-web";
import { ChaoConvidado } from "@/features/catalog/lib/chao-convidado";

export function TelaCamera({ pack, missao }: { pack: Pack; missao: string }) {
  return (
    <ChaoConvidado fundo="escuro" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">
          {texto(pack, "landing.exemplo.nome")}
        </span>
        <Badge>3 na fila</Badge>
      </div>

      <div className="relative mx-3 flex-1 overflow-hidden rounded-superficie">
        <Frame atmosphere variant={3} />

        <div className="absolute inset-x-3.5 top-3.5">
          <div className="rounded-token bg-acento p-3.5 text-sobre-acento">
            <p className="text-[0.5625rem] uppercase tracking-rotulo opacity-75">Missão 03 de 04</p>
            <p className="mt-1 font-titulo text-[1.0625rem] leading-tight">{missao}</p>
          </div>
        </div>

        <div className="absolute inset-x-3.5 bottom-3.5 flex flex-wrap gap-1.5">
          {pack.lugares.slice(0, 4).map((l, i) => (
            <Badge key={l.id} tone={i === 0 ? "accent" : "neutral"}>
              {texto(pack, l.chaveTitulo)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-7 pt-5 pb-9">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="relative size-[1.875rem] overflow-hidden rounded-[0.5rem]">
              <Frame atmosphere variant={i * 4} />
            </span>
          ))}
        </span>
        <span className="grid size-[4.5rem] place-items-center justify-self-center rounded-full border-[3px] border-ink">
          <span className="size-[3.625rem] rounded-full bg-acento" />
        </span>
        <span className="justify-self-end text-[0.75rem] text-ink-3">Rolo</span>
      </div>
    </ChaoConvidado>
  );
}
