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

    "landing.rotulo": "O álbum que a festa inteira tira",
    "landing.titulo": "As fotos do seu casamento,",
    "landing.titulo.destaque": "antes de a festa acabar.",
    "landing.lede":
      "São 200 câmeras na festa e 200 rolos que nunca chegam até você. Com um QR na mesa, cada foto cai no seu álbum no instante em que alguém tira.",
    "landing.cta": "Criar meu álbum",
    "landing.exemplo.nome": "ANA & JOÃO",
    "landing.momentos.titulo": "Todo mundo vendo as fotos",
    "landing.momentos.destaque": "enquanto a festa acontece.",
    "landing.momentos.lede":
      "Um feed só do seu casamento, com stories, reações e comentários. Cada convidado vê o que os outros viram e sai da festa com a própria galeria.",
    "landing.telao.titulo": "E se tiver telão, ele veste o seu casamento.",
    "landing.telao.lede":
      "Mesma cor, mesma fonte e mesmo desenho da placa da mesa. Foto em pé aparece em pé, sem corte para caber.",
    "landing.missoes.titulo": "Missões que cabem",
    "landing.missoes.destaque": "entre uma taça e outra.",
    "landing.missoes.lede":
      "Um convite curto por vez, para quem está no meio da festa com o celular numa mão. Quem prefere fotografar outra coisa, fotografa.",
    "landing.planos.titulo": "Comece de graça. Pague uma vez, se quiser tudo.",
    "landing.plano.completo": "Celebração",
    "landing.fechamento": "No dia seguinte, você acorda com centenas de fotos que",
    "landing.fechamento.destaque": "ninguém contratou para tirar.",
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
