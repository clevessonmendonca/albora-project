import { diasRestantesAteD365 } from "@albora/core";

const DIA_MS = 24 * 60 * 60 * 1000;

/** A partir daqui o prazo deixa de ser informação de rodapé e vira aviso. */
export const DIAS_DE_AVISO = 35;

export type MarcoCru = {
  kind: string;
  status: string;
  dueAt: string;
  completedAt: string | null;
};

export type NoDaLinha = {
  chave: "agora" | "d330_drive" | "d358_warn" | "d365_delete";
  titulo: string;
  detalhe: string;
  em: Date | null;
  /** `feito` = já aconteceu; `agora` = é o ponto em que o evento está. */
  estado: "feito" | "agora" | "futuro";
  critico: boolean;
};

export type LinhaDeRetencao = {
  nos: NoDaLinha[];
  d365: Date;
  diasAteApagar: number;
  urgente: boolean;
};

const TITULOS: Record<string, { titulo: string; detalhe: string }> = {
  d330_drive: {
    titulo: "Cópia para a nuvem de vocês",
    detalhe: "Mandamos o acervo para o Drive conectado, se houver um.",
  },
  d358_warn: {
    titulo: "Último aviso para baixar",
    detalhe: "Avisamos por e-mail que falta uma semana.",
  },
  d365_delete: {
    titulo: "Exclusão definitiva",
    detalhe: "O álbum sai dos nossos servidores. Não tem como voltar atrás.",
  },
};

/** `plus_48h` é operação interna; não diz nada ao casal e não entra na linha. */
const NA_LINHA = ["d330_drive", "d358_warn", "d365_delete"];

/**
 * A linha do tempo da retenção. Os marcos vêm dos jobs reais quando existem —
 * "já mandamos para a sua nuvem" é diferente de "vamos mandar" —, e caem para
 * a data calculada sobre o fim do evento quando o job ainda não foi agendado.
 */
export function linhaDeRetencao(
  terminaEm: Date,
  marcos: MarcoCru[],
  agora = new Date(),
): LinhaDeRetencao {
  const porKind = new Map(marcos.map((m) => [m.kind, m]));

  const previsto = (kind: string, dias: number): Date =>
    new Date((porKind.get(kind)?.dueAt ?? "") || terminaEm.getTime() + dias * DIA_MS);

  const nos: NoDaLinha[] = [
    {
      chave: "agora",
      titulo: "Guardado com a gente",
      detalhe: "As fotos estão no ar e são de vocês. Baixe quando quiser.",
      em: null,
      estado: "agora",
      critico: false,
    },
  ];

  const dias: Record<string, number> = { d330_drive: 330, d358_warn: 358, d365_delete: 365 };

  for (const kind of NA_LINHA) {
    const job = porKind.get(kind);
    const em = previsto(kind, dias[kind] ?? 365);
    const feito = job?.status === "done" || job?.status === "skipped";
    const texto = TITULOS[kind];
    if (!texto) continue;

    nos.push({
      chave: kind as NoDaLinha["chave"],
      titulo: texto.titulo,
      detalhe: feito && job?.completedAt ? "Já aconteceu." : texto.detalhe,
      em,
      estado: feito ? "feito" : "futuro",
      critico: kind === "d365_delete",
    });
  }

  const d365 = previsto("d365_delete", 365);
  const diasAteApagar = diasRestantesAteD365(d365, agora);

  return { nos, d365, diasAteApagar, urgente: diasAteApagar <= DIAS_DE_AVISO };
}
