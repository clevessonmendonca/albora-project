import { PERFIS, type ModeloDeTelao } from "@albora/core";

export const MODEL_NAMES: Readonly<Record<ModeloDeTelao, string>> = {
  polaroide: "Polaroide",
  mural: "Mural",
  colagem: "Colagem",
  ambiente: "Ambiente",
  cheio: "Cheio",
  carrossel: "Carrossel",
  dump: "Dump",
  tbt: "TBT",
};

export function profileText(modelo: ModeloDeTelao): string {
  const profile = PERFIS[modelo];
  const count = profile.fotos === 1 ? "1 foto" : `${profile.fotos} fotos`;
  return `${count} · ${profile.aceitaEmPe ? "em pé" : "só deitada"}`;
}
