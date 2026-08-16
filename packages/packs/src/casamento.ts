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
    "musica.escolha": "Escolha dos noivos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde na festa?",
    "recado.rotulo": "Um recado dos noivos",
    "recado.exemplo":
      "Obrigado por estar com a gente hoje. Tirem fotos — as suas também são as nossas.",
    "confessionario.titulo": "Confessionário",
    "confessionario.lede": "Escolha uma pergunta e grave um vídeo curto para o álbum.",
    "confessionario.conselho": "Que conselho você dá para a vida a dois?",
    "confessionario.historia": "Conte uma história boa com os noivos.",
    "confessionario.desejo": "O que você deseja para eles daqui a dez anos?",
    "confessionario.segredo": "Um segredo engraçado que só a mesa sabe.",
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
      "Cada convidado carrega uma câmera no bolso, e no fim da noite cada rolo some sem chegar até você. Com um QR na mesa, toda foto cai no seu álbum no instante em que alguém tira.",
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

    "reacao.estrela": "Estrela",
    "reacao.riso": "Riso",
    "reacao.choro": "Choro",
    "reacao.festa": "Festa",
    "momento.antes": "Antes de tudo",
    "momento.antes.desc": "O nervoso, o cabelo, o quarto cheio de gente.",
    "momento.cerimonia": "A cerimônia",
    "momento.cerimonia.desc": "O sim, os olhares e quem chorou primeiro.",
    "momento.recepcao": "A recepção",
    "momento.recepcao.desc": "Os abraços de quem você não via há anos.",
    "momento.coquetel": "O coquetel",
    "momento.coquetel.desc": "Conversa em pé, taça na mão, foto sem aviso.",
    "momento.jantar": "O jantar",
    "momento.jantar.desc": "Os discursos, os brindes e a mesa inteira rindo.",
    "momento.pista": "A pista",
    "momento.pista.desc": "Quando ninguém mais olha para o relógio.",
    "momento.depois": "Depois",
    "momento.depois.desc": "O salão vazio e os sapatos na mão.",
  },
  reacoes: [
    { id: "estrela", chaveTitulo: "reacao.estrela" },
    { id: "riso", chaveTitulo: "reacao.riso" },
    { id: "choro", chaveTitulo: "reacao.choro" },
    { id: "festa", chaveTitulo: "reacao.festa" },
  ],
  momentos: [
    { id: "antes", chaveTitulo: "momento.antes", chaveDesc: "momento.antes.desc" },
    { id: "cerimonia", chaveTitulo: "momento.cerimonia", chaveDesc: "momento.cerimonia.desc" },
    { id: "recepcao", chaveTitulo: "momento.recepcao", chaveDesc: "momento.recepcao.desc" },
    { id: "coquetel", chaveTitulo: "momento.coquetel", chaveDesc: "momento.coquetel.desc" },
    { id: "jantar", chaveTitulo: "momento.jantar", chaveDesc: "momento.jantar.desc" },
    { id: "pista", chaveTitulo: "momento.pista", chaveDesc: "momento.pista.desc" },
    { id: "depois", chaveTitulo: "momento.depois", chaveDesc: "momento.depois.desc" },
  ],
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "mesa", chaveTitulo: "missao.mesa", ordem: 2 },
    { id: "danca", chaveTitulo: "missao.danca", ordem: 3 },
    { id: "brinde", chaveTitulo: "missao.brinde", ordem: 4 },
  ],
  confessionario: [
    { id: "conselho", chaveTitulo: "confessionario.conselho" },
    { id: "historia", chaveTitulo: "confessionario.historia" },
    { id: "desejo", chaveTitulo: "confessionario.desejo" },
    { id: "segredo", chaveTitulo: "confessionario.segredo" },
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

export const WEDDING = CASAMENTO;
