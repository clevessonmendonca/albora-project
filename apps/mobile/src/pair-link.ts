const CASAS = 4;

function codigoQuatroDigitos(raw: string): string | null {
  const limpo = raw.replace(/\D/g, "").slice(0, CASAS);
  return limpo.length === CASAS ? limpo : null;
}

/**
 * Extrai o código de pareamento de deep link ou universal link.
 *
 * Aceita `albora://pair?codigo=1234` e `https://host/e/slug/pair?codigo=1234`.
 */
export function parsePairCodigoFromUrl(url: string | null | undefined): string | null {
  if (url === null || url === undefined || url.trim() === "") return null;

  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("codigo");
    if (fromQuery !== null) return codigoQuatroDigitos(fromQuery);
  } catch {
    const match = url.match(/[?&]codigo=(\d{1,4})/i);
    if (match?.[1]) return codigoQuatroDigitos(match[1]);
  }

  return null;
}
