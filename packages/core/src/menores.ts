import { DENUNCIAS_PARA_SEGURAR } from "./moderacao";

/** ADR 0012: controle de evento, não de pessoa — nenhuma idade é guardada, o anfitrião sobe o piso. */
export type PoliticaDeMenores = {
  haMenores: boolean;
};

/** Com menores, uma denúncia já segura: publicar por engano não tem desfazer; segurar por engano tem. */
export function denunciasParaSegurar(politica: PoliticaDeMenores): number {
  return politica.haMenores ? 1 : DENUNCIAS_PARA_SEGURAR;
}

export function compartilhamentoExternoPadrao(politica: PoliticaDeMenores): boolean {
  return !politica.haMenores;
}

export function gateComecaFechado(politica: PoliticaDeMenores): boolean {
  return politica.haMenores;
}

export type PadroesDoEvento = {
  denunciasParaSegurar: number;
  compartilhamentoExterno: boolean;
  gateComecaFechado: boolean;
};

export function eventDefaults(politica: PoliticaDeMenores): PadroesDoEvento {
  return {
    denunciasParaSegurar: denunciasParaSegurar(politica),
    compartilhamentoExterno: compartilhamentoExternoPadrao(politica),
    gateComecaFechado: gateComecaFechado(politica),
  };
}
