import type { Pack } from "./tipos";

/**
 * As festas que vêm antes do casamento: noivado, chá de panela, chá bar,
 * despedida, ensaio.
 *
 * Existe para resolver um problema de jornada, não de vertical. O álbum só tinha
 * motivo de existir no dia da festa, e o casal decide isso no fim do planejamento
 * — quando o orçamento já foi alocado e a atenção acabou. Quem chega por último
 * compete só por preço, que é exatamente onde a categoria comoditizou.
 *
 * Estas comemorações acontecem ao longo dos 12–18 meses de preparação, com os
 * mesmos convidados, e são o mesmo produto. Uma conta já suporta N eventos, então
 * isto não é superfície nova: é o mesmo álbum, disponível a partir do mês 1.
 *
 * Sem `landing.*` de propósito — o pack é escolhido dentro do wizard, não tem
 * funil próprio, e exigir copy de marketing acoplaria o núcleo ao funil.
 */
export const PRE_CASAMENTO: Pack = {
  id: "pre-casamento",
  vocabulario: {
    "evento.nome": "comemoração",
    "evento.descricao": "Noivado, chá de panela, despedida — as festas antes da festa.",
    "anfitriao.plural": "os noivos",
    "convidado.saudacao": "Que bom que você veio",
    "missao.titulo": "Missões da comemoração",
    "missao.livre": "Ou fotografe o que quiser",
    "missao.chegada": "Quem chegou primeiro",
    "missao.mesa": "A mesa, do jeito que ela está agora",
    "missao.presente": "O presente sendo aberto",
    "missao.brinde": "O brinde, no instante do brinde",
    "missao.risada": "Alguém rindo alto demais",
    "missao.dupla": "Os dois juntos, sem posar",
    "galeria.minhas": "Minhas fotos",
    "musica.escolha": "Escolha dos noivos",
    "telao.vazio": "As primeiras fotos aparecem aqui",
    "lugar.pergunta": "Onde na comemoração?",
    "interacao.aberta": "Feed liberado — veja o que rolou",
    "interacao.fechada": "Interação abre em breve",
    "interacao.fechada.agendada": "Interação abre às {hora}",
    "recado.rotulo": "Um recado dos noivos",
    "recado.exemplo":
      "Obrigado por vir. Tirem foto de tudo — isso aqui também é parte da história.",
    "confessionario.titulo": "Confessionário",
    "confessionario.lede": "Escolha uma pergunta e grave um vídeo curto para o álbum.",
    "confessionario.conselho": "Que conselho você dá para os dois?",
    "confessionario.historia": "Conte como você conheceu os noivos.",
    "confessionario.aposta": "Como você imagina o casamento deles?",
    "lugar.mesa": "Mesa",
    "lugar.cozinha": "Cozinha",
    "lugar.quintal": "Quintal",
    "lugar.sala": "Sala",
    "lugar.bar": "Bar",
  },
  missoes: [
    { id: "chegada", chaveTitulo: "missao.chegada", ordem: 1 },
    { id: "dupla", chaveTitulo: "missao.dupla", ordem: 2 },
    { id: "presente", chaveTitulo: "missao.presente", ordem: 3 },
    { id: "brinde", chaveTitulo: "missao.brinde", ordem: 4 },
    { id: "mesa", chaveTitulo: "missao.mesa", ordem: 5 },
    { id: "risada", chaveTitulo: "missao.risada", ordem: 6 },
  ],
  confessionario: [
    { id: "conselho", chaveTitulo: "confessionario.conselho" },
    { id: "historia", chaveTitulo: "confessionario.historia" },
    { id: "aposta", chaveTitulo: "confessionario.aposta" },
  ],
  lugares: [
    { id: "mesa", chaveTitulo: "lugar.mesa" },
    { id: "cozinha", chaveTitulo: "lugar.cozinha" },
    { id: "quintal", chaveTitulo: "lugar.quintal" },
    { id: "sala", chaveTitulo: "lugar.sala" },
    { id: "bar", chaveTitulo: "lugar.bar" },
  ],
};

export const PRE_WEDDING = PRE_CASAMENTO;
