export function SkipLink({ href = "#main-content" }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pilula focus:bg-acento focus:px-4 focus:py-2 focus:text-sobre-acento focus:no-underline focus:shadow-e2 focus:outline-none focus:ring-2 focus:ring-acento focus:ring-offset-2"
    >
      Ir para o conteúdo
    </a>
  );
}
