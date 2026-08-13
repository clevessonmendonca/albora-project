import { GridIcon, MoreIcon, PersonIcon, StackIcon } from "@albora/ui-web";
import { IconeSinal } from "./icone-sinal";

export type SecaoAdmin = "aovivo" | "parede" | "moderacao" | "convidados" | "mais";

export function NavAdmin({ active }: { active: SecaoAdmin }) {
  const abas = [
    { id: "aovivo", rotulo: "Ao vivo", icone: <StackIcon /> },
    { id: "parede", rotulo: "Parede", icone: <GridIcon /> },
    { id: "moderacao", rotulo: "Fila", icone: <IconeSinal /> },
    { id: "convidados", rotulo: "Convidados", icone: <PersonIcon /> },
    { id: "mais", rotulo: "Mais", icone: <MoreIcon size={22} /> },
  ] as const;

  return (
    <nav className="flex items-center justify-around border-t border-linha bg-bg px-2 pt-2.5 pb-[1.625rem]">
      {abas.map((a) => (
        <span
          key={a.id}
          className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo ${
            a.id === active ? "text-acento" : "text-ink-3"
          }`}
        >
          {a.icone}
          {a.rotulo}
        </span>
      ))}
    </nav>
  );
}
