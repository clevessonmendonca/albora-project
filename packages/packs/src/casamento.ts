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

    "landing.rotulo": "Curadoria de casamento",
    "landing.titulo": "Cada convidado",
    "landing.titulo.destaque": "é um fotógrafo.",
    "landing.lede":
      "São 200 câmeras na festa e 200 rolos diferentes. A Albora reúne, organiza e devolve o que só quem estava lá conseguiu ver.",
    "landing.cta": "Criar meu álbum",
    "landing.momentos.titulo": "Uma casa para o",
    "landing.momentos.destaque": "espontâneo.",
    "landing.momentos.lede":
      "A web é a porta: a primeira foto entra sem login e sem download. Depois dela existe o aplicativo — feed, stories, reações, comentários e a galeria de cada convidado.",
    "landing.telao.titulo": "O telão veste a identidade do seu casamento.",
    "landing.telao.lede":
      "A mesma cor, a mesma fonte e o mesmo raio da placa da mesa. Foto em pé aparece em pé: nada é cortado para caber.",
    "landing.missoes.titulo": "Não se chama desafio. Chama-se missão.",
    "landing.missoes.lede":
      "Convite curto, feito para quem tem uma taça na outra mão. Ninguém compete, e ninguém perde.",
    "landing.planos.titulo": "Comece de graça. Pague uma vez, se quiser tudo.",
    "landing.plano.completo": "Celebração",
    "landing.fechamento":
      "No dia seguinte, você acorda com centenas de fotos que ninguém contratou para tirar.",
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
