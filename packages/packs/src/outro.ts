import type { Pack } from "./tipos";

/** Coringa — o tipo escolhido quando nenhum outro serve. Vocabulário neutro e um arco
 *  mínimo (início · principal · festa) que o anfitrião renomeia depois. Card de tipo do
 *  onboarding, sem `landing.*` (ADR 0019). */
export const OUTRO: Pack = {
  id: "outro",
  icone: "calendar",
  ordemCriacao: 6,
  vocabulario: {
    "evento.nome": "evento",
    "evento.descricao": "Do começo ao fim, do seu jeito.",
    "evento.preparo": "o seu evento",
    "evento.posse": "do seu evento",
    "anfitriao.plural": "os anfitriões",
    "convidado.saudacao": "Que bom te ver aqui",
    "missao.titulo": "Missões do evento",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.chegada": "A chegada de quem você não via há tempos",
    "missao.grupo": "As pessoas com quem você veio",
    "missao.principal": "O momento principal, quando ele acontece",
    "missao.detalhe": "Um detalhe que você achou bonito",
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde no evento?",
    "recado.rotulo": "Um recado dos anfitriões",
    "recado.exemplo":
      "Obrigado por vir. Fotografem o que quiserem — o álbum é de todo mundo.",
    "confessionario.titulo": "Confessionário",
    "confessionario.lede": "Escolha uma pergunta e grave um vídeo curto para o álbum.",
    "confessionario.momento": "Qual foi o melhor momento até agora?",
    "confessionario.mensagem": "Deixe uma mensagem para quem organizou.",
    "lugar.entrada": "Entrada",
    "lugar.salao": "Salão",
    "lugar.area": "Área externa",
    "lugar.bar": "Bar",
    "reacao.estrela": "Estrela",
    "reacao.riso": "Riso",
    "reacao.festa": "Festa",
    "momento.inicio": "O início",
    "momento.inicio.desc": "A chegada e os primeiros encontros.",
    "momento.principal": "O momento principal",
    "momento.principal.desc": "A razão de todo mundo estar aqui.",
    "momento.festa": "A festa",
    "momento.festa.desc": "Quando ninguém mais olha para o relógio.",
  },
  reacoes: [
    { id: "estrela", chaveTitulo: "reacao.estrela" },
    { id: "riso", chaveTitulo: "reacao.riso" },
    { id: "festa", chaveTitulo: "reacao.festa" },
  ],
  momentos: [
    { id: "inicio", chaveTitulo: "momento.inicio", chaveDesc: "momento.inicio.desc" },
    { id: "principal", chaveTitulo: "momento.principal", chaveDesc: "momento.principal.desc" },
    { id: "festa", chaveTitulo: "momento.festa", chaveDesc: "momento.festa.desc" },
  ],
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "grupo", chaveTitulo: "missao.grupo", ordem: 2 },
    { id: "principal", chaveTitulo: "missao.principal", ordem: 3 },
    { id: "detalhe", chaveTitulo: "missao.detalhe", ordem: 4 },
  ],
  confessionario: [
    { id: "momento", chaveTitulo: "confessionario.momento" },
    { id: "mensagem", chaveTitulo: "confessionario.mensagem" },
  ],
  lugares: [
    { id: "entrada", chaveTitulo: "lugar.entrada" },
    { id: "salao", chaveTitulo: "lugar.salao" },
    { id: "area", chaveTitulo: "lugar.area" },
    { id: "bar", chaveTitulo: "lugar.bar" },
  ],
};
