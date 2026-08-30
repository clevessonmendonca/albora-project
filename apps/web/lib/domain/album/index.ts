/**
 * Domain: Album
 * 
 * Lógica de negócio para montagem e servimento do álbum de fotos.
 */

export {
  buildServedAlbum,
  GET_URL_TTL_SECONDS,
  type ServedSlot,
  type ServedPhoto,
  type ServedPage,
  type ServedChapter,
  type ServedAlbum,
  // Deprecated exports
  VALIDADE_GET_SEGUNDOS,
  type SlotServido,
  type FotoServida,
  type PaginaServida,
  type CapituloServido,
  type AlbumServido,
  montarAlbumServido,
} from "./album";

export {
  chapterIdsFromPack,
  planAlbumChapters,
  chapterTitle,
  chapterHeadingVisible,
} from "./album-chapters";

export * from "./details";
