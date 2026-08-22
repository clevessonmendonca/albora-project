/**
 * Extrai a primeira família de uma stack CSS (`Fraunces, Georgia, serif`).
 * Skia `matchFont` usa uma família por vez — o resto fica como fallback do SO.
 */
export function primeiraFamiliaFonte(stack: string): string {
  const head = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!head || head.startsWith("var(")) return "System";
  return head;
}

export type FamiliaEmbutida = "Fraunces" | "Instrument Sans";

function normalizarFamilia(nome: string): string {
  return nome.trim().replace(/^["']|["']$/g, "").toLowerCase();
}

/**
 * Mapeia stacks licenciadas do resolvedor para as faces OFL embutidas no app.
 * `var(...)` deve ser resolvido antes (ex.: `paletteForFrame`).
 */
export function familiaEmbutidaDaStack(stack: string): FamiliaEmbutida | null {
  const trimmed = stack.trim();
  if (!trimmed || trimmed.startsWith("var(")) return null;

  const familias = trimmed.split(",").map((part) => normalizarFamilia(part));
  const joined = familias.join(" ");

  for (const nome of familias) {
    if (nome === "fraunces") return "Fraunces";
    if (nome === "instrument sans") return "Instrument Sans";
  }

  if (
    /\bsans-serif\b/.test(joined) ||
    /\bsystem-ui\b/.test(joined) ||
    /\bui-sans-serif\b/.test(joined) ||
    familias.includes("helvetica") ||
    familias.includes("arial")
  ) {
    return "Instrument Sans";
  }

  if (/\bserif\b/.test(joined) || familias.includes("georgia") || familias.includes("times new roman")) {
    return "Fraunces";
  }

  return null;
}
