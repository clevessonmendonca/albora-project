import {
  decidirExibicao,
  type CodigoDeModeracao,
  type EstadoDaMidia,
  type EstadoDoEvento,
} from "./moderacao";
import { ehVertical } from "./telao";

/**
 * Compartilhar com moldura (spec 015) — e a pendência de consentimento que ela
 * carrega desde o [ADR 0009].
 *
 * Compartilhar é a única ação do produto que **tira a mídia do perímetro do
 * evento**. Assim que o arquivo entra na folha nativa não há mais RLS, não há
 * remoção, não há retenção por job: nenhum controle nosso o alcança de novo.
 * Por isso este módulo falha fechado em tudo — sem prova de autoria, sem
 * consentimento específico e vigente, sem liberação do anfitrião e sem o aval
 * da moderação, não sai nada.
 *
 * **A pendência, e como ela é resolvida aqui.** O ADR 0009 registrou que a
 * saída do perímetro precisa de consentimento de quem **aparece** na foto, e
 * não só de quem a enviou. Identificar quem aparece exigiria agrupamento
 * facial, que é dado biométrico e está fora do que o produto pode fazer sem
 * base legal própria (`security.md` §5.1) — a saída não é identificar mais, é
 * **minimizar**:
 *
 * 1. Só o autor compartilha, e só a própria mídia. Ninguém tira do perímetro
 *    uma imagem que outra pessoa capturou.
 * 2. O consentimento de saída é um **segundo ato**, versionado e datado,
 *    separado do consentimento da entrada. O checkbox da porta autoriza subir,
 *    aparecer na galeria e aparecer na parede — nunca sair do evento.
 * 3. A composição não carrega nome, texto nem contagem de mais ninguém.
 * 4. Quem aparece e não quer continuar aparecendo usa o caminho que já existe:
 *    remoção e denúncia fecham a torneira na hora, porque a autorização
 *    delega à moderação a cada chamada.
 *
 * O que isso **não** resolve: o que já saiu não volta. É consequência da
 * própria natureza do compartilhamento, não uma lacuna de implementação.
 */

/* ── quem, o quê e sob qual consentimento ───────────────────────────── */

export type CodigoDeCompartilhamento =
  | "compartilhar.autorizado"
  | "compartilhar.evento_diferente"
  | "compartilhar.nao_e_autor"
  | "compartilhar.desligado_pelo_anfitriao"
  | "compartilhar.sem_consentimento_externo"
  | "compartilhar.consentimento_desatualizado"
  | "compartilhar.consentimento_sem_data"
  | "compartilhar.consentimento_revogado"
  | "compartilhar.bloqueado_pela_moderacao"
  | "compartilhar.modelo_corta_a_foto"
  | "compartilhar.colagem_vazia"
  | "compartilhar.colagem_grande_demais";

/**
 * A versão vigente do consentimento de saída do perímetro.
 *
 * Trocou o texto, trocou a versão: um consentimento dado sobre outros termos
 * não é consentimento para o uso novo, e a autorização recusa até o convidado
 * aceitar de novo.
 */
export const VERSAO_DO_CONSENTIMENTO_EXTERNO = "externo-v1";

export type ConsentimentoExterno = {
  versao: string;
  em: Date;
  revogadoEm: Date | null;
  /**
   * O autor autorizou o **próprio** nome na moldura. Sem isto a composição sai
   * sem crédito — atribuição é dado pessoal, e ela sai do perímetro junto.
   */
  nomeNaMoldura: boolean;
};

export type SessaoQueCompartilha = {
  sessaoId: string;
  eventoId: string;
  nome: string;
  /**
   * O consentimento da entrada. Cobre subir, galeria e telão, e nada além.
   * Está declarado aqui para deixar visível que **não** é ele que autoriza a
   * saída do perímetro — nenhuma função deste módulo o lê.
   */
  consentimentoDeEntrada: { versao: string; em: Date };
  /** `null` = o segundo consentimento nunca foi dado. */
  consentimentoExterno: ConsentimentoExterno | null;
};

export type MidiaParaCompartilhar = {
  id: string;
  eventoId: string;
  /** Id opaco da sessão que enviou. Serve para comparar, nunca para exibir. */
  sessaoDeOrigem: string;
  largura: number;
  altura: number;
  /** Texto do próprio autor. Comentário de terceiro nunca entra aqui. */
  legenda: string | null;
  estado: EstadoDaMidia;
};

/**
 * O evento da moderação mais a chave que o anfitrião controla.
 *
 * Sem `true` explícito nada sai: o casal decide se a festa vira post, e o
 * padrão de um booleano ausente no payload é `false`.
 */
export type EventoQueCompartilha = EstadoDoEvento & {
  compartilhamentoExternoLiberado: boolean;
};

export type Autorizacao = {
  pode: boolean;
  codigo: CodigoDeCompartilhamento;
  /** Preenchido só quando quem barrou foi a moderação. */
  motivoDaModeracao: CodigoDeModeracao | null;
};

function negar(
  codigo: CodigoDeCompartilhamento,
  motivoDaModeracao: CodigoDeModeracao | null = null,
): Autorizacao {
  return { pode: false, codigo, motivoDaModeracao };
}

/**
 * O que falta no consentimento de saída, ou `null` quando não falta nada.
 *
 * Data no futuro e data inválida contam como ausência de data: um registro que
 * não diz quando foi aceito não prova consentimento, e a alternativa seria
 * confiar num campo corrompido.
 */
export function pendenciaDeConsentimento(
  sessao: SessaoQueCompartilha,
  agora: Date,
): CodigoDeCompartilhamento | null {
  const consentimento = sessao.consentimentoExterno;
  if (consentimento === null) return "compartilhar.sem_consentimento_externo";

  if (consentimento.versao !== VERSAO_DO_CONSENTIMENTO_EXTERNO) {
    return "compartilhar.consentimento_desatualizado";
  }

  const em = consentimento.em.getTime();
  if (!Number.isFinite(em) || em > agora.getTime()) {
    return "compartilhar.consentimento_sem_data";
  }

  const revogado = consentimento.revogadoEm;
  if (revogado !== null && revogado.getTime() <= agora.getTime()) {
    return "compartilhar.consentimento_revogado";
  }

  return null;
}

/**
 * A porta única: nada sai do perímetro sem passar por aqui.
 *
 * A ordem é precedência, não estilo. Evento e autoria vêm antes de tudo porque
 * responder "esta mídia foi removida" a quem não é o autor já é vazamento —
 * quem não pode compartilhar também não pode aprender o estado de moderação da
 * foto de outra pessoa.
 *
 * A moderação é consultada na superfície `telao`, a mais estrita das duas que
 * existem. Sair do evento é irreversível de um jeito que nem a parede é, então
 * a régua não pode ser mais frouxa que a da parede — e assim a assimetria do
 * classificador sem resposta, que publica na galeria, aqui segura.
 */
export function autorizarCompartilhamento(
  midia: MidiaParaCompartilhar,
  sessao: SessaoQueCompartilha,
  evento: EventoQueCompartilha,
  agora: Date,
): Autorizacao {
  if (midia.eventoId !== sessao.eventoId) return negar("compartilhar.evento_diferente");
  if (midia.sessaoDeOrigem !== sessao.sessaoId) return negar("compartilhar.nao_e_autor");
  if (!evento.compartilhamentoExternoLiberado) {
    return negar("compartilhar.desligado_pelo_anfitriao");
  }

  const pendencia = pendenciaDeConsentimento(sessao, agora);
  if (pendencia !== null) return negar(pendencia);

  const moderacao = decidirExibicao(midia.estado, evento, "telao");
  if (!moderacao.visivel) {
    return negar("compartilhar.bloqueado_pela_moderacao", moderacao.codigo);
  }

  return { pode: true, codigo: "compartilhar.autorizado", motivoDaModeracao: null };
}

export function midiasCompartilhaveis(
  midias: readonly MidiaParaCompartilhar[],
  sessao: SessaoQueCompartilha,
  evento: EventoQueCompartilha,
  agora: Date,
): MidiaParaCompartilhar[] {
  return midias.filter((m) => autorizarCompartilhamento(m, sessao, evento, agora).pode);
}

export const MAX_DA_COLAGEM = 4;

/**
 * A colagem é do próprio convidado, e é tudo ou nada.
 *
 * Uma mídia inelegível derruba a colagem inteira em vez de ser descartada em
 * silêncio: filtrar sozinho entregaria um arquivo diferente do que o convidado
 * viu na tela, e o caminho para montar uma colagem legítima é escolher a partir
 * de `midiasCompartilhaveis`, antes de compor.
 */
export function autorizarColagem(
  midias: readonly MidiaParaCompartilhar[],
  sessao: SessaoQueCompartilha,
  evento: EventoQueCompartilha,
  agora: Date,
): Autorizacao {
  if (midias.length === 0) return negar("compartilhar.colagem_vazia");
  if (midias.length > MAX_DA_COLAGEM) return negar("compartilhar.colagem_grande_demais");

  for (const midia of midias) {
    const autorizacao = autorizarCompartilhamento(midia, sessao, evento, agora);
    if (!autorizacao.pode) return autorizacao;
  }

  return { pode: true, codigo: "compartilhar.autorizado", motivoDaModeracao: null };
}

/* ── a moldura ──────────────────────────────────────────────────────── */

export type Dimensoes = { largura: number; altura: number };

export type Caixa = { x: number; y: number; largura: number; altura: number };

/**
 * Composta em 1080×1920, nunca na resolução original.
 *
 * É o plano do risco declarado na spec: um Android antigo compondo em canvas do
 * tamanho da foto trava no momento em que o convidado apertou compartilhar.
 */
export const LARGURA_DA_COMPOSICAO = 1080;
export const ALTURA_DA_COMPOSICAO = 1920;

/**
 * 🔴 A faixa onde a marca vive, e por isso a foto termina antes dela.
 *
 * Marca d'água sobre a imagem é anti-padrão explícito: estraga a memória e some
 * no primeiro recorte de quem repostar. A assinatura mora na moldura, que é
 * descartável — a foto que o convidado guarda continua limpa.
 */
export const ALTURA_DA_FAIXA = 320;

export const MARGEM = 64;

export const ESPACO_DA_COLAGEM = 16;

/** Abaixo de meio pixel não é recorte, é arredondamento de ponto flutuante. */
const TOLERANCIA_PX = 0.5;

export type ModeloDeMoldura = "polaroide" | "ambiente" | "cheia";

export const MODELOS_DE_MOLDURA: readonly ModeloDeMoldura[] = [
  "polaroide",
  "ambiente",
  "cheia",
];

export function faixaDaMarca(): Caixa {
  return {
    x: 0,
    y: ALTURA_DA_COMPOSICAO - ALTURA_DA_FAIXA,
    largura: LARGURA_DA_COMPOSICAO,
    altura: ALTURA_DA_FAIXA,
  };
}

/** A área que sobra para a foto depois de reservar a faixa da marca. */
export function areaDaFoto(modelo: ModeloDeMoldura): Caixa {
  const teto = ALTURA_DA_COMPOSICAO - ALTURA_DA_FAIXA;

  if (modelo === "polaroide") {
    return {
      x: MARGEM,
      y: MARGEM,
      largura: LARGURA_DA_COMPOSICAO - 2 * MARGEM,
      altura: teto - 2 * MARGEM,
    };
  }

  return { x: 0, y: 0, largura: LARGURA_DA_COMPOSICAO, altura: teto };
}

function dimensoesValidas(d: Dimensoes): boolean {
  return (
    Number.isFinite(d.largura) &&
    Number.isFinite(d.altura) &&
    d.largura > 0 &&
    d.altura > 0
  );
}

function escalar(foto: Dimensoes, area: Caixa, fator: number): Caixa {
  const largura = foto.largura * fator;
  const altura = foto.altura * fator;
  return {
    x: area.x + (area.largura - largura) / 2,
    y: area.y + (area.altura - altura) / 2,
    largura,
    altura,
  };
}

/** Cabe inteira dentro da área, centrada. Não perde um pixel de lado nenhum. */
export function encaixar(foto: Dimensoes, area: Caixa): Caixa {
  return escalar(foto, area, Math.min(area.largura / foto.largura, area.altura / foto.altura));
}

function cobrir(foto: Dimensoes, area: Caixa): Caixa {
  return escalar(foto, area, Math.max(area.largura / foto.largura, area.altura / foto.altura));
}

/** Quanto o modelo cheio pode perder de lado. Topo e base perdem zero, sempre. */
export const MAX_PERDA_LATERAL = 0.15;

/**
 * 🔴 A regra vermelha, na forma que o canvas 9:16 exige.
 *
 * O telão nunca corta na vertical porque encaixar 9:16 em 16:9 descarta o topo
 * e a base — e o topo é onde estão as cabeças. A moldura tem o problema espelhado
 * e um agravante: a faixa da marca já comeu 320px do canvas, então a área da foto
 * não é 9:16. Preencher a área borda a borda é escalar pela altura, e isso só
 * sobra pelos lados quando a foto é, em proporção, **menos alta** que a área —
 * caso contrário a sobra sai por cima e por baixo, que é o que não pode.
 *
 * O teto lateral é a segunda metade da regra: uma foto deitada até cabe pela
 * altura, mas perderia metade da largura, e meia foto na horizontal também é
 * gente cortada — só que pelas beiradas.
 */
export function cobreSemPerderTopo(foto: Dimensoes, area: Dimensoes): boolean {
  if (!dimensoesValidas(foto) || !dimensoesValidas(area)) return false;

  const larguraDesenhada = (foto.largura * area.altura) / foto.altura;
  if (larguraDesenhada < area.largura) return false;

  return (larguraDesenhada - area.largura) / larguraDesenhada <= MAX_PERDA_LATERAL;
}

export function modelosDeMolduraPermitidos(foto: Dimensoes): ModeloDeMoldura[] {
  if (!dimensoesValidas(foto)) return [];
  return MODELOS_DE_MOLDURA.filter(
    (m) => m !== "cheia" || cobreSemPerderTopo(foto, areaDaFoto("cheia")),
  );
}

export function molduraCorta(modelo: ModeloDeMoldura, foto: Dimensoes): boolean {
  return !modelosDeMolduraPermitidos(foto).includes(modelo);
}

/**
 * O modelo que o convidado recebe pronto.
 *
 * Foto que preenche sem perder topo nem base ganha a moldura cheia; foto em pé
 * que não é tão alta quanto o canvas ganha a extensão desfocada da própria
 * imagem; o resto ganha margem. Nenhum dos três corta.
 */
export function modeloRecomendado(foto: Dimensoes): ModeloDeMoldura {
  if (!molduraCorta("cheia", foto)) return "cheia";
  return ehVertical(foto) ? "ambiente" : "polaroide";
}

export function caixaDaFoto(modelo: ModeloDeMoldura, foto: Dimensoes): Caixa {
  const area = areaDaFoto(modelo);
  return modelo === "cheia" ? cobrir(foto, area) : encaixar(foto, area);
}

export type Recorte = { topo: number; base: number; esquerda: number; direita: number };

export function recorte(caixa: Caixa, area: Caixa): Recorte {
  return {
    topo: Math.max(0, area.y - caixa.y),
    base: Math.max(0, caixa.y + caixa.altura - (area.y + area.altura)),
    esquerda: Math.max(0, area.x - caixa.x),
    direita: Math.max(0, caixa.x + caixa.largura - (area.x + area.largura)),
  };
}

function intersecta(a: Caixa, b: Caixa): boolean {
  return (
    a.x < b.x + b.largura - TOLERANCIA_PX &&
    b.x < a.x + a.largura - TOLERANCIA_PX &&
    a.y < b.y + b.altura - TOLERANCIA_PX &&
    b.y < a.y + a.altura - TOLERANCIA_PX
  );
}

/* ── o que sai junto da imagem ──────────────────────────────────────── */

/**
 * O que a moldura escreve, resolvido pelos `identity_tokens` do evento.
 *
 * Monograma, título e data saem do resolvedor e nunca de constante: a moldura é
 * o quinto renderizador dos mesmos tokens, ao lado de web, telão, PDF e preset.
 */
export type IdentidadeDoEvento = {
  monograma: string;
  titulo: string;
  data: string;
  /** Entra na assinatura da marca, na faixa. Não é dado de pessoa. */
  slug: string;
};

/**
 * O texto que atravessa o perímetro — e nada mais existe.
 *
 * O tipo é a defesa: não há campo capaz de carregar nome, contagem, reação ou
 * comentário de outra pessoa, então nenhuma chamada consegue vazar PII de
 * terceiro por descuido de quem monta o objeto.
 */
export type ConteudoDaMoldura = {
  monograma: string;
  titulo: string;
  data: string;
  slug: string;
  /** Texto do próprio autor. */
  legenda: string | null;
  /** Primeiro nome de quem tirou, só com consentimento que o cubra. */
  credito: string | null;
};

export function conteudoDaMoldura(
  identidade: IdentidadeDoEvento,
  midia: MidiaParaCompartilhar,
  sessao: SessaoQueCompartilha,
  agora: Date,
): ConteudoDaMoldura {
  const consentimento = sessao.consentimentoExterno;

  // A checagem de autoria se repete aqui de propósito. `compor` já a fez, mas
  // esta função é exportada e um dia será chamada de outro lugar — e o defeito
  // que ela impede é creditar o nome de quem está compartilhando numa imagem
  // que outra pessoa capturou.
  const podeCreditar =
    midia.sessaoDeOrigem === sessao.sessaoId &&
    consentimento !== null &&
    consentimento.nomeNaMoldura &&
    pendenciaDeConsentimento(sessao, agora) === null;

  return {
    monograma: identidade.monograma,
    titulo: identidade.titulo,
    data: identidade.data,
    slug: identidade.slug,
    legenda: midia.legenda,
    credito: podeCreditar ? sessao.nome : null,
  };
}

/* ── a composição ───────────────────────────────────────────────────── */

export type Composicao = {
  largura: number;
  altura: number;
  modelo: ModeloDeMoldura;
  area: Caixa;
  foto: Caixa;
  faixa: Caixa;
  conteudo: ConteudoDaMoldura;
};

export type EntradaDaComposicao = {
  midia: MidiaParaCompartilhar;
  sessao: SessaoQueCompartilha;
  evento: EventoQueCompartilha;
  identidade: IdentidadeDoEvento;
  modelo: ModeloDeMoldura;
  agora: Date;
};

export type ResultadoDaComposicao =
  | { autorizada: true; codigo: "compartilhar.autorizado"; composicao: Composicao }
  | {
      autorizada: false;
      codigo: CodigoDeCompartilhamento;
      motivoDaModeracao: CodigoDeModeracao | null;
      composicao: null;
    };

/**
 * A única forma de obter uma composição.
 *
 * O tipo de retorno é discriminado para que não exista caminho em que o
 * chamador ignore a recusa e desenhe assim mesmo: quando `autorizada` é falso
 * não há objeto para desenhar.
 */
export function compor(entrada: EntradaDaComposicao): ResultadoDaComposicao {
  const { midia, sessao, evento, identidade, modelo, agora } = entrada;

  const autorizacao = autorizarCompartilhamento(midia, sessao, evento, agora);
  if (!autorizacao.pode) {
    return {
      autorizada: false,
      codigo: autorizacao.codigo,
      motivoDaModeracao: autorizacao.motivoDaModeracao,
      composicao: null,
    };
  }

  if (molduraCorta(modelo, midia)) {
    return {
      autorizada: false,
      codigo: "compartilhar.modelo_corta_a_foto",
      motivoDaModeracao: null,
      composicao: null,
    };
  }

  return {
    autorizada: true,
    codigo: "compartilhar.autorizado",
    composicao: {
      largura: LARGURA_DA_COMPOSICAO,
      altura: ALTURA_DA_COMPOSICAO,
      modelo,
      area: areaDaFoto(modelo),
      foto: caixaDaFoto(modelo, midia),
      faixa: faixaDaMarca(),
      conteudo: conteudoDaMoldura(identidade, midia, sessao, agora),
    },
  };
}

export type ProblemaDaComposicao =
  | "recorte.topo"
  | "recorte.base"
  | "recorte.lateral"
  | "marca.sobre_a_foto";

/**
 * O que uma composição não pode ter, verificado depois de montada.
 *
 * Recorte lateral é tolerado só no modelo cheio, que existe para preencher a
 * borda; topo e base nunca, em modelo nenhum.
 */
export function problemasDaComposicao(composicao: Composicao): ProblemaDaComposicao[] {
  const problemas: ProblemaDaComposicao[] = [];
  const perdido = recorte(composicao.foto, composicao.area);

  if (perdido.topo > TOLERANCIA_PX) problemas.push("recorte.topo");
  if (perdido.base > TOLERANCIA_PX) problemas.push("recorte.base");

  if (
    composicao.modelo !== "cheia" &&
    (perdido.esquerda > TOLERANCIA_PX || perdido.direita > TOLERANCIA_PX)
  ) {
    problemas.push("recorte.lateral");
  }

  if (intersecta(composicao.foto, composicao.faixa)) problemas.push("marca.sobre_a_foto");

  return problemas;
}

/**
 * As células da colagem, sempre acima da faixa da marca.
 *
 * Cada foto é encaixada na própria célula pelo chamador, e encaixar não corta —
 * é o que mantém a regra vermelha valendo também no segundo formato.
 */
export function celulasDaColagem(quantidade: number): Caixa[] {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_DA_COLAGEM) {
    return [];
  }

  const area = areaDaFoto("ambiente");
  const colunas = quantidade === 4 ? 2 : 1;
  const linhas = Math.ceil(quantidade / colunas);
  const largura = (area.largura - ESPACO_DA_COLAGEM * (colunas - 1)) / colunas;
  const altura = (area.altura - ESPACO_DA_COLAGEM * (linhas - 1)) / linhas;

  const celulas: Caixa[] = [];
  for (let i = 0; i < quantidade; i += 1) {
    celulas.push({
      x: area.x + (i % colunas) * (largura + ESPACO_DA_COLAGEM),
      y: area.y + Math.floor(i / colunas) * (altura + ESPACO_DA_COLAGEM),
      largura,
      altura,
    });
  }

  return celulas;
}
