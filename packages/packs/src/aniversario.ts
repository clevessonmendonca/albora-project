import type { Pack } from "./tipos";

/** Aniversário genérico (qualquer idade) — os 15 anos têm pack próprio (`quinze-anos`),
 *  com landing dedicada; este é o card de tipo do onboarding. Sem `landing.*`: pack
 *  escolhido dentro do wizard não tem funil de marketing (ADR 0019). */
export const ANIVERSARIO: Pack = {
  id: "aniversario",
  icone: "cake",
  ordemCriacao: 2,
  vocabulario: {
    "evento.nome": "aniversário",
    "evento.descricao": "Da chegada dos convidados ao bolo e à pista.",
    "evento.preparo": "um aniversário",
    "evento.posse": "do seu aniversário",
    "anfitriao.plural": "quem faz aniversário",
    "convidado.saudacao": "Que bom te ver aqui",
    "missao.titulo": "Missões da festa",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.chegada": "A chegada de quem você não via há tempos",
    "missao.mesa": "A sua mesa, do jeito que ela está agora",
    "missao.bolo": "O bolo, no instante dos parabéns",
    "missao.danca": "Alguém dançando como se ninguém visse",
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde na festa?",
    "recado.rotulo": "Um recado de quem faz aniversário",
    "recado.exemplo":
      "Obrigado por vir comemorar comigo. Fotografem tudo — a festa é nossa.",
    "confessionario.titulo": "Confessionário",
    "confessionario.lede": "Escolha uma pergunta e grave um vídeo curto para o álbum.",
    "confessionario.desejo": "Que desejo você faz para o próximo ano?",
    "confessionario.historia": "Conte uma história boa que envolva quem faz aniversário.",
    "lugar.pista": "Pista",
    "lugar.mesa": "Mesa",
    "lugar.bar": "Bar",
    "lugar.jardim": "Jardim",
    "reacao.estrela": "Estrela",
    "reacao.riso": "Riso",
    "reacao.festa": "Festa",
    "momento.recepcao": "A recepção",
    "momento.recepcao.desc": "Os abraços e as conversas antes de tudo começar.",
    "momento.parabens": "Os parabéns",
    "momento.parabens.desc": "O bolo, as velas e o salão inteiro cantando.",
    "momento.festa": "A festa",
    "momento.festa.desc": "Quando ninguém mais olha para o relógio.",
  },
  reacoes: [
    { id: "estrela", chaveTitulo: "reacao.estrela" },
    { id: "riso", chaveTitulo: "reacao.riso" },
    { id: "festa", chaveTitulo: "reacao.festa" },
  ],
  momentos: [
    { id: "recepcao", chaveTitulo: "momento.recepcao", chaveDesc: "momento.recepcao.desc" },
    { id: "parabens", chaveTitulo: "momento.parabens", chaveDesc: "momento.parabens.desc" },
    { id: "festa", chaveTitulo: "momento.festa", chaveDesc: "momento.festa.desc" },
  ],
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "mesa", chaveTitulo: "missao.mesa", ordem: 2 },
    { id: "bolo", chaveTitulo: "missao.bolo", ordem: 3 },
    { id: "danca", chaveTitulo: "missao.danca", ordem: 4 },
  ],
  confessionario: [
    { id: "desejo", chaveTitulo: "confessionario.desejo" },
    { id: "historia", chaveTitulo: "confessionario.historia" },
  ],
  lugares: [
    { id: "pista", chaveTitulo: "lugar.pista" },
    { id: "mesa", chaveTitulo: "lugar.mesa" },
    { id: "bar", chaveTitulo: "lugar.bar" },
    { id: "jardim", chaveTitulo: "lugar.jardim" },
  ],
};

export const BIRTHDAY = ANIVERSARIO;
