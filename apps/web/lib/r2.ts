/**
 * @deprecated Importar de `@/lib/infrastructure/storage` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
 */
export {
  signPut,
  signGet,
  inspectObject,
  streamObject,
  readThumb,
  deleteObject,
  bufferObject,
  rangeDoPrefixoMagic,
  metadadosDaInspecao,
  assinarPut,
  assinarGet,
  inspecionarObjeto,
  lerThumb,
  type ObjectMetadata,
  type MetadadosObjeto,
} from "./infrastructure/storage/r2-client";
