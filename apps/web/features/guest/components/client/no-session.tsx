import { SkipLink } from "@albora/ui-web";

export function NoSession({ slug }: { slug: string }) {
  return (
    <>
      <SkipLink />
      <main id="main-content" className="grid min-h-dvh place-items-center bg-bg px-6 py-8 font-corpo text-ink">
        <div className="w-full max-w-sm text-center">
          <h1 className="tipo-title tipo-balance m-0 mb-3 text-ink">Falta você entrar</h1>
          <p className="m-0 mb-7 tipo-body text-ink-2">
            É rápido: diz seu primeiro nome e as fotos da festa aparecem.
          </p>
          <a
            href={`/e/${encodeURIComponent(slug)}`}
            className="flex min-h-14 items-center justify-center rounded-pilula bg-acento px-7 text-[1.0625rem] font-medium text-sobre-acento no-underline shadow-suave transition-[transform,opacity] duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Entrar
          </a>
        </div>
      </main>
    </>
  );
}
