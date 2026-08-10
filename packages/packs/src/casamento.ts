import type { Pack } from "./tipos";

/**
 * Casamento é um pack, não o núcleo.
 *
 * Este é o único lugar do repositório onde "noivos" pode aparecer. Se essa
 * palavra vazar para `core`, `ui-*` ou schema, o guard de packs reprova.
 */
export const CASAMENTO: Pack = {
  id: "casamento",
  vocabulario: {
    "evento.nome": "casamento",
    "anfitriao.plural": "os noivos",
    "convidado.saudacao": "Que bom te ver aqui",
    "missao.titulo": "Missões da festa",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.chegada": "A chegada de quem você não via há tempos",
    "missao.mesa": "A sua mesa, do jeito que ela está agora",
    "missao.danca": "Alguém dançando como se ninguém visse",
    "missao.brinde": "O brinde, no instante do brinde",
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde na festa?",
    "lugar.pista": "Pista",
    "lugar.mesa": "Mesa",
    "lugar.jardim": "Jardim",
    "lugar.altar": "Altar",
    "lugar.bar": "Bar",
    "lugar.varanda": "Varanda",
  },
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "mesa", chaveTitulo: "missao.mesa", ordem: 2 },
    { id: "danca", chaveTitulo: "missao.danca", ordem: 3 },
    { id: "brinde", chaveTitulo: "missao.brinde", ordem: 4 },
  ],
  lugares: [
    { id: "pista", chaveTitulo: "lugar.pista" },
    { id: "mesa", chaveTitulo: "lugar.mesa" },
    { id: "jardim", chaveTitulo: "lugar.jardim" },
    { id: "altar", chaveTitulo: "lugar.altar" },
    { id: "bar", chaveTitulo: "lugar.bar" },
    { id: "varanda", chaveTitulo: "lugar.varanda" },
  ],
  tokens: {
    fontes: { titulo: "Fraunces, Georgia, serif" },
  },
};
