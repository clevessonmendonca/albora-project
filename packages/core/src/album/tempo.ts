import {
  CAPITULO_CONFESSIONARIO,
  CAPITULO_SEM_HORA,
  CAPITULO_UNICO,
  FOLGA_DA_JANELA_MS,
  HORAS_DO_AMANHECER,
} from "./types";
import type { CapituloPlanejado, JanelaDoEvento, MidiaDoAlbum } from "./types";

function ehInstanteValido(em: Date | null): em is Date {
  return em !== null && !Number.isNaN(em.getTime());
}

function dentroDaJanela(em: Date, janela: JanelaDoEvento): boolean {
  return (
    em.getTime() >= janela.comecaEm.getTime() - FOLGA_DA_JANELA_MS &&
    em.getTime() <= janela.terminaEm.getTime() + FOLGA_DA_JANELA_MS
  );
}

export function instanteDe(midia: MidiaDoAlbum, janela: JanelaDoEvento) {
  const capturada = ehInstanteValido(midia.capturadaEm) ? midia.capturadaEm : null;
  if (capturada && dentroDaJanela(capturada, janela)) return { em: capturada, confiavel: true };

  const recebida = ehInstanteValido(midia.recebidaEm) ? midia.recebidaEm : null;
  if (recebida && dentroDaJanela(recebida, janela)) return { em: recebida, confiavel: true };

  return { em: recebida ?? capturada ?? janela.comecaEm, confiavel: false };
}

export function horaNoEvento(em: Date, offsetMinutos: number): number {
  const local = new Date(em.getTime() + offsetMinutos * 60_000);
  return local.getUTCHours();
}

export function inicioDaHoraNoEvento(em: Date, offsetMinutos: number): Date {
  const deslocado = em.getTime() + offsetMinutos * 60_000;
  const truncado = Math.floor(deslocado / 3_600_000) * 3_600_000;
  return new Date(truncado - offsetMinutos * 60_000);
}

export function ehAmanhecer(em: Date, offsetMinutos: number): boolean {
  return HORAS_DO_AMANHECER.includes(horaNoEvento(em, offsetMinutos));
}

/**
 * A parede do EXIF (componentes UTC = o que a câmera gravou, sem fuso) vira
 * instante absoluto no offset do evento. Sem isto, 21h em Brasília viraria
 * 21h UTC e a faixa da noite cairia três horas cedo.
 */
export function instanteDaParede(parede: Date, offsetMinutos: number): Date {
  return new Date(parede.getTime() - offsetMinutos * 60_000);
}

export function capituloDe(em: Date, capitulos: readonly CapituloPlanejado[]): string {
  const ordenados = [...capitulos].sort((a, b) => a.comecaEm.getTime() - b.comecaEm.getTime());
  const primeiro = ordenados[0];
  if (!primeiro) return CAPITULO_UNICO;

  let atual = primeiro.id;
  for (const capitulo of ordenados) {
    if (capitulo.comecaEm.getTime() <= em.getTime()) atual = capitulo.id;
  }
  return atual;
}

export { CAPITULO_CONFESSIONARIO, CAPITULO_SEM_HORA, CAPITULO_UNICO };
