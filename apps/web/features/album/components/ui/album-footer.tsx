"use client";

import { SecondaryButton } from "@albora/ui-web";
import type { useAlbum } from "../../hooks/use-album";

type AlbumFooterProps = {
  falha: ReturnType<typeof useAlbum>["estado"]["falha"];
  onTentar: () => void;
};

export function AlbumFooter({ falha, onTentar }: AlbumFooterProps) {
  if (falha === "sessao") {
    return (
      <p className="mt-6 text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada expirou.{" "}
        <a href="/scan" className="text-acento underline">
          Escaneie o QR da mesa
        </a>{" "}
        de novo para ver o álbum.
      </p>
    );
  }

  if (falha !== null) {
    return (
      <div className="mt-6 text-center">
        <p className="mb-3 mt-0 text-[0.9rem] leading-relaxed text-ink-2">
          Não consegui carregar o álbum agora.
        </p>
        <SecondaryButton onClick={onTentar}>Tentar de novo</SecondaryButton>
      </div>
    );
  }

  return null;
}
