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
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
  },
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "mesa", chaveTitulo: "missao.mesa", ordem: 2 },
    { id: "dança", chaveTitulo: "missao.danca", ordem: 3 },
    { id: "brinde", chaveTitulo: "missao.brinde", ordem: 4 },
  ],
  tokens: {
    fontes: { titulo: "Fraunces, Georgia, serif" },
  },
};
