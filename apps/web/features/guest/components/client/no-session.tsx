import { SkipLink } from "@albora/ui-web";

export function NoSession({ slug }: { slug: string }) {
  return (
    <>
      <SkipLink />
      <main id="main-content" className="grid min-h-dvh place-items-center bg-bg px-6 py-8 font-corpo text-ink">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-3 font-titulo text-[1.6rem] font-medium [text-wrap:balance]">
            Falta você entrar
          </h1>
          <p className="mb-7 leading-normal text-ink-2">
            É rápido: diz seu primeiro nome e as fotos da festa aparecem.
          </p>
          <a
            href={`/e/${encodeURIComponent(slug)}`}
            className="flex min-h-14 items-center justify-center rounded-token bg-ink text-[1.05rem] font-medium text-bg no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80"
          >
            Entrar
          </a>
        </div>
      </main>
    </>
  );
}
