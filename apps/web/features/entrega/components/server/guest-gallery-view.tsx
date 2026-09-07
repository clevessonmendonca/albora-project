import React from "react";
import { EmptyState, GuestMain, GuestShell } from "@albora/ui-web";
import type { FotoEntrega } from "@albora/application";

export type GuestGalleryViewProps =
  | { estado: "ok"; fotos: FotoEntrega[] }
  | { estado: "expirado" };

/** Sem sessão, sem cookie de convidado — identidade é só o token da URL. Tokens de design do evento não chegam aqui: `openGuestGallery` não devolve tema, então a tela usa o chão neutro do app (`GuestShell`/`GuestMain`, nunca hex). */
export function GuestGalleryView(props: GuestGalleryViewProps) {
  return (
    <GuestShell hideStatusBar>
      <GuestMain reserveTabBarSpace={false}>
        {props.estado === "expirado" ? (
          <EmptyState
            titulo="Este link expirou"
            descricao="Peça um novo link para quem organizou o evento."
          />
        ) : props.fotos.length === 0 ? (
          <EmptyState
            titulo="Nenhuma foto por aqui"
            descricao="As fotos da sua sessão aparecem aqui assim que forem publicadas."
          />
        ) : (
          <Grade fotos={props.fotos} />
        )}
      </GuestMain>
    </GuestShell>
  );
}

function Grade({ fotos }: { fotos: FotoEntrega[] }) {
  return (
    <ul className="m-0 grid grid-cols-3 gap-2 p-0" aria-label="Fotos da sua sessão">
      {fotos.map((foto) => (
        <li
          key={foto.id}
          className="relative aspect-square overflow-hidden rounded-media bg-superficie-alta"
        >
          <a href={foto.url}>
            <img
              src={foto.thumbUrl}
              alt={foto.legenda ?? "Foto da sua sessão"}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
