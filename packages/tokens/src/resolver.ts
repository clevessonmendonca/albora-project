import { escalaDoFundo } from "./escalas";
import type {
  Background,
  ResolutionInput,
  SemanticScale,
  TokenLayer,
  Tokens,
} from "./types";

const BACKGROUND_ALIASES: Record<string, Background> = {
  dark: "dark",
  light: "light",
  escuro: "dark",
  claro: "light",
};

/** Maps stored PT values onto the canonical English background. */
export function normalizeBackground(value: unknown): Background | undefined {
  if (typeof value !== "string") return undefined;
  return BACKGROUND_ALIASES[value];
}

function layerBackground(layer: { background?: unknown; fundo?: unknown }): Background | undefined {
  let found: Background | undefined;
  for (const key of Object.keys(layer)) {
    if (key !== "background" && key !== "fundo") continue;
    const normalized = normalizeBackground((layer as Record<string, unknown>)[key]);
    if (normalized) found = normalized;
  }
  return found;
}

function canonicalize(tokens: Tokens): Tokens {
  return {
    cores: tokens.cores,
    fontes: tokens.fontes,
    escala: tokens.escala,
    movimento: tokens.movimento,
    tracking: tokens.tracking,
    background: layerBackground(tokens) ?? "dark",
  };
}

/**
 * O resolvedor. Um só, para todos os renderizadores — web, nativo, telão,
 * SVG de impressão e moldura de compartilhamento (ADR 0003).
 *
 * Nenhum renderizador implementa o seu. Se dois implementarem, a identidade
 * do casal propaga num e não no outro, e a placa impressa deixa de combinar
 * com o telão — que é a coerência que o produto vende.
 *
 * Cadeia: marca → pack → evento. O evento ganha porque é a identidade de
 * quem pagou.
 *
 * Camadas ainda podem trazer `fundo: "claro"|"escuro"` de JSON antigo; a
 * saída é sempre `background: "light"|"dark"`.
 */
export function resolveTokens(input: ResolutionInput): Tokens {
  const layers = [input.pack, input.evento].filter(
    (layer): layer is TokenLayer => layer !== undefined,
  );

  return layers.reduce<Tokens>(
    (accumulated, layer) => ({
      cores: { ...accumulated.cores, ...layer.cores },
      fontes: { ...accumulated.fontes, ...layer.fontes },
      escala: { ...accumulated.escala, ...layer.escala },
      movimento: { ...accumulated.movimento, ...layer.movimento },
      tracking: { ...accumulated.tracking, ...layer.tracking },
      background: layerBackground(layer) ?? accumulated.background,
    }),
    canonicalize(input.marca),
  );
}

/**
 * A escala que o componente consome, já resolvida para o chão escolhido.
 *
 * **Trocar o chão re-deriva o acento.** Não é trocar uma cor, é trocar um
 * conjunto: o mesmo âmbar que é seguro sobre noite reprova contraste sobre
 * papel, e deixar o casal escolher a cor sem re-derivar entregaria uma
 * interface ilegível às 22h num salão escuro. A validação é trabalho do
 * sistema, nunca escolha de quem paga.
 */
export function resolveScale(tokens: Tokens): SemanticScale {
  return escalaDoFundo(tokens.cores, canonicalize(tokens).background);
}
