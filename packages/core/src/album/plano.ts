import { horaNoEvento, inicioDaHoraNoEvento } from "./tempo";
import { HORAS_DO_AMANHECER } from "./types";
import type { CapituloPlanejado, JanelaDoEvento } from "./types";

const HORA_MS = 3_600_000;
const PRIMEIRA_HORA_DO_AMANHECER = HORAS_DO_AMANHECER[0]!;

/** Só vale depois do começo — evento que já abre de manhã não ganha capítulo “depois” retroativo. */
export function primeiroAmanhecerNaJanela(janela: JanelaDoEvento): Date | null {
  let t = inicioDaHoraNoEvento(janela.comecaEm, janela.offsetMinutos);
  if (t.getTime() < janela.comecaEm.getTime()) t = new Date(t.getTime() + HORA_MS);

  const fim = janela.terminaEm.getTime();
  while (t.getTime() < fim) {
    if (
      horaNoEvento(t, janela.offsetMinutos) === PRIMEIRA_HORA_DO_AMANHECER &&
      t.getTime() > janela.comecaEm.getTime()
    ) {
      return t;
    }
    t = new Date(t.getTime() + HORA_MS);
  }
  return null;
}

export function planejarCapitulos(
  janela: JanelaDoEvento,
  ids: readonly string[],
): CapituloPlanejado[] {
  if (ids.length === 0) return [];

  const primeiro = ids[0];
  if (!primeiro) return [];

  const duracao = janela.terminaEm.getTime() - janela.comecaEm.getTime();
  if (duracao <= 0 || ids.length === 1) {
    return [{ id: primeiro, comecaEm: janela.comecaEm }];
  }

  const amanhecer = primeiroAmanhecerNaJanela(janela);
  if (amanhecer) {
    const prefixo = ids.slice(0, -1);
    const ultimo = ids[ids.length - 1]!;
    return [...fatiar(janela.comecaEm, amanhecer, prefixo), { id: ultimo, comecaEm: amanhecer }];
  }

  return fatiar(janela.comecaEm, janela.terminaEm, ids);
}

function fatiar(inicio: Date, fim: Date, ids: readonly string[]): CapituloPlanejado[] {
  if (ids.length === 0) return [];

  const span = fim.getTime() - inicio.getTime();
  if (span <= 0) {
    const id = ids[0];
    return id ? [{ id, comecaEm: inicio }] : [];
  }

  return ids.map((id, i) => ({
    id,
    comecaEm: new Date(inicio.getTime() + (span * i) / ids.length),
  }));
}
