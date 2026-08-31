import type { MidiaNaParede } from "@albora/db";

/** Foto na vitrine pública — sem `autor`, sem `chaveFull`/`mime`/`reacoes`; página indexável não pode ter PII de convidado. */
export type FotoDaVitrinePublica = {
  id: string;
  chaveThumb: string;
  largura?: number;
  altura?: number;
};

/** Remove tudo exceto a chave da thumb — entrada já moderada por `listarMidiaDaParede`; nunca passa `autor` para superfície sem sessão. */
export function paraVitrinePublica(midia: readonly MidiaNaParede[]): FotoDaVitrinePublica[] {
  return midia.map((m) => ({
    id: m.id,
    chaveThumb: m.chaveThumb,
    ...(m.largura !== undefined && m.altura !== undefined
      ? { largura: m.largura, altura: m.altura }
      : {}),
  }));
}
