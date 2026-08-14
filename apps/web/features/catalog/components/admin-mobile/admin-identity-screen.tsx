import { texto, type Pack } from "@albora/packs";
import { Badge, Button, cn, Frame, StatusBar } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { NavAdmin } from "@/features/catalog/components/nav-admin";

export function AdminIdentityScreen({ pack }: { pack: Pack }) {
  return (
    <ChaoClaro pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Identidade</p>
        <Badge tone="accent">prévia ao vivo</Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          A cor e a fonte do casal mandam em tudo — app, telão e o PDF da placa. Um resolvedor, e
          todos renderizam igual.
        </p>

        <div className="relative aspect-[16/10] overflow-hidden rounded-superficie shadow-suave">
          <Frame atmosphere variant={1} />
          <div className="absolute inset-0 bg-veu-admin" />
          <div className="absolute inset-x-4 bottom-4">
            <p className="font-titulo text-[1.375rem] leading-tight tracking-titulo">
              {texto(pack, "landing.exemplo.nome")}
            </p>
            <span className="mt-2 inline-flex items-center rounded-pilula bg-acento px-3 py-1.5 text-[0.75rem] font-medium text-sobre-acento">
              Enviar foto
            </span>
          </div>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          A cor do casal
        </p>
        <div className="flex items-center gap-2.5">
          {["bg-amostra-clara", "bg-acento", "bg-amostra-escura"].map((c, i) => (
            <span
              key={c}
              className={cn(
                "size-9 rounded-full",
                c,
                i === 1 && "ring-2 ring-ink ring-offset-2 ring-offset-bg",
              )}
            />
          ))}
          <span className="ml-1 text-[0.75rem] text-ink-3">a família da cor escolhida</span>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          A fonte
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-token bg-superficie p-3">
            <p className="text-[0.625rem] uppercase tracking-rotulo text-ink-3">Título</p>
            <p className="mt-1 font-titulo text-[1.25rem]">{texto(pack, "landing.exemplo.nome")}</p>
          </div>
          <div className="rounded-token bg-superficie p-3">
            <p className="text-[0.625rem] uppercase tracking-rotulo text-ink-3">Corpo</p>
            <p className="mt-1 text-[0.9375rem]">A festa está acontecendo</p>
          </div>
        </div>

        <div className="mt-4">
          <Button width="full">Editar identidade</Button>
        </div>
      </div>

      <NavAdmin active="mais" />
    </ChaoClaro>
  );
}
