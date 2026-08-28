import { prefixoDoEvento } from "./chaves";

/** Só `published` e `chave` `/full` do evento — o ZIP não inventa segunda regra de visibilidade. */

export const TETO_DO_EXPORT = 2000;

export const ACAO_EXPORT_ACERVO = "export_acervo";

/** Step-up antes da primeira conexão de Drive (spec drive-export §1.3) — reusa o mesmo `host_step_up`, ação distinta. */
export const ACAO_DRIVE_CONNECT = "drive_connect";

/** `enviando`/`parcial`/`quota_insuficiente` só existem para Drive — ZIP é tudo-ou-nada. */
export type EstadoDoExport = "pronto" | "vazio" | "falhou" | "enviando" | "parcial" | "quota_insuficiente";

export type ItemDoAcervo = {
  id: string;
  chave: string;
  mime: string;
  estado: string;
};

const EXTENSAO: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
};

export function midiaExportavel(item: ItemDoAcervo, eventoId: string): boolean {
  if (item.estado !== "published") return false;
  if (!item.chave.startsWith(prefixoDoEvento(eventoId))) return false;
  return item.chave.endsWith("/full");
}

export function nomeNoZip(indice: number, mime: string): string {
  const n = String(indice + 1).padStart(4, "0");
  return `fotos/${n}${EXTENSAO[mime] ?? ".bin"}`;
}

export function nomeDoArquivoZip(slug: string): string {
  const limpo = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${limpo || "album"}.zip`;
}
