/**
 * O funil do convidado e os números que decidem o MVP (spec 012).
 *
 * É o último portão antes do casamento real. Se a festa acaba e o painel não
 * diz **onde** a participação se perdeu, o MVP inteiro terá sido em vão — por
 * isso a decisão de validar, mexer em fricção ou parar mora aqui, pura e
 * testada, e não numa planilha montada depois com apego emocional envolvido.
 *
 * Nenhuma função deste módulo recebe nome, telefone ou e-mail. O painel
 * precisa de contagem, e o que não entra não vaza.
 */

const EVENTOS = [
  "qr_scan",
  "page_open",
  "consent",
  "capture",
  "upload_start",
  "upload_ok",
  "upload_fail",
  "retry",
  "share",
  "install_prompt",
  "install_accept",
  "install_dismiss",
  "feed_open",
] as const;

export type EventoDoFunil = (typeof EVENTOS)[number];

/** O tipo sai desta lista, e não o contrário: conjunto e união não podem divergir. */
export const EVENTOS_DO_FUNIL: readonly EventoDoFunil[] = EVENTOS;

const VIAS = ["qr", "wa", "link"] as const;

export type ViaDeEntrada = (typeof VIAS)[number];

/** Canal pelo qual o convidado abriu `/e/[slug]`. Conjunto fechado, como os eventos. */
export const VIAS_DE_ENTRADA: readonly ViaDeEntrada[] = VIAS;

export function ehViaDeEntrada(valor: string): valor is ViaDeEntrada {
  return (VIAS_DE_ENTRADA as readonly string[]).includes(valor);
}

/** Query ou corpo desconhecido vira `link`: não fingimos que escaneou papel. */
export function parseViaDeEntrada(valor: unknown): ViaDeEntrada {
  return typeof valor === "string" && ehViaDeEntrada(valor) ? valor : "link";
}

/** `qr_scan` só existe para peça impressa. WhatsApp e link copiado abrem a página. */
export function eventosDeEntrada(via: ViaDeEntrada): readonly EventoDoFunil[] {
  return via === "qr" ? ["qr_scan", "page_open", "consent"] : ["page_open", "consent"];
}

/**
 * Validação de conjunto fechado para o que chega da rede.
 *
 * `kind` vem do cliente. Sem esta porta, um valor novo entra no banco, não cai
 * em nenhum degrau e o painel passa a mentir para menos sem ninguém perceber.
 */
export function ehEventoDoFunil(valor: string): valor is EventoDoFunil {
  return (EVENTOS_DO_FUNIL as readonly string[]).includes(valor);
}

const ESPINHA = [
  "qr_scan",
  "page_open",
  "consent",
  "capture",
  "upload_start",
  "upload_ok",
] as const;

export type EtapaDaEspinha = (typeof ESPINHA)[number];

export const ESPINHA_DO_FUNIL: readonly EtapaDaEspinha[] = ESPINHA;

/**
 * O que precisa ter acontecido antes de cada evento.
 *
 * `page_open` não exige `qr_scan`: a entrada também acontece por link no
 * WhatsApp, e reprovar essas sessões descartaria participação real.
 * `install_prompt` não exige nada porque o CTA de entrada é uma das variantes
 * medidas nos três primeiros casamentos.
 */
export const PRE_REQUISITOS: Readonly<Record<EventoDoFunil, readonly EventoDoFunil[]>> = {
  qr_scan: [],
  page_open: [],
  consent: ["page_open"],
  capture: ["consent"],
  upload_start: ["capture"],
  upload_ok: ["upload_start"],
  upload_fail: ["upload_start"],
  retry: ["upload_fail"],
  share: ["upload_ok"],
  install_prompt: [],
  install_accept: ["install_prompt"],
  install_dismiss: ["install_prompt"],
  feed_open: [],
};

/**
 * Eventos que um refresh ou um toque duplo não pode contar de novo.
 *
 * A espinha do meio — captura e envio — se repete a cada foto. QR, entrada,
 * consentimento e a primeira abertura do feed não: são um por sessão.
 */
const UNICOS: ReadonlySet<EventoDoFunil> = new Set([
  "qr_scan",
  "page_open",
  "consent",
  "feed_open",
  "install_prompt",
  "install_accept",
  "install_dismiss",
]);

export function ehEventoUnicoDoFunil(evento: EventoDoFunil): boolean {
  return UNICOS.has(evento);
}

export type CodigoDeSequencia =
  | "funil.ordem_ok"
  | "funil.captura_sem_consentimento"
  | "funil.pre_requisito_ausente";

export type Sequencia =
  | { valida: true; codigo: "funil.ordem_ok" }
  | {
      valida: false;
      codigo: "funil.captura_sem_consentimento" | "funil.pre_requisito_ausente";
      posicao: number;
      evento: EventoDoFunil;
      faltando: EventoDoFunil[];
    };

/**
 * Se a sequência de uma sessão é possível, e onde ela quebrou.
 *
 * Repetição é normal e não invalida nada — uma sessão manda várias fotos, e
 * cada uma tem seu `capture`, `upload_start` e eventuais `upload_fail`/`retry`.
 * Captura sem consentimento tem código próprio porque não é desordem de
 * instrumentação: é captura antes do consentimento versionado e datado.
 */
export function validarSequencia(eventos: readonly EventoDoFunil[]): Sequencia {
  const vistos = new Set<EventoDoFunil>();

  for (const [posicao, evento] of eventos.entries()) {
    const faltando = PRE_REQUISITOS[evento].filter((pre) => !vistos.has(pre));

    if (faltando.length > 0) {
      return {
        valida: false,
        codigo:
          evento === "capture"
            ? "funil.captura_sem_consentimento"
            : "funil.pre_requisito_ausente",
        posicao,
        evento,
        faltando: [...faltando],
      };
    }

    vistos.add(evento);
  }

  return { valida: true, codigo: "funil.ordem_ok" };
}

function indiceDaEtapa(etapa: EtapaDaEspinha): number {
  return (ESPINHA_DO_FUNIL as readonly EventoDoFunil[]).indexOf(etapa);
}

/**
 * A etapa mais avançada que a sessão alcançou, ou `null` se nenhuma.
 *
 * "Mais avançada", e não "última registrada": o evento que chega depois de um
 * retry não faz a sessão andar para trás.
 */
export function ondeParou(eventos: readonly EventoDoFunil[]): EtapaDaEspinha | null {
  let maior = -1;

  for (const evento of eventos) {
    const indice = (ESPINHA_DO_FUNIL as readonly EventoDoFunil[]).indexOf(evento);
    if (indice > maior) maior = indice;
  }

  return ESPINHA_DO_FUNIL[maior] ?? null;
}

export type DegrauDoFunil = {
  etapa: EtapaDaEspinha;
  sessoes: number;
  /** Fração que sobreviveu do degrau anterior. `null` no primeiro e quando o anterior é zero. */
  retencao: number | null;
};

/**
 * Quantas sessões chegaram a cada etapa da espinha.
 *
 * Conta pela etapa mais avançada alcançada, não pela presença do evento: um
 * `consent` perdido na rede não pode fazer `capture` parecer maior que
 * `consent`. Retenção acima de 100% é sempre defeito de instrumentação, e um
 * painel que a mostra faz o casal decidir sobre um número inventado.
 */
export function degraus(sessoes: readonly (readonly EventoDoFunil[])[]): DegrauDoFunil[] {
  const alcancadas = sessoes
    .map(ondeParou)
    .filter((etapa): etapa is EtapaDaEspinha => etapa !== null)
    .map(indiceDaEtapa);

  const resultado: DegrauDoFunil[] = [];
  let anterior: number | null = null;

  ESPINHA_DO_FUNIL.forEach((etapa, i) => {
    const contagem = alcancadas.filter((indice) => indice >= i).length;

    resultado.push({
      etapa,
      sessoes: contagem,
      retencao: anterior === null || anterior === 0 ? null : contagem / anterior,
    });

    anterior = contagem;
  });

  return resultado;
}

export type Perda = {
  de: EtapaDaEspinha;
  para: EtapaDaEspinha;
  sessoesPerdidas: number;
  retencao: number;
};

/**
 * O degrau onde mais gente se perdeu, ou `null` quando não houve queda.
 *
 * Perda absoluta, não relativa: perder 60 de 120 é onde mexer, mesmo que outro
 * degrau tenha retenção pior perdendo 2 de 3.
 */
export function maiorPerda(passos: readonly DegrauDoFunil[]): Perda | null {
  let pior: Perda | null = null;

  for (let i = 1; i < passos.length; i += 1) {
    const antes = passos[i - 1];
    const depois = passos[i];
    if (!antes || !depois) continue;

    const perdidas = antes.sessoes - depois.sessoes;
    if (perdidas <= 0) continue;

    if (pior === null || perdidas > pior.sessoesPerdidas) {
      pior = {
        de: antes.etapa,
        para: depois.etapa,
        sessoesPerdidas: perdidas,
        retencao: depois.sessoes / antes.sessoes,
      };
    }
  }

  return pior;
}

export type CodigoDeMetrica = "funil.denominador_ausente" | "funil.numerador_invalido";

export class MetricaInvalida extends Error {
  readonly codigo: CodigoDeMetrica;

  constructor(codigo: CodigoDeMetrica) {
    super(codigo);
    this.name = "MetricaInvalida";
    this.codigo = codigo;
  }
}

export type ContagemDoEvento = {
  /** Vem do admin. É o denominador que decide o negócio. */
  expectedGuests: number;
  /** Sessões distintas com pelo menos um `upload_ok`. */
  sessoesComUpload: number;
};

/**
 * A métrica principal: `sessoes_com_upload / expected_guests`.
 *
 * Lança quando não há denominador em vez de devolver zero. `expected_guests`
 * não preenchido é campo faltando no admin; devolvido como 0% ele vira "tese
 * errada, parar" — a decisão mais cara do projeto tomada por um formulário em
 * branco.
 */
export function taxaDeParticipacao(contagem: ContagemDoEvento): number {
  const { expectedGuests, sessoesComUpload } = contagem;

  if (!Number.isFinite(expectedGuests) || expectedGuests <= 0) {
    throw new MetricaInvalida("funil.denominador_ausente");
  }

  if (!Number.isFinite(sessoesComUpload) || sessoesComUpload < 0) {
    throw new MetricaInvalida("funil.numerador_invalido");
  }

  return sessoesComUpload / expectedGuests;
}

/** Escritos antes de olhar o resultado, e é para isso que servem. */
export const PISO_DA_TESE = 0.4;
export const PISO_DA_FRICCAO = 0.25;

export type CodigoDaTese = "funil.tese_validada" | "funil.mexe_em_friccao" | "funil.parar";

export type Veredito = {
  taxa: number;
  codigo: CodigoDaTese;
};

/**
 * A definição de pronto: ≥40% valida · 25–40% mexe em fricção · <25% para.
 *
 * Recebe a contagem e não a taxa pronta, de propósito: quem passa `40` querendo
 * dizer 40% não consegue, e a fronteira de 25% não vira "validada" por causa de
 * unidade trocada. Devolve a taxa junto do código para que a decisão fique
 * registrada com o número que a produziu.
 */
export function decidirTese(contagem: ContagemDoEvento): Veredito {
  const taxa = taxaDeParticipacao(contagem);

  if (taxa >= PISO_DA_TESE) return { taxa, codigo: "funil.tese_validada" };
  if (taxa >= PISO_DA_FRICCAO) return { taxa, codigo: "funil.mexe_em_friccao" };

  return { taxa, codigo: "funil.parar" };
}

export type ContagemDePlataforma = ContagemDoEvento & {
  /** Sessões distintas com `install_accept`. */
  sessoesComInstalacao: number;
};

export type LeituraDePlataforma = {
  participacao: number;
  instalacao: number;
};

/**
 * As duas taxas, sempre juntas.
 *
 * Não existe função neste módulo que devolva instalação sozinha, e a ausência é
 * a regra: instalação subindo com participação caindo é prejuízo, e quem lê só
 * metade comemora exatamente esse caso.
 */
export function lerPlataforma(contagem: ContagemDePlataforma): LeituraDePlataforma {
  const participacao = taxaDeParticipacao(contagem);

  if (!Number.isFinite(contagem.sessoesComInstalacao) || contagem.sessoesComInstalacao < 0) {
    throw new MetricaInvalida("funil.numerador_invalido");
  }

  return {
    participacao,
    instalacao: contagem.sessoesComInstalacao / contagem.expectedGuests,
  };
}

/**
 * Variação abaixo da qual nada aconteceu.
 *
 * Um ponto percentual é uma pessoa em cento e vinte. Sem esta faixa, ruído de
 * arredondamento entre dois eventos vira veredito de prejuízo.
 */
export const MARGEM_DE_RUIDO = 0.01;

export type CodigoDePlataforma =
  | "funil.plataforma_prejuizo"
  | "funil.plataforma_ganho"
  | "funil.plataforma_regressao"
  | "funil.plataforma_estavel";

export type ComparacaoDePlataforma = {
  anterior: LeituraDePlataforma;
  atual: LeituraDePlataforma;
  codigo: CodigoDePlataforma;
};

/**
 * A variação entre duas taxas, arredondada a 0,01 ponto percentual.
 *
 * Sem o arredondamento, `0,44 − 0,45` dá `−0,010000000000000009` e uma
 * diferença de exatamente uma pessoa cai fora da margem por erro de binário.
 */
function variacao(antes: number, depois: number): number {
  return Math.round((depois - antes) * 1e4) / 1e4;
}

/** Compara dois eventos — ou duas variantes de CTA — pelas duas taxas ao mesmo tempo. */
export function compararPlataforma(
  anterior: ContagemDePlataforma,
  atual: ContagemDePlataforma,
): ComparacaoDePlataforma {
  const antes = lerPlataforma(anterior);
  const depois = lerPlataforma(atual);

  const participacaoCaiu = variacao(antes.participacao, depois.participacao) < -MARGEM_DE_RUIDO;
  const instalacaoSubiu = variacao(antes.instalacao, depois.instalacao) > MARGEM_DE_RUIDO;

  const codigo: CodigoDePlataforma =
    participacaoCaiu && instalacaoSubiu
      ? "funil.plataforma_prejuizo"
      : participacaoCaiu
        ? "funil.plataforma_regressao"
        : instalacaoSubiu
          ? "funil.plataforma_ganho"
          : "funil.plataforma_estavel";

  return { anterior: antes, atual: depois, codigo };
}
