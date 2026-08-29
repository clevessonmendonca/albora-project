export {
  readAppLinksConfig,
  appLinksReady,
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  type AppLinksConfig,
} from "./app-links";
export {
  shareOrDownload,
  shareWasAborted,
  compartilhado,
  baixado,
  cancelado,
  type ShareOutcome,
} from "./share-or-download";
export { parsePlatformLiveMetrics } from "./platform-metrics";
export {
  isValidSlug,
  extractSlug,
  eventPath,
  eventEntryPath,
  eventEntryUrl,
  whatsappInviteUrl,
} from "./qr";
export { webTransport, ApiError, type Transport } from "./transport";
