"use client";

import Link from "next/link";
import { useEffect } from "react";
import { captureException } from "@albora/core";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 font-corpo text-ink">
      <p className="text-lg font-medium">Algo deu errado</p>
      <p className="mt-2 text-sm text-ink-2">
        Um erro inesperado aconteceu. Tente recarregar a página.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-token border border-linha bg-superficie px-6 py-2.5 text-sm transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
      >
        Tentar de novo
      </button>
      <Link
        href="/"
        className="mt-3 text-sm text-ink-2 underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
