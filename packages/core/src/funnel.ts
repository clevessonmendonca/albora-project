/** Nenhuma função deste módulo recebe nome, telefone ou e-mail — painel precisa de contagem, não de PII. */

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

const VIAS = ["qr", "wa", "link", "code"] as const;

export type ViaDeEntrada = (typeof VIAS)[number];

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

/** Sem esta porta, valor desconhecido entra no banco e o painel passa a mentir para menos. */
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

/** `page_open` não exige `qr_scan` — WhatsApp e link também entram; reprovar descartaria participação real. */
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

/** Um por sessão — a espinha central repete a cada foto, estes não. */
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

/** Captura sem consentimento tem código próprio — não é desordem de instrumentação. */
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

/** Mais avançada, não última registrada — retry não faz a sessão andar para trás. */
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

/** Conta pela etapa mais avançada, não pela presença do evento — `consent` perdido na rede não infla `capture`. */
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

/** Perda absoluta, não relativa — 60 de 120 é onde mexer mesmo que outro degrau perca 2 de 3. */
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
  expectedGuests: number;
  /** Sessões distintas com pelo menos um `upload_ok`. */
  sessoesComUpload: number;
};

/** Lança sem denominador — `expected_guests` vazio como 0% vira "parar" por formulário em branco. */
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

export const PISO_DA_TESE = 0.4;
export const PISO_DA_FRICCAO = 0.25;

export type CodigoDaTese = "funil.tese_validada" | "funil.mexe_em_friccao" | "funil.parar";

export type Veredito = {
  taxa: number;
  codigo: CodigoDaTese;
};

/** Recebe contagem, não taxa — quem passa `40` querendo dizer 40% não consegue. */
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

/** Sempre as duas — instalação subindo com participação caindo é prejuízo, não ganho. */
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

/** 1 pp = 1 pessoa em 120 — sem margem, ruído de arredondamento vira veredito de prejuízo. */
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

/** Sem arredondamento, `0.44 − 0.45` dá `−0.010000000000000009` — erro de binário cai fora da margem. */
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
