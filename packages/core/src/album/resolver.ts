import {
  CAPITULO_CONFESSIONARIO,
  CAPITULO_SEM_HORA,
  capituloDe,
  ehAmanhecer,
  horaNoEvento,
  inicioDaHoraNoEvento,
  instanteDe,
} from "./tempo";
import type { MidiaDoAlbum, MidiaResolvida, PlanoDoAlbum } from "./types";

export function compararCronologicamente(a: MidiaResolvida, b: MidiaResolvida): number {
  const porTempo = a.em.getTime() - b.em.getTime();
  if (porTempo !== 0) return porTempo;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function temPromptKey(midia: MidiaDoAlbum): boolean {
  return typeof midia.promptKey === "string" && midia.promptKey.length > 0;
}

export function resolver(
  midias: readonly MidiaDoAlbum[],
  plano: PlanoDoAlbum,
): MidiaResolvida[] {
  const { janela, capitulos } = plano;

  return midias
    .map((midia) => {
      const { em, confiavel } = instanteDe(midia, janela);
      const confessionario = temPromptKey(midia);
      return {
        ...midia,
        em,
        horaConfiavel: confiavel,
        capituloId: confessionario
          ? CAPITULO_CONFESSIONARIO
          : confiavel
            ? capituloDe(em, capitulos)
            : CAPITULO_SEM_HORA,
        inicioDaHora: confiavel ? inicioDaHoraNoEvento(em, janela.offsetMinutos) : null,
        hora: confiavel ? horaNoEvento(em, janela.offsetMinutos) : null,
        amanhecer: confiavel && ehAmanhecer(em, janela.offsetMinutos),
      };
    })
    .sort(compararCronologicamente);
}
