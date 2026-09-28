/** Iniciais do nome do evento para o seletor da sidebar. "Clevesson & Miriã" vira "C&M"; um nome só vira a primeira letra. */
export function monograma(nome: string): string {
  const partes = nome
    .split(/\s*(?:&|\+|e)\s+|\s+/i)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (partes.length === 0) return "•";
  if (partes.length === 1) return (partes[0]?.[0] ?? "•").toUpperCase();

  const primeiro = partes[0]?.[0] ?? "";
  const ultimo = partes[partes.length - 1]?.[0] ?? "";
  return `${primeiro}&${ultimo}`.toUpperCase();
}
