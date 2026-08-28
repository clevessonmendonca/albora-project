import Link from "next/link";
import { adminVars } from "@/features/admin/components/server/admin-shell";

export default function AdminNotFound() {
  return (
    <div
      style={adminVars()}
      className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 font-corpo text-ink"
    >
      <p className="font-titulo text-lg font-light">Página não encontrada</p>
      <p className="mt-2 text-sm text-ink-2">
        Este evento não existe ou você não tem acesso a ele.
      </p>
      <Link
        href="/admin"
        className="mt-6 cursor-pointer rounded-pilula border border-linha bg-superficie-alta px-6 py-2.5 font-titulo text-sm no-underline text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
      >
        Ir ao painel
      </Link>
    </div>
  );
}
