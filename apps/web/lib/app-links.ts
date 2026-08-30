/**
 * @deprecated Importar de `@/lib/utils` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export type { AppLinksConfig } from "./utils/app-links";
export {
  readAppLinksConfig,
  appLinksReady,
  buildAppleAppSiteAssociation,
  buildAssetLinks,
} from "./utils/app-links";
