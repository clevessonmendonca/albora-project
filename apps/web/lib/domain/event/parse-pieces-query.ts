import type { PieceFormat } from "@albora/tokens";
import { PRINT_FORMATS } from "./pack-print-pieces";

export const PIECE_TYPES = ["svg", "pdf", "zip"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export type PiecesQuery =
  | { ok: true; kind: "single"; formato: PieceFormat; tipo: "pdf" | "svg" }
  | { ok: true; kind: "zip"; includeSvg: boolean }
  | { ok: false; campo: "formato" | "tipo"; aceitos: readonly string[] };

export function parsePiecesQuery(search: URLSearchParams): PiecesQuery {
  const tipoRaw = search.get("tipo");
  const tipo: PieceType | null = !tipoRaw
    ? "svg"
    : PIECE_TYPES.includes(tipoRaw as PieceType)
      ? (tipoRaw as PieceType)
      : null;
  if (!tipo) return { ok: false, campo: "tipo", aceitos: PIECE_TYPES };
  if (tipo === "zip") {
    return { ok: true, kind: "zip", includeSvg: search.get("svg") === "1" };
  }

  const formatoRaw = search.get("formato");
  const formato = PRINT_FORMATS.includes(formatoRaw as PieceFormat)
    ? (formatoRaw as PieceFormat)
    : null;
  if (!formato) return { ok: false, campo: "formato", aceitos: PRINT_FORMATS };
  return { ok: true, kind: "single", formato, tipo };
}
