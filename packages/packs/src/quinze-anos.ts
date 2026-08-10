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
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
  },
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "valsa", chaveTitulo: "missao.valsa", ordem: 2 },
    { id: "pista", chaveTitulo: "missao.pista", ordem: 3 },
  ],
};
