import type { IdentidadeDoEvento } from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";

/** Extrai monograma, título e data para a moldura a partir dos tokens do evento. */
export function identityToFrame(
  slug: string,
  comecaEm: Date,
  identityTokens: Record<string, unknown>,
  pack: Pack | undefined,
): IdentidadeDoEvento {
  const camada = identityTokens as {
    monograma?: string;
    titulo?: string;
    texto?: { monograma?: string; titulo?: string };
  };

  const monograma =
    camada.texto?.monograma ??
    camada.monograma ??
    (pack ? resolvePackText(pack, "landing.exemplo.nome").slice(0, 2).toUpperCase() : slug.slice(0, 2).toUpperCase());

  const titulo =
    camada.texto?.titulo ??
    camada.titulo ??
    (pack ? resolvePackText(pack, "landing.exemplo.nome") : slug);

  const data = comecaEm.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return { monograma, titulo, data, slug };
}
