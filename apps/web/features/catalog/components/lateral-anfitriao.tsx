import { texto, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";

export const SECOES_DO_ANFITRIAO = [
  "Ao vivo",
  "A parede",
  "O álbum",
  "Missões",
  "Identidade",
  "Moderação",
  "O livro",
  "Convidados",
] as const;

export type SecaoDoAnfitriao = (typeof SECOES_DO_ANFITRIAO)[number];

export function LateralAnfitriao({ pack, active }: { pack: Pack; active: SecaoDoAnfitriao }) {
  return (
    <aside className="w-[13.75rem] shrink-0 border-r border-linha px-[1.125rem] py-6">
      <p className="mb-6 mt-0 font-titulo text-[1.0625rem]">
        {texto(pack, "landing.exemplo.nome")}
      </p>
      {SECOES_DO_ANFITRIAO.map((item) => (
        <p
          key={item}
          className={cn(
            "mb-[0.1875rem] rounded-token px-3 py-[0.5625rem] text-[0.875rem]",
            item === active ? "bg-superficie-alta text-ink" : "bg-transparent text-ink-2",
          )}
        >
          {item}
        </p>
      ))}
    </aside>
  );
}
