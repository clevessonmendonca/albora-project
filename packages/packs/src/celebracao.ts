import type { Pack } from "./tipos";

/** Celebração — qualquer festa que não cai nos outros tipos, mas ainda tem um arco
 *  (chá, bodas, batizado, reencontro). Card de tipo do onboarding, sem `landing.*`
 *  (ADR 0019). Diferente de `outro`, que é o coringa sem momentos assumidos. */
export const CELEBRACAO: Pack = {
  id: "celebracao",
  icone: "sparkles",
  ordemCriacao: 5,
  vocabulario: {
    "evento.nome": "celebração",
    "evento.descricao": "Da recepção ao momento principal e à festa.",
    "evento.preparo": "uma celebração",
    "evento.posse": "da sua celebração",
    "anfitriao.plural": "os anfitriões",
    "convidado.saudacao": "Que bom te ver aqui",
    "missao.titulo": "Missões da festa",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.chegada": "A chegada de quem você não via há tempos",
    "missao.mesa": "A sua mesa, do jeito que ela está agora",
    "missao.principal": "O momento principal, quando ele acontece",
    "missao.danca": "Alguém dançando como se ninguém visse",
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde na festa?",
    "recado.rotulo": "Um recado dos anfitriões",
    "recado.exemplo":
      "Obrigado por estar com a gente. Fotografem tudo — o álbum é de todos nós.",
    "confessionario.titulo": "Confessionário",
    "confessionario.lede": "Escolha uma pergunta e grave um vídeo curto para o álbum.",
    "confessionario.desejo": "Que desejo você faz para os anfitriões?",
    "confessionario.historia": "Conte uma história boa desta celebração.",
    "lugar.pista": "Pista",
    "lugar.mesa": "Mesa",
    "lugar.jardim": "Jardim",
    "lugar.bar": "Bar",
    "reacao.estrela": "Estrela",
    "reacao.riso": "Riso",
    "reacao.festa": "Festa",
    "momento.recepcao": "A recepção",
    "momento.recepcao.desc": "Os abraços e as conversas antes de tudo começar.",
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
    { id: "recepcao", chaveTitulo: "momento.recepcao", chaveDesc: "momento.recepcao.desc" },
    { id: "principal", chaveTitulo: "momento.principal", chaveDesc: "momento.principal.desc" },
    { id: "festa", chaveTitulo: "momento.festa", chaveDesc: "momento.festa.desc" },
  ],
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "mesa", chaveTitulo: "missao.mesa", ordem: 2 },
    { id: "principal", chaveTitulo: "missao.principal", ordem: 3 },
    { id: "danca", chaveTitulo: "missao.danca", ordem: 4 },
  ],
  confessionario: [
    { id: "desejo", chaveTitulo: "confessionario.desejo" },
    { id: "historia", chaveTitulo: "confessionario.historia" },
  ],
  lugares: [
    { id: "pista", chaveTitulo: "lugar.pista" },
    { id: "mesa", chaveTitulo: "lugar.mesa" },
    { id: "jardim", chaveTitulo: "lugar.jardim" },
    { id: "bar", chaveTitulo: "lugar.bar" },
  ],
};

export const CELEBRATION = CELEBRACAO;
