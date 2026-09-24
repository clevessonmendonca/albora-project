import {
  decidirTese,
  denominadorDaParticipacao,
  type CodigoDaTese,
  type OrigemDoDenominador,
} from "@albora/core";

export type EntradaDeParticipacao = {
  expectedGuests: number;
  actualGuests: number | null;
  sessoesComUpload: number;
};

export type ResumoDeParticipacao = {
  taxa: number;
  codigo: CodigoDaTese;
  denominador: number;
  origem: OrigemDoDenominador;
};

/** A estimativa é preenchida meses antes da festa; a presença confirmada, depois dela. Ler participação contra o palpite move o veredito de faixa inteira. */
export function resumoDeParticipacao(entrada: EntradaDeParticipacao): ResumoDeParticipacao {
  const { valor, origem } = denominadorDaParticipacao({
    expectedGuests: entrada.expectedGuests,
    actualGuests: entrada.actualGuests,
  });

  const veredito = decidirTese({
    expectedGuests: valor,
    sessoesComUpload: entrada.sessoesComUpload,
  });

  return { taxa: veredito.taxa, codigo: veredito.codigo, denominador: valor, origem };
}
