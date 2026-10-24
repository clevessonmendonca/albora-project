import React from "react";
import { CameraIcon, GridIcon, PersonIcon, PlusIcon, StackIcon } from "@albora/ui-web";

const PASSOS = [
  { titulo: "Aponte a câmera no QR", Icone: CameraIcon },
  { titulo: "Entra sem baixar app", Icone: PersonIcon },
  { titulo: "Envia uma foto", Icone: PlusIcon },
  { titulo: "Aparece no álbum", Icone: GridIcon },
  { titulo: "E no telão, na hora", Icone: StackIcon },
] as const;

export function VejaOAlboraAcontecer() {
  return (
    <section aria-labelledby="fluxo-titulo">
      <h2 id="fluxo-titulo" className="tipo-subtitle m-0 mb-4 text-ink">Veja o Álbora acontecer</h2>
      <ol className="m-0 flex list-none gap-3 overflow-x-auto p-0 pb-2 [scrollbar-width:none]">
        {PASSOS.map(({ titulo, Icone }, i) => (
          <li key={titulo} className="w-32 flex-none">
            <div className="grid aspect-3/4 place-items-center rounded-superficie border border-linha bg-superficie-alta text-ink-2">
              <Icone size={32} />
            </div>
            <span className="tipo-label mt-2 block text-acento-texto">{String(i + 1).padStart(2, "0")}</span>
            <b className="tipo-caption mt-0.5 block leading-tight text-ink">{titulo}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}
