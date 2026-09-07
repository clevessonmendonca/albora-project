import type { Pack } from "./tipos";

/** Evento corporativo (confraternização, lançamento, congresso) — card de tipo do
 *  onboarding. Sem `landing.*`: escolhido dentro do wizard, não tem funil (ADR 0019). */
export const CORPORATIVO: Pack = {
  id: "corporativo",
  icone: "briefcase",
  ordemCriacao: 4,
  vocabulario: {
    "evento.nome": "evento corporativo",
    "evento.descricao": "Da abertura ao networking, com a marca em cada foto.",
    "evento.preparo": "um evento corporativo",
    "evento.posse": "do seu evento",
    "anfitriao.plural": "a organização",
    "convidado.saudacao": "Boas-vindas",
    "missao.titulo": "Missões do evento",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.abertura": "A abertura, com o palco cheio",
    "missao.equipe": "A sua equipe reunida",
    "missao.palco": "Quem está no palco, no melhor ângulo",
    "missao.networking": "Uma conversa boa no intervalo",
    "galeria.minhas": "Minhas fotos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde no evento?",
    "recado.rotulo": "Um recado da organização",
    "recado.exemplo":
      "Obrigado por participar. Registrem os melhores momentos — o álbum é de todos.",
    "confessionario.titulo": "Depoimentos",
    "confessionario.lede": "Escolha uma pergunta e grave um vídeo curto para o álbum.",
    "confessionario.aprendizado": "O que você leva deste evento?",
    "confessionario.destaque": "Qual foi o melhor momento até agora?",
    "lugar.palco": "Palco",
    "lugar.plateia": "Plateia",
    "lugar.estande": "Estande",
    "lugar.lounge": "Lounge",
    "reacao.estrela": "Estrela",
    "reacao.aplauso": "Aplauso",
    "reacao.ideia": "Ideia",
    "momento.abertura": "A abertura",
    "momento.abertura.desc": "O palco, a plateia cheia e a primeira fala.",
    "momento.programa": "O programa",
    "momento.programa.desc": "As palestras, os painéis e quem estava no palco.",
    "momento.networking": "O networking",
    "momento.networking.desc": "As conversas em pé, o café e os reencontros.",
  },
  reacoes: [
    { id: "estrela", chaveTitulo: "reacao.estrela" },
    { id: "aplauso", chaveTitulo: "reacao.aplauso" },
    { id: "ideia", chaveTitulo: "reacao.ideia" },
  ],
  momentos: [
    { id: "abertura", chaveTitulo: "momento.abertura", chaveDesc: "momento.abertura.desc" },
    { id: "programa", chaveTitulo: "momento.programa", chaveDesc: "momento.programa.desc" },
    { id: "networking", chaveTitulo: "momento.networking", chaveDesc: "momento.networking.desc" },
  ],
  missoes: [
    { id: "abertura", chaveTitulo: "missao.abertura", ordem: 1 },
    { id: "equipe", chaveTitulo: "missao.equipe", ordem: 2 },
    { id: "palco", chaveTitulo: "missao.palco", ordem: 3 },
    { id: "networking", chaveTitulo: "missao.networking", ordem: 4 },
  ],
  confessionario: [
    { id: "aprendizado", chaveTitulo: "confessionario.aprendizado" },
    { id: "destaque", chaveTitulo: "confessionario.destaque" },
  ],
  lugares: [
    { id: "palco", chaveTitulo: "lugar.palco" },
    { id: "plateia", chaveTitulo: "lugar.plateia" },
    { id: "estande", chaveTitulo: "lugar.estande" },
    { id: "lounge", chaveTitulo: "lugar.lounge" },
  ],
};

export const CORPORATE = CORPORATIVO;
