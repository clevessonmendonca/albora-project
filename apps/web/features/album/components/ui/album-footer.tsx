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
      <p className="tipo-body mt-6 text-center text-ink-2">
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
        <p className="tipo-body mb-3 mt-0 text-ink-2">
          Não consegui carregar o álbum agora.
        </p>
        <SecondaryButton onClick={onTentar}>Tentar de novo</SecondaryButton>
      </div>
    );
  }

  return null;
}
