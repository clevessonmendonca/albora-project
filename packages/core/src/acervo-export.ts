import { prefixoDoEvento } from "./chaves";

/**
 * O que entra no "baixar tudo" do anfitrião (spec 016).
 *
 * A mesma coluna do álbum, do feed e da parede: só `published`. Ocultar no
 * admin, o pânico e a moderação já tiraram a foto dessa coluna — o ZIP não
 * inventa uma segunda regra de visibilidade.
 *
 * A chave tem de ser a `full` deste evento. Thumb, recado, peça impressa e
 * o próprio ZIP de export moram debaixo do mesmo prefixo e **não** entram.
 */

export const TETO_DO_EXPORT = 2000;

export const ACAO_EXPORT_ACERVO = "export_acervo";

/** Step-up antes da primeira conexão de Drive (spec drive-export §1.3) — reusa o mesmo `host_step_up`, ação distinta. */
export const ACAO_DRIVE_CONNECT = "drive_connect";

/**
 * `enviando`/`parcial`/`quota_insuficiente` só existem para `destination='drive'`
 * (spec drive-export §5) — o ZIP continua tudo-ou-nada, sempre
 * `pronto`/`vazio`/`falhou`.
 */
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
