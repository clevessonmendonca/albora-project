"use client";

import { useInfiniteScroll } from "../../hooks/use-infinite-scroll";
import { SecondaryButton } from "@albora/ui-web";
import type { useFeed } from "../../hooks/use-feed";

type FeedFooterProps = {
  estado: ReturnType<typeof useFeed>["estado"];
  hasItems: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
};

export function FeedFooter({ estado, hasItems, onLoadMore, onRetry }: FeedFooterProps) {
  const canLoadMore = !estado.fim && estado.falha === null;
  const sentinela = useInfiniteScroll(onLoadMore, canLoadMore, estado.itens.length);

  if (estado.falha === "sessao") {
    return (
      <p className="mt-[calc(var(--espaco)*6)] text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada expirou.{" "}
        <a href="/scan" className="text-acento underline">
          Escaneie o QR da mesa
        </a>{" "}
        de novo para continuar.
      </p>
    );
  }

  if (estado.falha !== null) {
    return (
      <div className="mt-[calc(var(--espaco)*6)] text-center">
        <p className="mb-3 text-[0.9rem] leading-relaxed text-ink-2">
          Não consegui carregar mais fotos agora.
        </p>
        <SecondaryButton onClick={estado.falha === "cursor" || !hasItems ? onRetry : onLoadMore}>
          Tentar de novo
        </SecondaryButton>
      </div>
    );
  }

  if (estado.fim || estado.cursor === null) {
    return hasItems ? (
      <p data-testid="end-of-feed" className="sr-only">
        Fim do feed
      </p>
    ) : null;
  }

  return (
    <div ref={sentinela} className="mt-[calc(var(--espaco)*6)]">
      {estado.carregando && (
        <p aria-live="polite" className="text-center text-[0.9rem] leading-relaxed text-ink-2">
          Carregando mais fotos…
        </p>
      )}
    </div>
  );
}