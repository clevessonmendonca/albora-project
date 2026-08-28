import {
  WALL_DISPLAY_MODELS,
  wallDisplayChoiceProblems,
  type WallDisplayModel,
} from "@albora/core";

const KNOWN = new Set<string>(WALL_DISPLAY_MODELS);

export const DEFAULT_WALL_MODELS: readonly WallDisplayModel[] = [
  "polaroide",
  "mural",
  "colagem",
  "dump",
];

export function parseWallModels(raw: unknown): WallDisplayModel[] | null {
  if (!Array.isArray(raw) || !raw.every((m) => typeof m === "string")) return null;

  const seen = new Set<string>();
  const models: WallDisplayModel[] = [];
  for (const model of raw) {
    if (!KNOWN.has(model) || seen.has(model)) return null;
    seen.add(model);
    models.push(model as WallDisplayModel);
  }
  return models;
}

export function wallModelsFromTokens(tokens: Record<string, unknown>): WallDisplayModel[] {
  const parsed = parseWallModels(tokens.telaoModelos);
  if (parsed && parsed.length > 0) return parsed;
  return [...DEFAULT_WALL_MODELS];
}

export function wallModelsChoiceError(raw: unknown): string[] | null {
  const parsed = parseWallModels(raw);
  if (!parsed) return ["modelos da parede inválidos"];
  const problems = wallDisplayChoiceProblems(parsed);
  return problems.length > 0 ? problems : null;
}
