import { momentosDoEvento, type MomentoDoEvento } from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";

export function momentosDoPackEvento(
  pack: Pack | undefined,
  tokens: Record<string, unknown> | null | undefined,
): MomentoDoEvento[] {
  const padrao = (pack?.momentos ?? []).map((m) => ({
    id: m.id,
    titulo: resolvePackText(pack as Pack, m.chaveTitulo),
  }));
  return momentosDoEvento(padrao, tokens);
}
