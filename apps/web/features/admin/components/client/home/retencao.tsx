import Link from "next/link";
import { diasRestantesAteD365 } from "@albora/core";
import { acaoPrimaria, estiloAcento } from "./estilos";

const DIA_MS = 24 * 60 * 60 * 1000;

/** A partir daqui o prazo deixa de ser informação de rodapé e vira aviso. */
const DIAS_DE_AVISO = 35;

export type EstadoDaRetencao = {
  d365: Date;
  dias: number;
  /** `true` = o prazo virou aviso; `false` = linha discreta de rodapé. */
  urgente: boolean;
};

/** Separado do JSX para o limiar do aviso ser testável sem renderizar a Home. */
export function estadoDaRetencao(terminaEm: Date, agora = new Date()): EstadoDaRetencao {
  const d365 = new Date(terminaEm.getTime() + 365 * DIA_MS);
  const dias = diasRestantesAteD365(d365, agora);
  return { d365, dias, urgente: dias <= DIAS_DE_AVISO };
}

function fmt(d: Date, fuso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: fuso,
    }).format(d);
  } catch {
    return "";
  }
}

/**
 * O prazo de retenção é promessa de contrato, e promessa que o casal só
 * descobre no e-mail do dia 358 é promessa quebrada. A data sai de cálculo
 * sobre o fim do evento — nenhuma consulta a mais no painel.
 */
export function AvisoDeRetencao({
  base,
  terminaEm,
  fuso,
}: {
  base: string;
  terminaEm: Date;
  fuso: string;
}) {
  const { d365, dias, urgente } = estadoDaRetencao(terminaEm);
  const data = fmt(d365, fuso);

  if (!urgente) {
    return (
      <p className="tipo-caption m-0 text-ink-3">
        Suas fotos ficam guardadas aqui até {data}.
      </p>
    );
  }

  return (
    <section className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
      <h2 className="tipo-subtitle m-0 text-ink">
        {dias === 0
          ? "Suas fotos saem do Álbora hoje"
          : dias === 1
            ? "Suas fotos saem do Álbora amanhã"
            : `Suas fotos saem do Álbora em ${dias} dias`}
      </h2>
      <p className="tipo-body m-0 mt-2 max-w-[48ch] text-ink-2">
        Em {data} o álbum é apagado dos nossos servidores. Baixe o ZIP ou mande para a sua nuvem
        antes — depois não tem como voltar atrás.
      </p>
      <Link href={`${base}/album`} className={`${acaoPrimaria} mt-4`} style={estiloAcento}>
        Baixar ou enviar para a nuvem
      </Link>
    </section>
  );
}
