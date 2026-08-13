import { PERFIS, type ModeloDeTelao } from "@albora/core";

export const NOMES_DOS_MODELOS: Readonly<Record<ModeloDeTelao, string>> = {
  polaroide: "Polaroide",
  mural: "Mural",
  colagem: "Colagem",
  ambiente: "Ambiente",
  cheio: "Cheio",
  carrossel: "Carrossel",
  dump: "Dump",
  tbt: "TBT",
};

export function perfilEmPalavras(modelo: ModeloDeTelao): string {
  const perfil = PERFIS[modelo];
  const quantas = perfil.fotos === 1 ? "1 foto" : `${perfil.fotos} fotos`;
  return `${quantas} · ${perfil.aceitaEmPe ? "em pé" : "só deitada"}`;
}
