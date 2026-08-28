"use client";

import Link from "next/link";
import { adminVars } from "@/features/admin/components/server/admin-shell";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      style={adminVars()}
      className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 font-corpo text-ink"
    >
      <p className="font-titulo text-lg font-light">Erro no painel</p>
      <p className="mt-2 text-sm text-ink-2">Um erro inesperado aconteceu. Tente novamente ou volte ao painel.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 cursor-pointer rounded-pilula border border-linha bg-superficie-alta px-6 py-2.5 font-titulo text-sm text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
      >
        Tentar de novo
      </button>
      <Link
        href="/admin"
        className="mt-3 text-sm text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
      >
        Ir ao painel
      </Link>
    </div>
  );
}
