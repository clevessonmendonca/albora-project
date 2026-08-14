import { WALL_DISPLAY_MODEL_PROFILES, type WallDisplayModel } from "@albora/core";

export const MODEL_NAMES: Readonly<Record<WallDisplayModel, string>> = {
  polaroide: "Polaroide",
  mural: "Mural",
  colagem: "Colagem",
  ambiente: "Ambiente",
  cheio: "Cheio",
  carrossel: "Carrossel",
  dump: "Dump",
  tbt: "TBT",
};

export function profileText(modelo: WallDisplayModel): string {
  const profile = WALL_DISPLAY_MODEL_PROFILES[modelo];
  const count = profile.fotos === 1 ? "1 foto" : `${profile.fotos} fotos`;
  return `${count} · ${profile.aceitaEmPe ? "em pé" : "só deitada"}`;
}
