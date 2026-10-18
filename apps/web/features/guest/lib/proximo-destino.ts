export function destinoSeguroDoConvidado(slug: string, proximo: string | null | undefined): string | null {
  if (!proximo) return null;
  const base = `/e/${encodeURIComponent(slug)}/`;
  if (!proximo.startsWith(base)) return null;
  const resto = proximo.slice(base.length);
  if (resto === "" || resto.startsWith("/") || resto.includes("//") || resto.includes("\\") || resto.includes("..")) {
    return null;
  }
  for (let i = 0; i < resto.length; i++) {
    if (resto.charCodeAt(i) < 32) return null;
  }
  return proximo;
}
