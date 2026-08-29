import type { PieceFormat } from "@albora/tokens";
import { generatePiecePdf } from "./generate-piece-pdf";
import { generatePieceSvg } from "./generate-piece-svg";
import type { PieceInput } from "./piece-layout";
import { buildZip } from "@/lib/zip-bytes";

export const PRINT_FORMATS: PieceFormat[] = ["placa-a4", "card-de-mesa", "card-de-missao"];

export type PackedPieces = {
  zip: Uint8Array;
  avisos: string[];
  problemas: string[];
  arquivos: string[];
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function pieceFilename(slug: string, formato: PieceFormat, ext: "pdf" | "svg"): string {
  return `albora-${slug}-${formato}.${ext}`;
}

export async function packPrintPieces(
  base: Omit<PieceInput, "formato">,
  opts: { slug: string; includeSvg?: boolean },
): Promise<PackedPieces> {
  const avisos: string[] = [];
  const files: { name: string; data: Uint8Array }[] = [];

  for (const formato of PRINT_FORMATS) {
    const entrada = { ...base, formato };
    const pdf = await generatePiecePdf(entrada);
    if (pdf.problemas.length > 0) {
      return { zip: new Uint8Array(), avisos: unique([...avisos, ...pdf.avisos]), problemas: pdf.problemas, arquivos: [] };
    }
    avisos.push(...pdf.avisos);
    files.push({ name: pieceFilename(opts.slug, formato, "pdf"), data: pdf.pdf });

    if (!opts.includeSvg) continue;

    const svg = await generatePieceSvg(entrada);
    if (svg.problemas.length > 0) {
      return { zip: new Uint8Array(), avisos: unique([...avisos, ...svg.avisos]), problemas: svg.problemas, arquivos: [] };
    }
    avisos.push(...svg.avisos);
    files.push({
      name: pieceFilename(opts.slug, formato, "svg"),
      data: new TextEncoder().encode(svg.svg),
    });
  }

  return {
    zip: buildZip(files),
    avisos: unique(avisos),
    problemas: [],
    arquivos: files.map((f) => f.name),
  };
}
