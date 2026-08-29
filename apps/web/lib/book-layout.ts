/**
 * @deprecated Importar de `@/lib/domain/book` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export {
  planBook,
  planBookPage,
  BOOK_PAGE_MM,
  BOOK_BLEED_MM,
  BOOK_CUT_MM,
  BOOK_MARGIN_MM,
  BOOK_HEADER_MM,
  BOOK_GAP_MM,
  type BookSlotBox,
  type BookPagePlan,
} from "./domain/book/layout";
