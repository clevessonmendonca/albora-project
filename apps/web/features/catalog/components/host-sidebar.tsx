import { resolvePackText, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";

export const HOST_SECTIONS = [
  "Ao vivo",
  "A parede",
  "O álbum",
  "Missões",
  "Identidade",
  "Recado",
  "Moderação",
  "O livro",
  "Convidados",
] as const;

export type HostSection = (typeof HOST_SECTIONS)[number];

export function HostSidebar({ pack, active }: { pack: Pack; active: HostSection }) {
  return (
    <aside className="w-[13.75rem] shrink-0 border-r border-linha px-[1.125rem] py-6">
      <p className="mb-6 mt-0 font-titulo text-[1.0625rem]">
        {resolvePackText(pack, "landing.exemplo.nome")}
      </p>
      {HOST_SECTIONS.map((item) => (
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
