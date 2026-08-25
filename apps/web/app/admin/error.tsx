"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 font-corpo text-ink">
      <p className="text-lg font-medium">Erro no painel</p>
      <p className="mt-2 text-sm text-ink-2">Um erro inesperado aconteceu no admin.</p>
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
