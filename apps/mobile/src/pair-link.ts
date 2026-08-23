const CASAS = 4;

function codigoQuatroDigitos(raw: string): string | null {
  const limpo = raw.replace(/\D/g, "").slice(0, CASAS);
  return limpo.length === CASAS ? limpo : null;
}

function passagemDaQuery(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const limpa = raw.trim();
  return limpa.length > 0 ? limpa : null;
}

function primeiroParam(valor: string | string[] | undefined): string | null {
  if (typeof valor === "string") return valor;
  if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
  return null;
}

export type PairRedeemPayload = { codigo: string } | { passagem: string };

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

/**
 * Payload a partir de query params do Expo Router (`/pair?passagem=` ou `?codigo=`).
 * Preferência: passagem > codigo.
 */
export function pairPayloadFromParams(params: {
  codigo?: string | string[];
  passagem?: string | string[];
}): PairRedeemPayload | null {
  const passagem = passagemDaQuery(primeiroParam(params.passagem));
  if (passagem) return { passagem };
  const codigo = codigoQuatroDigitos(primeiroParam(params.codigo) ?? "");
  if (codigo) return { codigo };
  return null;
}

export function pairPayloadKey(payload: PairRedeemPayload): string {
  return "passagem" in payload ? `p:${payload.passagem}` : `c:${payload.codigo}`;
}
