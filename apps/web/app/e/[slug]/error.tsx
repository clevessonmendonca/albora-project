"use client";

export default function GuestError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 font-corpo text-ink">
      <p className="text-lg font-medium">Ops, algo deu errado</p>
      <p className="mt-2 text-sm text-ink-2">Suas fotos estão seguras. Tente recarregar.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-token border border-linha bg-superficie px-6 py-2.5 text-sm"
      >
        Tentar de novo
      </button>
    </div>
  );
}
