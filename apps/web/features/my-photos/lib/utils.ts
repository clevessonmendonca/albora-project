import type { ItemDaGaleria } from "@albora/core";

/**
 * Retorna label de estado para exibição.
 */
export function rotuloEstado(estado: ItemDaGaleria["estado"]): string {
  if (estado === "subindo") return "Subindo…";
  if (estado === "falhou") return "Não subiu";
  return "";
}
