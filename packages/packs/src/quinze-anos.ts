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

    "landing.rotulo": "O álbum que a festa inteira tira",
    "landing.titulo": "As fotos dos 15 anos,",
    "landing.titulo.destaque": "antes de a festa acabar.",
    "landing.lede":
      "A festa inteira fotografa e cada foto some no celular de quem tirou. Com um QR na mesa, cada uma cai no seu álbum no instante em que alguém tira.",
    "landing.cta": "Criar meu álbum",
    "landing.exemplo.nome": "MARIA CLARA",
    "landing.momentos.titulo": "Todo mundo vendo as fotos",
    "landing.momentos.destaque": "enquanto a festa acontece.",
    "landing.momentos.lede":
      "Um feed só da sua festa, com stories, reações e comentários. Cada convidado vê o que os outros viram e sai da festa com a própria galeria.",
    "landing.telao.titulo": "E se tiver telão, ele veste a sua festa.",
    "landing.telao.lede":
      "Mesma cor, mesma fonte e mesmo desenho da placa da mesa. Foto em pé aparece em pé, sem corte para caber.",
    "landing.missoes.titulo": "Missões que cabem",
    "landing.missoes.destaque": "no meio da pista.",
    "landing.missoes.lede":
      "Um convite curto por vez, para quem está no meio da festa com o celular numa mão. Quem prefere fotografar outra coisa, fotografa.",
    "landing.planos.titulo": "Comece de graça. Pague uma vez, se quiser tudo.",
    "landing.plano.completo": "Celebração",
    "landing.fechamento": "No dia seguinte, você acorda com centenas de fotos que",
    "landing.fechamento.destaque": "ninguém contratou para tirar.",

    "momento.antes": "Antes de descer",
    "momento.antes.desc": "O espelho, o vestido e as amigas em volta.",
    "momento.entrada": "A entrada",
    "momento.entrada.desc": "A música alta, a escada e o salão inteiro de pé.",
    "momento.valsa": "A valsa",
    "momento.valsa.desc": "Com o pai, com os padrinhos, com quem ela quiser.",
    "momento.jantar": "O jantar",
    "momento.jantar.desc": "Os discursos e a mesa inteira rindo.",
    "momento.pista": "A pista",
    "momento.pista.desc": "Quando ninguém mais olha para o relógio.",
    "momento.depois": "Depois",
    "momento.depois.desc": "O salão vazio e os sapatos na mão.",
  },
  momentos: [
    { id: "antes", chaveTitulo: "momento.antes", chaveDesc: "momento.antes.desc" },
    { id: "entrada", chaveTitulo: "momento.entrada", chaveDesc: "momento.entrada.desc" },
    { id: "valsa", chaveTitulo: "momento.valsa", chaveDesc: "momento.valsa.desc" },
    { id: "jantar", chaveTitulo: "momento.jantar", chaveDesc: "momento.jantar.desc" },
    { id: "pista", chaveTitulo: "momento.pista", chaveDesc: "momento.pista.desc" },
    { id: "depois", chaveTitulo: "momento.depois", chaveDesc: "momento.depois.desc" },
  ],
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
