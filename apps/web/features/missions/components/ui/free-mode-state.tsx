"use client";

import { CameraIcon } from "@albora/ui-web";
import { CameraButton } from "./camera-button";

export function FreeModeState({ slug }: { slug: string }) {
  return (
    <>
      <div className="grid justify-items-center gap-4 py-10 text-center">
        <div
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-superficie-alta text-ink-3"
        >
          <CameraIcon size={24} />
        </div>
        <div>
          <p className="tipo-subtitle tipo-balance m-0 text-ink">Modo livre</p>
          <p className="tipo-body m-0 mt-2 text-ink-2">
            Este evento não tem missões. Fotografe o que quiser e envie para o álbum da festa.
          </p>
        </div>
      </div>
      <CameraButton slug={slug} label="Abrir a câmera" />
    </>
  );
}
