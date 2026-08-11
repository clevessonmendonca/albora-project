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
    "missao.titulo": "Missões da noite",
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

    "landing.rotulo": "Festa de 15 anos",
    "landing.titulo": "Quem estava lá",
    "landing.titulo.destaque": "viu primeiro.",
    "landing.lede":
      "A festa inteira fotografa e cada um guarda no próprio celular. A Albora junta tudo num álbum só, na hora.",
    "landing.cta": "Criar meu álbum",
    "landing.momentos.titulo": "Uma casa para o",
    "landing.momentos.destaque": "espontâneo.",
    "landing.momentos.lede":
      "A web é a porta: a primeira foto entra sem login e sem download. Depois dela existe o aplicativo — feed, stories, reações, comentários e a galeria de cada convidado.",
    "landing.telao.titulo": "O telão veste a identidade da sua festa.",
    "landing.telao.lede":
      "A mesma cor, a mesma fonte e o mesmo raio da placa da mesa. Foto em pé aparece em pé: nada é cortado para caber.",
    "landing.missoes.titulo": "Não se chama desafio. Chama-se missão.",
    "landing.missoes.lede":
      "Convite curto, feito para quem está com o celular numa mão e não quer parar a festa.",
    "landing.planos.titulo": "Comece de graça. Pague uma vez, se quiser tudo.",
    "landing.plano.completo": "Celebração",
    "landing.fechamento":
      "No dia seguinte, você acorda com centenas de fotos que ninguém contratou para tirar.",
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
