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

/** Um resolvedor para todos os renderizadores (ADR 0003) — cadeia marca → vendor → pack → evento; dois resolvedores fazem a placa impressa deixar de combinar com o telão. */
export function resolveTokens(input: ResolutionInput): Tokens {
  const layers = [input.vendor, input.pack, input.evento].filter(
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

/** Escala resolvida para o chão — trocar o chão re-deriva o acento (âmbar seguro sobre noite reprova sobre papel); validação é do sistema, nunca escolha do casal. */
export function resolveScale(tokens: Tokens): SemanticScale {
  return escalaDoFundo(tokens.cores, canonicalize(tokens).background);
}
