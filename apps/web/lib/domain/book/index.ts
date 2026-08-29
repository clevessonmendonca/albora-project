/**
 * Domain: Book
 *
 * Lógica de negócio para geração de PDFs de livros e peças.
 */

export { generateBookPdf, type BookPdfInput, type BookPdfResult } from "./generate-book-pdf";
export { generatePiecePdf, type PiecePdfResult } from "./generate-piece-pdf";
export { generatePieceSvg, type PieceResult } from "./generate-piece-svg";
export { packPrintPieces, pieceFilename, PRINT_FORMATS, type PackedPieces } from "./pack-print-pieces";
export { loadPrintFonts, type PrintFonts } from "./piece-fonts";
export { planPiece, PIECE_INSTRUCTION, type PieceInput, type PiecePlan } from "./piece-layout";
export {
  missionCap,
  missionTitlesForPrint,
  highlightedMissions,
  PLATE_MISSION_CAP,
  TABLE_CARD_MISSION_CAP,
} from "./piece-missions";
export {
  planBook,
  planBookPage,
  BOOK_PAGE_MM,
  BOOK_BLEED_MM,
  BOOK_CUT_MM,
  BOOK_MARGIN_MM,
  type BookPagePlan,
} from "./layout";
