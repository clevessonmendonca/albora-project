import Link from "next/link";

export default function EventNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 font-corpo text-ink">
      <p className="text-lg font-medium">Festa não encontrada</p>
      <p className="mt-2 text-sm text-ink-2">
        Este link pode ter mudado ou expirado. Escaneie o QR da mesa para entrar.
      </p>
      <Link
        href="/scan"
        className="mt-6 rounded-token border border-linha bg-superficie px-6 py-2.5 text-sm no-underline text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
      >
        Escanear o QR
      </Link>
    </div>
  );
}
