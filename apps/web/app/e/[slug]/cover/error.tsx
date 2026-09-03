"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CoverError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const slug = usePathname()?.match(/^\/e\/([^/]+)/)?.[1];

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-8 text-center font-corpo text-ink">
      <p className="text-lg font-medium">A capa não carregou</p>
      <p className="mt-2 text-sm text-ink-2">Suas fotos estão seguras. Tente recarregar.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-token border border-linha bg-superficie px-6 py-2.5 text-sm transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
      >
        Tentar de novo
      </button>
      {slug && (
        <Link href={`/e/${slug}`} className="mt-3 text-sm text-ink-2 underline hover:opacity-70">
          Voltar ao início
        </Link>
      )}
    </div>
  );
}
