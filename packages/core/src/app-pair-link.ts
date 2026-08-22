const CASAS = 4;

function codigoQuatroDigitos(valor: string): string {
  const limpo = valor.replace(/\D/g, "").slice(0, CASAS);
  if (limpo.length !== CASAS) {
    throw new Error("código de pareamento deve ter 4 dígitos");
  }
  return limpo;
}

/** Deep link custom scheme — abre o app já na tela de parear. */
export function appPairSchemeLink(codigo: string): string {
  return `albora://pair?codigo=${codigoQuatroDigitos(codigo)}`;
}

/** Caminho HTTPS relativo — vira App Link / Universal Link quando o domínio estiver verificado. */
export function appPairUniversalPath(slug: string, codigo: string): string {
  const digits = codigoQuatroDigitos(codigo);
  return `/e/${encodeURIComponent(slug)}/pair?codigo=${digits}`;
}

export function appPairUniversalLink(webOrigin: string, slug: string, codigo: string): string {
  const base = webOrigin.replace(/\/$/, "");
  return `${base}${appPairUniversalPath(slug, codigo)}`;
}
