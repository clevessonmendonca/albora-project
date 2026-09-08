import type { Pack } from "./tipos";

/** Formatura — card de tipo do onboarding. Sem `landing.*`: escolhido dentro do
 *  wizard, não tem funil de marketing (ADR 0019). */
export const FORMATURA: Pack = {
  id: "formatura",
  icone: "graduation-cap",
  ordemCriacao: 3,
  vocabulario: {
    "evento.nome": "formatura",
    "evento.descricao": "Da colação de grau à festa que vem depois.",
    "evento.preparo": "uma formatura",
    "evento.posse": "da sua formatura",
    "anfitriao.plural": "a turma",
    "convidado.saudacao": "Que bom te ver aqui",
    "missao.titulo": "Missões da festa",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.colacao": "O instante do grau, com o canudo na mão",
    "missao.turma": "A turma inteira junta, custe o que custar",
    "missao.mesa": "A sua mesa, do jeito que ela está agora",
    "missao.danca": "Alguém dançando como se ninguém visse",
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde na festa?",
    "recado.rotulo": "Um recado da turma",
    "recado.exemplo":
      "Chegamos. Fotografem tudo — é a última vez que a turma inteira está no mesmo salão.",
    "confessionario.titulo": "Confessionário",
    "confessionario.lede": "Escolha uma pergunta e grave um vídeo curto para o álbum.",
    "confessionario.memoria": "Qual foi o melhor momento desses anos?",
    "confessionario.futuro": "Para onde você vai depois daqui?",
    "lugar.palco": "Palco",
    "lugar.mesa": "Mesa",
    "lugar.pista": "Pista",
    "lugar.bar": "Bar",
    "reacao.estrela": "Estrela",
    "reacao.riso": "Riso",
    "reacao.festa": "Festa",
    "momento.colacao": "A colação",
    "momento.colacao.desc": "O grau, o canudo e a turma de beca.",
    "momento.recepcao": "A recepção",
    "momento.recepcao.desc": "Os abraços de quem chegou para comemorar.",
    "momento.festa": "A festa",
    "momento.festa.desc": "Quando ninguém mais olha para o relógio.",
  },
  reacoes: [
    { id: "estrela", chaveTitulo: "reacao.estrela" },
    { id: "riso", chaveTitulo: "reacao.riso" },
    { id: "festa", chaveTitulo: "reacao.festa" },
  ],
  momentos: [
    { id: "colacao", chaveTitulo: "momento.colacao", chaveDesc: "momento.colacao.desc" },
    { id: "recepcao", chaveTitulo: "momento.recepcao", chaveDesc: "momento.recepcao.desc" },
    { id: "festa", chaveTitulo: "momento.festa", chaveDesc: "momento.festa.desc" },
  ],
  missoes: [
    { id: "colacao", chaveTitulo: "missao.colacao", ordem: 1 },
    { id: "turma", chaveTitulo: "missao.turma", ordem: 2 },
    { id: "mesa", chaveTitulo: "missao.mesa", ordem: 3 },
    { id: "danca", chaveTitulo: "missao.danca", ordem: 4 },
  ],
  confessionario: [
    { id: "memoria", chaveTitulo: "confessionario.memoria" },
    { id: "futuro", chaveTitulo: "confessionario.futuro" },
  ],
  lugares: [
    { id: "palco", chaveTitulo: "lugar.palco" },
    { id: "mesa", chaveTitulo: "lugar.mesa" },
    { id: "pista", chaveTitulo: "lugar.pista" },
    { id: "bar", chaveTitulo: "lugar.bar" },
  ],
};

export const GRADUATION = FORMATURA;
