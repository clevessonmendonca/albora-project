import type { Pack } from "./tipos";

/**
 * O segundo pack existe desde a task 002 de propósito.
 *
 * Um pack só não prova nada: com um, é impossível saber se o núcleo é
 * genérico ou se o vocabulário de casamento está grudado nele. Dois packs
 * tornam o teste de sanidade executável — trocar o pack muda a UI inteira
 * sem tocar no núcleo.
 */
export const QUINZE_ANOS: Pack = {
  id: "quinze-anos",
  vocabulario: {
    "evento.nome": "aniversário de 15 anos",
    "anfitriao.plural": "a aniversariante",
    "convidado.saudacao": "Chegou a hora da festa",
    "missao.titulo": "Desafios da noite",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.chegada": "A entrada, com a música alta",
    "missao.valsa": "A valsa, de onde você estiver",
    "missao.pista": "A pista quando ela enche",
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde na festa?",
    "lugar.pista": "Pista",
    "lugar.mesa": "Mesa",
    "lugar.jardim": "Jardim",
    "lugar.bar": "Bar",
    "lugar.varanda": "Varanda",
  },
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "valsa", chaveTitulo: "missao.valsa", ordem: 2 },
    { id: "pista", chaveTitulo: "missao.pista", ordem: 3 },
  ],
  lugares: [
    { id: "pista", chaveTitulo: "lugar.pista" },
    { id: "mesa", chaveTitulo: "lugar.mesa" },
    { id: "jardim", chaveTitulo: "lugar.jardim" },
    { id: "bar", chaveTitulo: "lugar.bar" },
    { id: "varanda", chaveTitulo: "lugar.varanda" },
  ],
};
