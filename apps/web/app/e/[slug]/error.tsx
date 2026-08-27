"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GuestError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const slugMatch = pathname?.match(/^\/e\/([^/]+)/);
  const coverHref = slugMatch ? `/e/${slugMatch[1]}/cover` : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 font-corpo text-ink">
      <p className="text-lg font-medium">Ops, algo deu errado</p>
      <p className="mt-2 text-sm text-ink-2">Suas fotos estão seguras. Tente recarregar.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-token border border-linha bg-superficie px-6 py-2.5 text-sm transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
      >
        Tentar de novo
      </button>
      {coverHref && (
        <Link
          href={coverHref}
          className="mt-3 text-sm text-ink-2 underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
        >
          Voltar ao início
        </Link>
      )}
    </div>
  );
}
