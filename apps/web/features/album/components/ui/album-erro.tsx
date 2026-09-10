"use client";

import { CameraIcon, SecondaryButton } from "@albora/ui-web";
import type { FalhaAlbum } from "../../hooks/use-album";

/**
 * Borda de erro quando ainda não há álbum na tela — a falha ocupa a área de
 * conteúdo, com o mesmo peso visual do vazio, em vez de uma linha solta no pé.
 * `sessao` leva de volta ao QR; `rede` oferece tentar de novo.
 */
export function AlbumErro({
  falha,
  onTentar,
}: {
  falha: FalhaAlbum;
  onTentar: () => void;
}) {
  const sessao = falha === "sessao";

  return (
    <div className="flex flex-col items-center py-[calc(var(--espaco)*8)] text-center">
      <div
        aria-hidden
        className="mb-4 grid size-14 place-items-center rounded-full bg-superficie-alta text-ink-3"
      >
        <CameraIcon size={24} />
      </div>
      <p className="tipo-subtitle tipo-balance mb-2 text-ink">
        {sessao ? "Sua entrada expirou." : "Não consegui carregar o álbum agora."}
      </p>
      <p className="tipo-body mb-6 max-w-[24rem] text-ink-2">
        {sessao
          ? "Escaneie o QR da mesa de novo para ver o álbum."
          : "Pode ser a conexão. Tente de novo em um instante."}
      </p>
      {sessao ? (
        <a
          href="/scan"
          className="grid min-h-[3.375rem] w-full place-items-center rounded-pilula bg-acento px-[1.125rem] font-medium text-sobre-acento no-underline shadow-suave transition-transform duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Escanear o QR
        </a>
      ) : (
        <SecondaryButton onClick={onTentar}>Tentar de novo</SecondaryButton>
      )}
    </div>
  );
}
