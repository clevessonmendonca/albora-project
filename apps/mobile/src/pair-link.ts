const CASAS = 4;

function codigoQuatroDigitos(raw: string): string | null {
  const limpo = raw.replace(/\D/g, "").slice(0, CASAS);
  return limpo.length === CASAS ? limpo : null;
}

function passagemDaQuery(raw: string | null): string | null {
  if (raw === null) return null;
  const limpa = raw.trim();
  return limpa.length > 0 ? limpa : null;
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

/** Token one-shot da passagem web→app (ADR 0009). */
export function parsePairPassagemFromUrl(url: string | null | undefined): string | null {
  if (url === null || url === undefined || url.trim() === "") return null;

  try {
    const parsed = new URL(url);
    return passagemDaQuery(parsed.searchParams.get("passagem"));
  } catch {
    const match = url.match(/[?&]passagem=([^&]+)/i);
    if (match?.[1]) return passagemDaQuery(decodeURIComponent(match[1]));
  }

  return null;
}
