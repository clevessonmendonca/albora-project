import type { ContadoresDaParede } from "./types";

/**
 * O contador público (spec A4): a mesma dupla que `album.contadores` já
 * expõe ao convidado — fotos publicadas e convidados distintos do evento
 * corrente, depois do gate de moderação. `/api/wall` não inclui esse campo
 * hoje (a janela que a parede lê é a rotação, capada em `TETO_DA_PAREDE`/
 * `WALL_DISPLAY_CACHE_LIMIT`, não o total da noite) — por isso a validação
 * é estrita e falha para `null`: nunca inventa "847 fotos" a partir de uma
 * janela de 50/60 itens.
 */
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
