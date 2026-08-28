"use client";

import { CameraButton } from "./camera-button";

export function FreeModeState({ slug }: { slug: string }) {
  return (
    <>
      <div className="grid gap-4 py-8 text-center">
        <p className="m-0 font-titulo text-[1.5rem] leading-[1.2] tracking-titulo text-ink">
          Modo livre
        </p>
        <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-3">
          Este evento não tem missões. Fotografe o que quiser e envie para o álbum da festa.
        </p>
      </div>
      <CameraButton slug={slug} label="Abrir a câmera" />
    </>
  );
}
