import type { MidiaNaParede } from "@albora/db";

/**
 * Uma foto na vitrine pública — nunca quem enviou.
 *
 * A página pública é indexável e sem sessão: qualquer campo de identidade
 * (nome, id de sessão) que sobreviver ao mapeamento vira PII exposta ao
 * mundo, não só ao salão. `chaveFull`, `mime` e `reacoes` também ficam de
 * fora — a vitrine mostra só o suficiente para o gostinho, nunca a mídia
 * original nem contagens que não pedimos.
 */
export type FotoDaVitrinePublica = {
  id: string;
  chaveThumb: string;
  largura?: number;
  altura?: number;
};

/**
 * Remove tudo que não é a chave da thumb antes de qualquer assinatura de URL.
 *
 * A entrada já passou pela leitura mais estrita do pacote — `listarMidiaDaParede`
 * aplica denúncias, veredito do classificador e pânico por chamada, a mesma
 * régua do telão (`wall-media.ts`). Esta função só decide o que atravessa
 * para uma superfície sem sessão: nunca `autor`.
 */
export function paraVitrinePublica(midia: readonly MidiaNaParede[]): FotoDaVitrinePublica[] {
  return midia.map((m) => ({
    id: m.id,
    chaveThumb: m.chaveThumb,
    ...(m.largura !== undefined && m.altura !== undefined
      ? { largura: m.largura, altura: m.altura }
      : {}),
  }));
}
