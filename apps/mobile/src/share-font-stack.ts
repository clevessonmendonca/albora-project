/**
 * Extrai a primeira família de uma stack CSS (`Fraunces, Georgia, serif`).
 * Skia `matchFont` usa uma família por vez — o resto fica como fallback do SO.
 */
export function primeiraFamiliaFonte(stack: string): string {
  const head = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!head || head.startsWith("var(")) return "System";
  return head;
}
