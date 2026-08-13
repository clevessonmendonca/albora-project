import type { Pack } from "@albora/packs";
import { Badge, Button, Frame, MoreIcon, StatusBar } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { NavAdmin } from "@/features/catalog/components/nav-admin";

export function TelaAdminLivro({ pack }: { pack: Pack }) {
  return (
    <ChaoClaro pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">O livro</p>
        <Badge>18 páginas</Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          Diagramação por slots, nunca posição livre: você escolhe a foto, o slot cuida do
          enquadramento. Nada corta na vertical.
        </p>

        <p className="mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          Capítulo · A chegada
        </p>
        <div className="rounded-token bg-superficie p-3 shadow-suave">
          <div className="grid grid-cols-2 gap-2">
            <span className="relative row-span-2 aspect-[3/4] overflow-hidden rounded-token">
              <Frame atmosphere variant={2} />
            </span>
            <span className="relative aspect-[4/3] overflow-hidden rounded-token">
              <Frame atmosphere variant={7} />
            </span>
            <span className="grid aspect-[4/3] place-items-center rounded-token border border-dashed border-linha text-ink-3">
              <MoreIcon size={20} />
            </span>
          </div>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          Capítulo · A festa
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="grid aspect-[3/4] place-items-center rounded-token border border-dashed border-linha text-ink-3"
            >
              <MoreIcon size={18} />
            </span>
          ))}
        </div>

        <div className="mt-4">
          <Button width="full">Escolher fotos</Button>
        </div>
      </div>

      <NavAdmin active="mais" />
    </ChaoClaro>
  );
}
