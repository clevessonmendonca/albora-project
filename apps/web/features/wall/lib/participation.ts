import type { ContadoresDaParede } from "./types";

/** Contador público spec A4: validação estrita — `/api/wall` devolve a janela de rotação, não o total da noite; `null` em vez de inventar "847 fotos" a partir de 50 itens. */
export function paraContadoresDaParede(valor: unknown): ContadoresDaParede | null {
  if (typeof valor !== "object" || valor === null) return null;

  const bruto = valor as Record<string, unknown>;
  const fotos = numeroNaoNegativo(bruto.fotos);
  const convidados = numeroNaoNegativo(bruto.convidados);
  if (fotos === null || convidados === null) return null;

  return { fotos, convidados };
}

function numeroNaoNegativo(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) return null;
  return Math.floor(valor);
}

/** Rótulo por extenso, para o `aria-label` do overlay — sempre o valor final, nunca o intermediário da animação. */
export function rotuloDosContadores(contadores: ContadoresDaParede): string {
  const { fotos, convidados } = contadores;
  return `${fotos} ${fotos === 1 ? "foto" : "fotos"} · ${convidados} ${convidados === 1 ? "pessoa" : "pessoas"}`;
}
