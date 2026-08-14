import { DENUNCIAS_PARA_SEGURAR } from "./moderacao";

/**
 * O interruptor de menores, do [ADR 0012](../../../docs/adr/0012-menores-sem-perguntar-idade.md).
 *
 * É controle **de evento, não de pessoa**. Ninguém é marcado e nenhuma idade é
 * guardada — quem decide é o anfitrião, que conhece os convidados e tem a
 * informação que nós nunca vamos ter.
 *
 * O ADR recusa perguntar idade: autodeclaração não tem valor probatório, fica
 * no caminho da primeira foto e cria dado sensível novo. O que sobra é subir o
 * piso, e é isto que este módulo faz.
 */

export type PoliticaDeMenores = {
  haMenores: boolean;
};

/**
 * Com menores na festa, **uma** denúncia já segura, em vez de duas.
 *
 * A assimetria de custo inverte: segurar por engano custa um toque do
 * anfitrião para liberar, e publicar por engano não tem desfazer. O padrão de
 * duas existe para a parede não ser entregue a qualquer desafeto; com menor na
 * sala, esse risco é o menor dos dois.
 */
export function denunciasParaSegurar(politica: PoliticaDeMenores): number {
  return politica.haMenores ? 1 : DENUNCIAS_PARA_SEGURAR;
}

/**
 * Compartilhar para fora nasce desligado.
 *
 * Desligado por **padrão**, não proibido: o anfitrião liga se quiser. A
 * diferença importa — proibir trataria a festa de 15 anos como menos produto
 * que a de casamento, e é justamente ela que mais tem menor.
 */
export function compartilhamentoExternoPadrao(politica: PoliticaDeMenores): boolean {
  return !politica.haMenores;
}

/**
 * O gate de interação começa fechado.
 *
 * Feed, reação e comentário abrem quando o anfitrião mandar. Com menores, o
 * padrão deixa de ser "abre junto com a festa".
 */
export function gateComecaFechado(politica: PoliticaDeMenores): boolean {
  return politica.haMenores;
}

export type PadroesDoEvento = {
  denunciasParaSegurar: number;
  compartilhamentoExterno: boolean;
  gateComecaFechado: boolean;
};

/**
 * Os três padrões de uma vez, para o admin escrever a configuração inicial do
 * evento sem consultar três funções e esquecer a terceira.
 */
export function eventDefaults(politica: PoliticaDeMenores): PadroesDoEvento {
  return {
    denunciasParaSegurar: denunciasParaSegurar(politica),
    compartilhamentoExterno: compartilhamentoExternoPadrao(politica),
    gateComecaFechado: gateComecaFechado(politica),
  };
}
