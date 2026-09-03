export default function GuestLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg font-corpo text-ink">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-linha border-t-acento-texto" />
      <p className="text-sm text-ink-2">Carregando...</p>
    </div>
  );
}
